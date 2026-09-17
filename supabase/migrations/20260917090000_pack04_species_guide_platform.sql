begin;

create temporary table pack04_preservation_baseline on commit drop as
select
  (select md5(string_agg((to_jsonb(g)-'updated_at')::text, '' order by id)) from public.pet_care_guides g) as guide_digest,
  (select md5(string_agg(to_jsonb(p)::text, '' order by id)) from public.pets p) as pet_digest,
  (select count(*) from public.pet_care_guides) as guide_count;

-- Preserve legacy compatibility groups and existing rows; canonical keys are additive.
alter table public.pets add column if not exists species_key text;
alter table public.pets add constraint pets_canonical_species_key_check check (
  species_key is null or (
    species_key in ('DOG', 'CAT', 'RABBIT', 'HAMSTER', 'GUINEA_PIG', 'FERRET', 'BIRD', 'FISH', 'REPTILE', 'OTHER')
    and case species_key when 'DOG' then species_group = 'dog' when 'CAT' then species_group = 'cat'
      else coalesce(species_group, 'other') = 'other' end
  )
);

alter table public.pet_care_guides
  add column if not exists species_keys text[] not null default '{COMMON}'::text[],
  add column if not exists content_blocks jsonb not null default '[]'::jsonb,
  add column if not exists source_references jsonb not null default '[]'::jsonb;

update public.pet_care_guides
set species_keys = (
  select array_agg(distinct mapped.key order by mapped.key)
  from unnest(target_species) as legacy(value)
  cross join lateral (
    select case legacy.value
      when 'dog' then 'DOG'
      when 'cat' then 'CAT'
      when 'common' then 'COMMON'
      else 'OTHER'
    end as key
  ) mapped
)
where species_keys = '{COMMON}'::text[]
  and target_species <> '{common}'::text[];

update public.pet_care_guides
set content_blocks = jsonb_build_array(
  jsonb_build_object(
    'id', 'legacy-body',
    'role', 'normal',
    'title', null,
    'body', body
  )
)
where content_blocks = '[]'::jsonb;

alter table public.pet_care_guides
  add constraint pet_care_guides_species_keys_check
    check (
      cardinality(species_keys) > 0
      and species_keys <@ array[
        'DOG', 'CAT', 'RABBIT', 'HAMSTER', 'GUINEA_PIG',
        'FERRET', 'BIRD', 'FISH', 'REPTILE', 'OTHER', 'COMMON'
      ]::text[]
    ),
  add constraint pet_care_guides_content_blocks_array_check
    check (jsonb_typeof(content_blocks) = 'array'),
  add constraint pet_care_guides_source_references_array_check
    check (jsonb_typeof(source_references) = 'array');

create index if not exists idx_pet_care_guides_species_keys_gin
  on public.pet_care_guides using gin (species_keys);

with species_profiles as (
  select *
  from (values
    (
      'DOG', '강아지', 'dog',
      array['강아지','반려견','dog']::text[],
      '산책과 휴식이 균형을 이루는 안전한 생활 공간',
      '연령과 활동량에 맞춘 완전균형식과 일정한 급여량',
      '매일의 산책, 냄새 탐색, 보호자와의 상호작용',
      '식욕·음수·배변·호흡·보행의 평소 패턴',
      '반복되는 구토·설사, 기침, 절뚝거림, 급격한 행동 변화',
      '호흡 곤란, 의식 저하, 경련, 심한 출혈은 즉시 동물병원에 연락해야 합니다.',
      'https://www.merckvetmanual.com/dog-owners/routine-care-of-dogs/routine-health-care-of-dogs',
      'Routine Health Care of Dogs'
    ),
    (
      'CAT', '고양이', 'cat',
      array['고양이','반려묘','cat']::text[],
      '숨을 곳과 높은 곳, 깨끗한 화장실을 분리한 안정적인 실내 환경',
      '생애 단계에 맞춘 완전균형식과 신선한 물 접근성',
      '짧은 사냥놀이와 스스로 쉴 수 있는 예측 가능한 생활',
      '식욕·음수·배뇨·배변·그루밍·숨는 시간의 평소 패턴',
      '식욕 저하, 배뇨 곤란, 호흡 변화, 지속적인 숨기',
      '입을 벌리고 숨 쉬거나 소변을 전혀 보지 못하면 즉시 동물병원에 연락해야 합니다.',
      'https://www.merckvetmanual.com/cat-owners/caring-for-cats/routine-health-care-of-cats',
      'Routine Health Care of Cats'
    ),
    (
      'RABBIT', '토끼', 'other',
      array['토끼','rabbit','bunny']::text[],
      '미끄럽지 않은 바닥, 은신처, 충분히 몸을 펴고 뛸 수 있는 공간',
      '건초를 중심으로 한 섬유질 식단과 신선한 물',
      '매일 안전한 운동 시간과 씹기·탐색 활동',
      '먹는 양·분변 크기와 양·활동량·치아와 턱 주변 상태',
      '식욕 감소, 분변 감소, 침 흘림, 배가 부풀거나 웅크린 자세',
      '먹지 않거나 분변이 급격히 줄고 무기력하면 지체하지 말고 토끼 진료가 가능한 병원에 연락해야 합니다.',
      'https://www.merckvetmanual.com/all-other-pets/rabbits/routine-health-care-of-rabbits',
      'Routine Health Care of Rabbits'
    ),
    (
      'HAMSTER', '햄스터', 'other',
      array['햄스터','hamster']::text[],
      '탈출을 막고 깊은 바닥재와 은신처, 적절한 크기의 쳇바퀴를 갖춘 환경',
      '햄스터용 균형 사료를 중심으로 한 소량 급여와 깨끗한 물',
      '야간 활동 리듬을 방해하지 않는 굴파기·탐색 활동',
      '저장 먹이·음수·분변·호흡·눈과 코·털 상태',
      '설사, 젖은 꼬리 주변, 호흡음, 눈·코 분비물, 갑작스러운 무기력',
      '설사와 무기력이 함께 나타나거나 호흡이 힘들어 보이면 즉시 소동물 진료 병원에 연락해야 합니다.',
      'https://www.merckvetmanual.com/all-other-pets/hamsters/routine-health-care-of-hamsters',
      'Routine Health Care of Hamsters'
    ),
    (
      'GUINEA_PIG', '기니피그', 'other',
      array['기니피그','guinea pig']::text[],
      '발바닥에 부담이 적은 바닥과 은신처, 무리 생활을 고려한 넓은 공간',
      '건초와 기니피그용 사료, 신선한 채소를 통한 충분한 비타민 C',
      '바닥에서 걷고 숨고 탐색하는 저충격 활동',
      '매주 체중·식욕·분변·치아·발바닥·호흡 상태',
      '체중 감소, 먹기 어려움, 침 흘림, 호흡음, 발바닥 상처',
      '먹지 않거나 호흡 곤란·급격한 체중 감소가 보이면 즉시 진료를 받아야 합니다.',
      'https://www.merckvetmanual.com/all-other-pets/guinea-pigs/routine-care-of-guinea-pigs',
      'Routine Care of Guinea Pigs'
    ),
    (
      'FERRET', '페럿', 'other',
      array['페럿','ferret']::text[],
      '틈새와 삼킬 물건을 차단하고 잠자리와 놀이 구역을 분리한 환경',
      '페럿에 맞는 동물성 단백질 중심의 균형 식단과 신선한 물',
      '매일 감독 아래 탐색·터널·놀이 시간을 제공하는 활동',
      '식욕·분변·활동량·보행·복부 팽만·털 상태',
      '반복 구토, 검은 변, 심한 무기력, 뒷다리 약화, 배가 붓는 변화',
      '쓰러짐, 반복 구토, 호흡 곤란이나 이물 섭취가 의심되면 즉시 병원에 연락해야 합니다.',
      'https://www.merckvetmanual.com/all-other-pets/ferrets/routine-health-care-for-ferrets',
      'Routine Health Care for Ferrets'
    ),
    (
      'BIRD', '조류', 'other',
      array['조류','새','앵무새','bird']::text[],
      '횃대 굵기와 위치가 다양하고 연기·향·과열 조리기구에서 떨어진 안전한 환경',
      '종에 맞는 균형 식단과 매일 교체한 물, 편식 여부 점검',
      '비행·등반·포레이징과 충분한 수면을 보장하는 일과',
      '매일 체중·먹이 섭취·배설물·깃털·호흡·울음의 변화',
      '꼬리 들썩임, 입 벌림 호흡, 케이지 바닥에 머묾, 먹지 않음',
      '호흡이 힘들거나 케이지 바닥에 웅크리고 반응이 줄면 즉시 조류 진료 병원에 연락해야 합니다.',
      'https://www.merckvetmanual.com/bird-owners/routine-care-and-safety-of-birds/illness-in-pet-birds',
      'Illness in Pet Birds'
    ),
    (
      'FISH', '어류', 'other',
      array['어류','물고기','관상어','fish']::text[],
      '종과 개체 수에 맞는 수조 크기, 여과, 은신처, 안정된 수온과 수질',
      '종별 먹이에 맞춘 소량 급여와 남은 먹이 제거',
      '과밀을 피하고 정상 유영과 휴식이 가능한 수조 환경',
      '수온·수질·호흡 속도·유영·체색·먹이 반응',
      '수면에서 헐떡임, 몸 비빔, 지느러미 접힘, 흰 반점, 먹지 않음',
      '여러 마리가 동시에 호흡 곤란을 보이면 수질과 산소를 즉시 확인하고 수생동물 진료 전문가에게 문의해야 합니다.',
      'https://www.merckvetmanual.com/all-other-pets/fish/routine-health-care-of-fish',
      'Routine Health Care of Fish'
    ),
    (
      'REPTILE', '파충류', 'other',
      array['파충류','거북이','도마뱀','뱀','reptile']::text[],
      '종별 온도 구배·습도·UVB·바스킹 지점을 측정 가능한 장비로 관리하는 환경',
      '종별 초식·육식·잡식 요구와 칼슘 균형을 반영한 급여',
      '숨기·오르기·바스킹 등 종 고유 행동을 할 수 있는 구조',
      '온습도 기록·식욕·배설·탈피·눈·구강·등갑과 피부 상태',
      '지속적인 식욕 부진, 탈피 장애, 눈·코 분비물, 입 벌림 호흡, 등갑 연화',
      '호흡 곤란, 심한 외상, 탈출 후 저체온, 산란 곤란이 의심되면 즉시 특수동물 병원에 연락해야 합니다.',
      'https://www.merckvetmanual.com/all-other-pets/reptiles/routine-health-care-of-reptiles',
      'Routine Health Care of Reptiles'
    ),
    (
      'OTHER', '기타 반려동물', 'other',
      array['기타 반려동물','소동물','other']::text[],
      '정확한 종을 확인한 뒤 온도·습도·공간·사회성 요구를 개별적으로 맞춘 환경',
      '종별 영양 요구를 확인하고 다른 동물용 사료를 임의로 대체하지 않는 급여',
      '종 고유 행동을 방해하지 않는 안전한 탐색과 휴식',
      '먹이·음수·배설·활동·체중과 외형의 평소 기준',
      '평소와 다른 식욕·배설·호흡·자세·활동 저하가 지속되는 변화',
      '정확한 종에 맞는 진료처를 미리 확인하고 급격한 상태 변화가 보이면 즉시 연락해야 합니다.',
      'https://www.merckvetmanual.com/special-subjects/animal-welfare/welfare-of-exotic-and-nontraditional-pets',
      'Welfare of Exotic and Nontraditional Pets'
    )
  ) as p(
    species_key, species_label, legacy_target, keywords,
    habitat_fact, nutrition_fact, activity_fact, monitoring_fact,
    caution_signal, emergency_signal, source_url, source_label
  )
),
core_topics as (
  select *
  from (values
    ('environment', 'daily-care', '생활 환경 기본 점검', '매일 머무는 공간의 온도·위생·안전 기준을 확인해요.', '환경', 96, 10),
    ('nutrition', 'nutrition', '식사와 급여 루틴', '먹이 종류보다 종에 맞는 구성과 일정한 관찰이 먼저예요.', '급여', 95, 20),
    ('water', 'daily-care', '물과 수분 관리', '신선한 물과 수분 섭취 변화를 일상 지표로 기록해요.', '수분', 94, 30),
    ('hygiene', 'daily-care', '위생과 청소 리듬', '과도한 청소와 방치를 피하고 생활 공간을 안정적으로 관리해요.', '위생', 93, 40),
    ('activity', 'behavior', '활동과 풍부화', '종 고유 행동을 존중하는 활동이 스트레스 관리의 출발점이에요.', '활동', 92, 50),
    ('stress', 'behavior', '스트레스 신호 읽기', '평소 행동과 다른 작은 변화부터 기록해 원인을 좁혀요.', '스트레스', 91, 60),
    ('safety', 'safety', '집 안 안전 점검', '삼킴·탈출·낙상·화상 위험을 동선 기준으로 점검해요.', '안전', 90, 70),
    ('health-observation', 'health', '매일 건강 관찰', '진단이 아니라 평소 기준과 달라진 점을 발견하는 관찰법이에요.', '건강 관찰', 99, 80),
    ('vet-visit', 'health', '병원 상담을 준비하는 법', '증상 시점과 생활 기록을 정리하면 진료 상담에 도움이 돼요.', '진료 준비', 98, 90),
    ('seasonal', 'seasonal', '계절 변화 대응', '실내 환경도 계절에 따라 달라지므로 측정과 기록으로 조정해요.', '계절 관리', 89, 100)
  ) as t(topic_key, category, title_suffix, summary_intro, tag_label, priority, sort_order)
),
dog_cat_extra_topics as (
  select *
  from (values
    ('dental', 'health', '치아와 구강 관찰', '입 냄새·먹는 방식·잇몸 변화를 정기적으로 살펴요.', '구강', 88, 110),
    ('weight', 'health', '체중과 체형 기록', '같은 조건에서 체중과 체형 변화를 함께 기록해요.', '체중', 87, 120),
    ('enrichment', 'behavior', '집 안 풍부화 설계', '반복 가능한 놀이보다 선택권과 탐색 기회를 늘려요.', '풍부화', 86, 130),
    ('grooming', 'daily-care', '그루밍과 피부 점검', '털 관리 시간에 피부·귀·발 상태도 함께 살펴요.', '그루밍', 85, 140),
    ('travel', 'safety', '이동과 외출 준비', '이동장 적응과 식별 정보, 비상 연락처를 미리 준비해요.', '이동', 84, 150),
    ('young', 'daily-care', '어린 시기 생활 기준', '성장기에는 안전한 경험과 규칙적인 건강 확인이 중요해요.', '성장기', 83, 160),
    ('senior', 'health', '노령기 변화 관찰', '나이 탓으로 넘기기 전에 회복 속도와 생활 변화를 기록해요.', '노령기', 97, 170),
    ('preventive', 'health', '예방 관리 일정', '검진·예방·구충 일정은 생활환경과 진료 상담에 맞춰 관리해요.', '예방', 96, 180),
    ('emergency', 'safety', '응급 상황 준비', '평소 진료처와 야간 연락처, 이동 수단을 미리 정리해요.', '응급', 100, 190),
    ('routine', 'daily-care', '반복 가능한 하루 루틴', '보호자와 아이 모두 지속할 수 있는 간단한 체크리스트를 만들어요.', '루틴', 82, 200)
  ) as t(topic_key, category, title_suffix, summary_intro, tag_label, priority, sort_order)
),
all_seed as (
  select p.*, t.*
  from species_profiles p
  cross join core_topics t
  union all
  select p.*, t.*
  from species_profiles p
  cross join dog_cat_extra_topics t
  where p.species_key in ('DOG', 'CAT')
),
topic_actions as (
  select * from (values
    ('environment', '휴식·급여·배설 구역이 서로 방해하지 않는지 살펴보세요. 미끄럼과 소음, 직사광선, 탈출 가능한 틈을 동물 눈높이에서 확인합니다.', '공간 전체를 한 번에 바꾸기보다 위험 지점 하나를 정리하고 새 환경에서 쉬는 모습을 관찰하세요.'),
    ('nutrition', '제품의 대상 종과 생애 단계, 급여 지침을 확인하세요. 실제 먹은 양과 남긴 양을 나누어 기록하고 간식도 급여 기록에 포함합니다.', '식단 변경이 필요하면 기존 먹이와 새 먹이의 이름, 변경 날짜를 남기고 종에 맞는 변경 방법을 진료 상담에서 확인하세요.'),
    ('water', '물 공급 장치의 오염·누수·막힘을 점검하세요. 마시는 동물은 공급량과 잔량을 구분하고, 수조 동물은 수질과 장비 상태를 확인합니다.', '물통을 교체한 날에는 실제로 물에 접근하는지 살펴보세요. 어류는 종에 맞는 수질 검사 결과와 환수 기록을 함께 남깁니다.'),
    ('hygiene', '먹이 잔여물과 배설물을 먼저 살펴본 뒤 오염 부위를 정리하세요. 세척용품은 동물의 접근을 막고 잔여물이 남지 않도록 제품 지침에 따라 사용합니다.', '급여 도구와 청소 도구를 구분하세요. 수조는 종과 여과 환경에 맞는 관리 계획을 확인하고 장비 전체를 임의로 교체하지 않습니다.'),
    ('activity', '원래 활동하는 시간대에 탐색과 움직임을 관찰하세요. 움직일 공간과 쉴 공간을 함께 제공하고 강제로 움직이게 하지 않습니다.', '활동 전후의 호흡·자세·회복 시간을 기록하세요. 새로운 놀이 도구는 감독 아래 짧게 소개하고 불편해하면 제거합니다.'),
    ('stress', '숨기·회피·반복 행동과 식욕 변화가 시작된 시점을 기록하세요. 소음, 새 동물, 취급 방식, 공간 변경이 동시에 있었는지 확인합니다.', '다가가거나 만지는 횟수를 줄이고 스스로 피할 수 있는 공간을 남겨 주세요. 행동 변화가 지속되면 질환 가능성도 진료 상담에서 확인합니다.'),
    ('safety', '전선·약·세제·작은 부품·틈새·높은 곳을 동선 순서로 점검하세요. 문을 열거나 장비를 청소하기 전에 동물이 안전한 위치에 있는지 확인합니다.', '보호자 외 가족도 같은 안전 점검표를 사용하세요. 수조와 사육장 장비는 물·열·전기 위험까지 포함해 관리합니다.'),
    ('health-observation', '평소와 달라진 식욕·배설·호흡·움직임을 같은 조건에서 비교하세요. 관찰은 진단이 아니므로 보이는 변화와 추정 원인을 구분해 기록합니다.', '증상이 잠깐 나타나면 짧은 사진이나 영상을 남기되 동물을 붙잡거나 진료를 미루지 마세요. 기록의 시각과 지속 시간을 함께 적습니다.'),
    ('vet-visit', '정확한 종과 나이, 먹이 이름, 사육 환경, 복용 중인 약을 정리하세요. 증상 시작 시점과 마지막 정상 상태를 분리해 전달합니다.', '해당 종 진료가 가능한지 예약 전에 확인하세요. 검사 자료나 채취물이 필요한지는 병원에 먼저 문의하고 임의로 치료하지 않습니다.'),
    ('seasonal', '기온 변화가 실내·사육장·수조에 미치는 영향을 측정하세요. 냉난방 바람과 직사광선, 환기 시간 변화가 생활 공간에 닿는지 확인합니다.', '계절이 바뀌면 장비 작동과 비상시 대체 계획을 점검하세요. 권장 온습도는 대표 종이 아닌 정확한 세부종 기준으로 확인합니다.'),
    ('dental', '입 냄새, 씹는 방향, 먹이를 떨어뜨림, 잇몸 출혈과 침 흘림을 관찰하세요. 억지로 입을 벌리거나 아픈 부위를 만지지 않습니다.', '양치 도구와 방법은 동물에 맞게 진료 상담에서 확인하세요. 사람용 치약이나 임의의 구강 약품을 사용하지 않습니다.'),
    ('weight', '같은 저울과 비슷한 시간대에 체중을 기록하세요. 숫자 하나보다 체형, 먹는 양, 활동 변화가 함께 달라지는지 살펴봅니다.', '기록에 저울 종류와 측정 조건을 남겨 비교 가능하게 하세요. 급격한 변화는 임의의 절식보다 진료 상담이 먼저입니다.'),
    ('enrichment', '숨기·탐색·냄새 맡기·사냥놀이 등 종 고유 행동을 선택할 기회를 주세요. 도구의 수보다 안전하게 참여하고 쉬는 선택권이 중요합니다.', '같은 도구를 계속 두기보다 반응을 기록해 교체하세요. 삼킬 수 있는 부품과 마모된 끈은 사용 전에 점검합니다.'),
    ('grooming', '털을 정리할 때 피부 붉어짐과 상처, 귀 분비물, 발의 불편을 살펴보세요. 엉킨 털을 피부 가까이에서 가위로 자르지 않습니다.', '관리 시간을 짧게 나누고 싫어하는 부위를 억지로 다루지 마세요. 피부나 귀 문제는 목욕이나 제품 변경만으로 해결하려 하지 않습니다.'),
    ('travel', '이동장과 식별 정보, 목적지 진료처를 준비하세요. 이동 중 빠져나오지 않도록 고정하고 차량 안에 혼자 남겨 두지 않습니다.', '출발 전에 이동장에 익숙해질 시간을 주세요. 약이나 진정제는 임의로 쓰지 말고 건강 상태와 이동 계획을 병원에 상담합니다.'),
    ('young', '성장기에 맞는 식사와 안전한 생활 구역을 준비하세요. 새 경험은 짧고 긍정적으로 소개하고 피곤하거나 두려워하면 쉬게 합니다.', '성장 기록과 접종·검진 계획을 함께 관리하세요. 예방 일정과 다른 동물 접촉 범위는 담당 수의사와 정합니다.'),
    ('senior', '보행, 잠, 식사, 배설과 일상 회복 속도를 기록하세요. 기존에 하던 활동을 어려워하는 변화는 나이 탓으로 단정하지 않습니다.', '미끄럼과 이동 장벽을 줄이고 변화가 지속되면 진료를 예약하세요. 검진 간격과 운동량은 개별 건강 상태에 맞춰 상담합니다.'),
    ('preventive', '이전 접종·검진·기생충 관리 기록을 날짜별로 모으세요. 생활환경과 건강 상태를 바탕으로 필요한 예방 항목을 병원과 확인합니다.', '예정일과 실제 시행일을 구분해 기록하세요. 약의 종류·용량·간격을 인터넷 정보만으로 결정하지 않습니다.'),
    ('emergency', '주간·야간 진료 연락처와 이동 수단을 준비하세요. 전화할 때 증상, 시작 시각, 노출 물질과 현재 반응을 짧게 전달합니다.', '처방 없이 사람 약을 주거나 구토를 유도하지 마세요. 사고 물품의 포장과 이름은 안전하게 확보하되 이동을 지연시키지 않습니다.'),
    ('routine', '급여·물·배설·활동·휴식 점검을 짧은 순서로 묶으세요. 가족이 교대로 돌볼 때도 같은 기준으로 완료 여부를 기록합니다.', '체크리스트를 적게 시작해 지속 가능한 항목부터 남기세요. 미완료 항목과 이상 변화는 구분해 다음 돌봄 담당자에게 전달합니다.')
  ) as a(topic_key, observation_action, practical_action)
),
prepared as (
  select
    format('pack04-%s-%s', lower(replace(species_key, '_', '-')), topic_key) as slug,
    format('%s의 %s', species_label, title_suffix) as title,
    format('%s %s', summary_intro,
      case topic_key
        when 'environment' then habitat_fact
        when 'nutrition' then nutrition_fact
        when 'activity' then activity_fact
        when 'health-observation' then monitoring_fact
        else monitoring_fact
      end
    ) as summary,
    category,
    array[species_label, tag_label, '반려동물돌봄']::text[] as tags,
    array[legacy_target]::text[] as target_species,
    array[species_key]::text[] as species_keys,
    keywords as species_keywords,
    array[title_suffix, tag_label, species_label]::text[] as search_keywords,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'routine', 'role', 'normal', 'title', '일상에서 확인할 점',
        'body', format('%s의 기본 기준: %s. %s', species_label,
          case topic_key
            when 'environment' then habitat_fact
            when 'nutrition' then nutrition_fact
            when 'water' then case species_key when 'FISH' then '수온·수질·여과 장비의 안정성' else '신선한 물에 안전하게 접근할 수 있는 환경' end
            when 'hygiene' then habitat_fact
            when 'activity' then activity_fact
            when 'stress' then activity_fact
            when 'safety' then habitat_fact
            when 'seasonal' then habitat_fact
            when 'enrichment' then activity_fact
            when 'weight' then nutrition_fact
            when 'young' then nutrition_fact
            else monitoring_fact
          end, observation_action
        )
      ),
      jsonb_build_object(
        'id', 'species-boundary', 'role', 'important', 'title', '개별 상태가 먼저예요',
        'body', format('%s라도 세부종·나이·건강 상태에 따라 관리가 달라집니다. 이 글은 일상 관찰을 위한 안내이며 진단이나 처방을 대신하지 않습니다.', species_label)
      ),
      jsonb_build_object(
        'id', 'practical-tip', 'role', 'tip', 'title', '실천 팁',
        'body', practical_action
      ),
      jsonb_build_object(
        'id', 'caution', 'role', 'warning', 'title', '주의해서 볼 변화',
        'body', caution_signal
      ),
      jsonb_build_object(
        'id', 'urgent', 'role', 'danger', 'title', '즉시 진료가 필요한 경우',
        'body', emergency_signal
      )
    ) as content_blocks,
    jsonb_build_array(
      jsonb_build_object(
        'label', source_label,
        'url', source_url,
        'publisher', 'Merck Veterinary Manual',
        'reviewedAt', '2026-09-17'
      )
    ) as source_references,
    priority,
    sort_order
  from all_seed join topic_actions using (topic_key)
),
rows_to_upsert as (
  select
    slug,
    title,
    left(summary, 400) as summary,
    (
      select string_agg(block->>'body', E'\n\n')
      from jsonb_array_elements(content_blocks) block
    ) as body,
    left(summary, 400) as body_preview,
    category,
    tags,
    target_species,
    species_keys,
    species_keywords,
    search_keywords,
    content_blocks,
    source_references,
    priority,
    sort_order
  from prepared
)
insert into public.pet_care_guides (
  slug, title, summary, body, body_preview, category, tags,
  target_species, species_keys, species_keywords, search_keywords,
  content_blocks, source_references,
  age_policy_type, status, is_active, priority, sort_order, rotation_weight,
  published_at
)
select
  slug, title, summary, body, body_preview, category, tags,
  target_species, species_keys, species_keywords, search_keywords,
  content_blocks, source_references,
  'all'::public.guide_age_policy_type,
  'published'::public.guide_content_status,
  true, priority, sort_order, 1, timezone('utc', now())
from rows_to_upsert
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  body = excluded.body,
  body_preview = excluded.body_preview,
  category = excluded.category,
  tags = excluded.tags,
  target_species = excluded.target_species,
  species_keys = excluded.species_keys,
  species_keywords = excluded.species_keywords,
  search_keywords = excluded.search_keywords,
  content_blocks = excluded.content_blocks,
  source_references = excluded.source_references,
  status = excluded.status,
  is_active = excluded.is_active,
  priority = excluded.priority,
  sort_order = excluded.sort_order,
  published_at = coalesce(public.pet_care_guides.published_at, excluded.published_at),
  deleted_at = null,
  updated_at = timezone('utc', now());

create or replace function public.search_pet_care_guides_v2(
  p_query text,
  p_species_key text default null,
  p_age_in_months integer default null,
  p_limit integer default 24
)
returns table (
  id uuid, slug text, title text, summary text, body_preview text,
  category text, tags text[], target_species text[], species_keys text[],
  species_keywords text[], search_keywords text[],
  age_policy_type public.guide_age_policy_type,
  age_policy_life_stage public.guide_life_stage_key,
  age_policy_min_months integer, age_policy_max_months integer,
  status public.guide_content_status, is_active boolean,
  priority integer, sort_order integer, rotation_weight integer,
  thumbnail_image_url text, cover_image_url text, image_alt text,
  published_at timestamptz, created_at timestamptz, updated_at timestamptz,
  match_score real
)
language sql
stable
security invoker
set search_path = public
as $$
  with normalized as (
    select
      nullif(regexp_replace(lower(coalesce(p_query, '')), '\s+', ' ', 'g'), '') as query,
      nullif(upper(btrim(coalesce(p_species_key, ''))), '') as species_key,
      greatest(1, least(coalesce(p_limit, 24), 50)) as limit_count
  ),
  candidates as (
    select
      g.*,
      n.query,
      n.species_key,
      plainto_tsquery('simple', n.query) as ts_query
    from public.pet_care_guides g
    cross join normalized n
    where n.query is not null
      and g.deleted_at is null
      and g.is_active = true
      and g.status = 'published'
      and (g.published_at is null or g.published_at <= timezone('utc', now()))
      and (
        n.species_key is null
        or g.species_keys @> array[n.species_key]
        or g.species_keys @> array['COMMON']::text[]
      )
      and (
        p_age_in_months is null
        or g.age_policy_type = 'all'
        or (g.age_policy_type = 'lifeStage' and (
          (g.age_policy_life_stage = 'baby' and p_age_in_months < 12)
          or (g.age_policy_life_stage = 'adult' and p_age_in_months between 12 and 95)
          or (g.age_policy_life_stage = 'senior' and p_age_in_months >= 96)
        ))
        or (g.age_policy_type = 'ageRange'
          and (g.age_policy_min_months is null or p_age_in_months >= g.age_policy_min_months)
          and (g.age_policy_max_months is null or p_age_in_months <= g.age_policy_max_months))
      )
  ),
  matched as (
    select
      g.*,
      ts_rank_cd(g.search_document, g.ts_query, 32) as text_rank,
      greatest(
        similarity(lower(g.title), g.query),
        similarity(lower(g.summary), g.query),
        similarity(lower(g.body_preview), g.query),
        similarity(lower(array_to_string(g.tags, ' ')), g.query),
        similarity(lower(array_to_string(g.search_keywords, ' ')), g.query),
        similarity(lower(array_to_string(g.species_keywords, ' ')), g.query)
      ) as similarity_rank
    from candidates g
    where g.search_document @@ g.ts_query
      or lower(g.title) % g.query
      or lower(g.summary) like '%' || g.query || '%'
      or lower(g.body_preview) like '%' || g.query || '%'
      or exists (select 1 from unnest(g.tags) keyword where lower(keyword) like '%' || g.query || '%')
      or exists (select 1 from unnest(g.search_keywords) keyword where lower(keyword) like '%' || g.query || '%')
      or exists (select 1 from unnest(g.species_keywords) keyword where lower(keyword) like '%' || g.query || '%')
  )
  select
    g.id, g.slug, g.title, g.summary, g.body_preview,
    g.category, g.tags, g.target_species, g.species_keys,
    g.species_keywords, g.search_keywords,
    g.age_policy_type, g.age_policy_life_stage,
    g.age_policy_min_months, g.age_policy_max_months,
    g.status, g.is_active, g.priority, g.sort_order, g.rotation_weight,
    g.thumbnail_image_url, g.cover_image_url, g.image_alt,
    g.published_at, g.created_at, g.updated_at,
    (
      (g.text_rank * 120)::real
      + (g.similarity_rank * 45)::real
      + (case when lower(g.title) = g.query then 80 else 0 end)::real
      + (case when g.species_key is not null and g.species_keys @> array[g.species_key] then 18 else 6 end)::real
      + (coalesce(g.priority, 0) * 0.8)::real
      - (coalesce(g.sort_order, 0) * 0.05)::real
    ) as match_score
  from matched g
  order by match_score desc, g.priority desc, g.sort_order asc, g.updated_at desc
  limit (select limit_count from normalized);
$$;

grant execute on function public.search_pet_care_guides_v2(text, text, integer, integer)
to authenticated;

create or replace function public.get_pet_care_guide_popular_searches_v2(
  p_species_key text default null,
  p_limit integer default 8
)
returns table (keyword text, search_count bigint, source text)
language sql
stable
security invoker
set search_path = public
as $$
  with normalized as (
    select
      nullif(upper(btrim(coalesce(p_species_key, ''))), '') as species_key,
      greatest(1, least(coalesce(p_limit, 8), 20)) as limit_count
  ),
  event_keywords as (
    select lower(regexp_replace(btrim(e.search_query), '\s+', ' ', 'g')) as keyword,
      count(*)::bigint as search_count, 'event'::text as source, 1 as source_priority
    from public.pet_care_guide_events e cross join normalized n
    where e.search_query is not null and char_length(btrim(e.search_query)) between 2 and 32
      and e.occurred_at >= timezone('utc', now()) - interval '60 days'
      and (n.species_key is null or upper(e.metadata->>'petRepresentativeSpecies') = n.species_key
        or (e.metadata->>'petRepresentativeSpecies' is null and n.species_key in ('DOG', 'CAT')
          and e.context_species_group::text = lower(n.species_key)))
    group by 1
  ),
  catalog_keywords as (
    select lower(seed.keyword) as keyword, sum(seed.weight)::bigint as search_count
    from (
      select unnest(g.search_keywords) as keyword, greatest(1, g.priority + 4) as weight
      from public.pet_care_guides g
      cross join normalized n
      where g.deleted_at is null and g.is_active = true and g.status = 'published'
        and (g.published_at is null or g.published_at <= timezone('utc', now()))
        and (n.species_key is null or g.species_keys @> array[n.species_key] or g.species_keys @> array['COMMON']::text[])
      union all
      select unnest(g.tags) as keyword, greatest(1, g.priority + 2) as weight
      from public.pet_care_guides g
      cross join normalized n
      where g.deleted_at is null and g.is_active = true and g.status = 'published'
        and (g.published_at is null or g.published_at <= timezone('utc', now()))
        and (n.species_key is null or g.species_keys @> array[n.species_key] or g.species_keys @> array['COMMON']::text[])
    ) seed
    where char_length(btrim(seed.keyword)) between 2 and 32
    group by 1
  )
  , combined as (
    select * from event_keywords
    union all
    select keyword, search_count, 'catalog'::text as source, 2 as source_priority from catalog_keywords
  ), deduped as (
    select *, row_number() over(partition by keyword order by source_priority, search_count desc) as rank
    from combined
  )
  select keyword, search_count, source from deduped where rank = 1
  order by search_count desc, keyword asc
  limit (select limit_count from normalized);
$$;

grant execute on function public.get_pet_care_guide_popular_searches_v2(text, integer)
to authenticated;

revoke execute on function public.search_pet_care_guides_v2(text, text, integer, integer) from public, anon;
revoke execute on function public.get_pet_care_guide_popular_searches_v2(text, integer) from public, anon;

do $$
declare
  baseline record;
  after_guide_digest text;
  after_pet_digest text;
begin
  select * into baseline from pack04_preservation_baseline;
  select md5(string_agg((to_jsonb(g)-'updated_at'-'species_keys'-'content_blocks'-'source_references')::text, '' order by id))
    into after_guide_digest from public.pet_care_guides g where slug not like 'pack04-%';
  select md5(string_agg((to_jsonb(p)-'species_key')::text, '' order by id)) into after_pet_digest from public.pets p;
  if baseline.guide_digest is distinct from after_guide_digest or baseline.pet_digest is distinct from after_pet_digest then
    raise exception 'PACK04_EXISTING_DATA_PRESERVATION_FAILED';
  end if;
  if (select count(*) from public.pet_care_guides where slug like 'pack04-%') <> 120
    or (select count(*) from public.pet_care_guides) <> baseline.guide_count + 120 then
    raise exception 'PACK04_ADDITIVE_GUIDE_COUNT_FAILED';
  end if;
  if exists(select title from public.pet_care_guides where slug like 'pack04-%' group by title having count(*) > 1)
    or exists(select body from public.pet_care_guides where slug like 'pack04-%' group by body having count(*) > 1) then
    raise exception 'PACK04_DUPLICATE_GUIDE_CONTENT_FAILED';
  end if;
end;
$$;

commit;
