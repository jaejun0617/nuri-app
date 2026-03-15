import type { PetCareGuide } from './types';

type GuideSeed = Omit<
  PetCareGuide,
  'bodyPreview' | 'speciesKeywords' | 'searchKeywords' | 'publishedAt'
> & {
  body: string;
  bodyPreview?: string;
  speciesKeywords?: string[];
  searchKeywords?: string[];
};

const GUIDES: GuideSeed[] = [
  {
    id: 'guide-common-water-routine',
    slug: 'daily-water-routine',
    title: '매일 물그릇 상태를 먼저 확인해 주세요',
    summary:
      '물 섭취량은 작은 컨디션 변화를 가장 빨리 보여주는 신호입니다. 물그릇 세척과 급수 위치 점검만으로도 기본 건강관리가 시작됩니다.',
    body:
      '물은 가장 기본적인 건강 지표입니다.\n\n아이가 물을 평소보다 적게 마시거나, 반대로 갑자기 많이 마시면 몸 상태 변화가 먼저 나타나는 경우가 많습니다. 하루 한 번은 물그릇 안쪽 미끌거림과 냄새를 확인하고, 미지근한 물로 가볍게 세척해 주세요.\n\n물그릇 위치도 중요합니다. 식기 옆, 햇빛이 강한 곳, 화장실과 가까운 곳은 피하고 아이가 편안하게 접근할 수 있는 지점에 두는 편이 좋습니다.\n\n여러 마리를 함께 키운다면 급수 지점을 한 곳만 두지 말고, 이동 동선마다 하나씩 확보하는 방식이 안정적입니다.',
    category: 'daily-care',
    tags: ['수분관리', '기본루틴', '건강체크'],
    targetSpecies: ['common'],
    agePolicy: { type: 'all', lifeStage: null, minMonths: null, maxMonths: null },
    status: 'published',
    isActive: true,
    sortOrder: 10,
    priority: 90,
    rotationWeight: 1,
    image: null,
    createdAt: '2026-03-15T00:00:00.000Z',
    updatedAt: '2026-03-15T00:00:00.000Z',
  },
  {
    id: 'guide-common-odor-check',
    slug: 'weekly-odor-check',
    title: '평소와 다른 냄새는 기록보다 먼저 체크하세요',
    summary:
      '입냄새, 귀 냄새, 피부 냄새는 생활 속에서 가장 먼저 체감하는 이상 신호입니다. 주 1회라도 루틴으로 체크해 두면 이상을 빨리 잡을 수 있습니다.',
    body:
      '집에서 가장 쉽게 감지할 수 있는 건강 신호 중 하나가 냄새입니다.\n\n귀 안쪽에서 강한 냄새가 나거나, 입냄새가 갑자기 심해지거나, 피부와 발 주변에서 평소와 다른 냄새가 느껴지면 생활 환경이나 건강 상태를 먼저 점검해 보세요.\n\n중요한 것은 냄새 자체보다 변화입니다. 평소와 달라졌는지, 특정 부위에만 집중되는지, 며칠째 이어지는지를 함께 기록하면 병원 상담에도 도움이 됩니다.\n\n무조건 제품을 바꾸기보다 먼저 관찰하고, 반복되면 사진과 메모를 남겨두는 운영 습관이 좋습니다.',
    category: 'health',
    tags: ['건강신호', '피부관리', '관찰루틴'],
    targetSpecies: ['common'],
    agePolicy: { type: 'all', lifeStage: null, minMonths: null, maxMonths: null },
    status: 'published',
    isActive: true,
    sortOrder: 20,
    priority: 82,
    rotationWeight: 1,
    image: null,
    createdAt: '2026-03-15T00:00:00.000Z',
    updatedAt: '2026-03-15T00:00:00.000Z',
  },
  {
    id: 'guide-dog-puppy-chew',
    slug: 'puppy-chew-management',
    title: '어린 강아지라면 씹기 욕구를 안전하게 풀어 주세요',
    summary:
      '이갈이 시기에는 무는 행동을 혼내기보다 안전한 대체물을 충분히 제공하는 편이 장기적으로 더 안정적입니다.',
    body:
      '어린 강아지는 이갈이 시기에 씹는 욕구가 강해집니다.\n\n이 시기의 무는 행동을 모두 문제 행동으로만 다루면 보호자와 아이 모두 스트레스를 크게 받습니다. 대신 안전한 씹기 장난감과 단단하지 않은 치발용 간식을 준비해 대체 행동을 빠르게 알려주는 것이 중요합니다.\n\n전선, 천, 가구 모서리처럼 위험한 물건은 접근 자체를 줄이고, 씹기 장난감은 하루 종일 같은 것만 두기보다 교차 운영해 흥미를 유지해 주세요.\n\n무는 강도가 갑자기 세지거나 잇몸 출혈이 잦으면 구강 상태를 함께 확인하는 것이 좋습니다.',
    category: 'behavior',
    tags: ['강아지', '퍼피', '이갈이'],
    targetSpecies: ['dog'],
    speciesKeywords: ['dog', '강아지', 'puppy'],
    searchKeywords: ['씹기', '이갈이', '장난감'],
    agePolicy: { type: 'lifeStage', lifeStage: 'baby', minMonths: null, maxMonths: null },
    status: 'published',
    isActive: true,
    sortOrder: 30,
    priority: 88,
    rotationWeight: 1,
    image: null,
    createdAt: '2026-03-15T00:00:00.000Z',
    updatedAt: '2026-03-15T00:00:00.000Z',
  },
  {
    id: 'guide-dog-senior-walk',
    slug: 'senior-dog-walk-rhythm',
    title: '노령견 산책은 거리보다 회복 리듬이 더 중요해요',
    summary:
      '나이가 들수록 한 번의 긴 산책보다 짧고 안정적인 산책 리듬이 관절과 회복에 더 유리할 수 있습니다.',
    body:
      '노령견은 예전과 같은 거리의 산책을 해도 회복 속도가 달라질 수 있습니다.\n\n중요한 것은 몇 분 걸었는지가 아니라 산책 후 호흡, 다리 떨림, 식사와 수면 리듬이 어떻게 변하는지입니다. 산책 길이를 욕심내기보다 짧고 안정적인 구간을 여러 번 운영하는 편이 더 적합할 수 있습니다.\n\n특히 계단, 미끄러운 바닥, 갑작스러운 점프 구간은 관절 부담을 키우기 쉬우니 동선을 점검해 주세요.\n\n산책 후 피로가 이틀 이상 이어지면 강도를 조정하고 병원 상담 기준도 함께 정리해 두는 것이 좋습니다.',
    category: 'health',
    tags: ['강아지', '노령기', '산책루틴'],
    targetSpecies: ['dog', 'common'],
    speciesKeywords: ['dog', '강아지', 'senior'],
    searchKeywords: ['관절', '노령', '산책'],
    agePolicy: { type: 'lifeStage', lifeStage: 'senior', minMonths: null, maxMonths: null },
    status: 'published',
    isActive: true,
    sortOrder: 40,
    priority: 95,
    rotationWeight: 1,
    image: null,
    createdAt: '2026-03-15T00:00:00.000Z',
    updatedAt: '2026-03-15T00:00:00.000Z',
  },
  {
    id: 'guide-cat-stress-hiding',
    slug: 'cat-hiding-stress-signal',
    title: '고양이가 숨는 시간이 늘면 환경 신호부터 봐야 해요',
    summary:
      '고양이는 불편함을 조용히 숨기는 경우가 많습니다. 숨는 위치와 시간 변화는 중요한 환경·건강 신호가 될 수 있습니다.',
    body:
      '고양이는 스트레스나 몸의 불편함을 적극적으로 드러내지 않는 경우가 많습니다.\n\n갑자기 침대 밑이나 가구 뒤에 오래 머무르기 시작했다면 단순 성격 문제로 넘기지 말고 최근 바뀐 환경을 먼저 점검해 주세요. 모래 위치, 소음, 낯선 냄새, 새로운 가구 배치 같은 요소가 원인이 되기도 합니다.\n\n동시에 식사량과 화장실 빈도도 함께 확인하는 것이 좋습니다. 숨는 시간이 길어지면서 식사나 배변 패턴까지 변하면 건강 이슈와 연결될 가능성도 있습니다.\n\n변화가 이어지면 날짜별로 메모를 남겨두면 원인 추적에 도움이 됩니다.',
    category: 'environment',
    tags: ['고양이', '스트레스', '환경관찰'],
    targetSpecies: ['cat'],
    speciesKeywords: ['cat', '고양이'],
    searchKeywords: ['숨기', '스트레스', '환경'],
    agePolicy: { type: 'all', lifeStage: null, minMonths: null, maxMonths: null },
    status: 'published',
    isActive: true,
    sortOrder: 50,
    priority: 90,
    rotationWeight: 1,
    image: null,
    createdAt: '2026-03-15T00:00:00.000Z',
    updatedAt: '2026-03-15T00:00:00.000Z',
  },
  {
    id: 'guide-cat-senior-jump',
    slug: 'senior-cat-jump-support',
    title: '노령묘는 점프 경로에 보조 단차를 마련해 주세요',
    summary:
      '노령묘는 예전처럼 뛰어오르더라도 관절 부담이 커질 수 있습니다. 생활 공간의 높이 차를 부드럽게 연결하는 것이 중요합니다.',
    body:
      '노령묘는 높은 곳을 좋아하는 습관이 남아 있어도 몸은 예전만큼 따라주지 않을 수 있습니다.\n\n소파, 침대, 창틀처럼 자주 오르내리는 지점에는 발이 미끄럽지 않은 보조 단차를 두고, 착지 지점에 충격이 큰 바닥이 없는지 함께 확인해 주세요.\n\n점프를 줄이도록 무조건 막기보다 안전한 경로를 만들어 주는 것이 현실적인 방법입니다.\n\n점프 후 머뭇거림이 늘거나, 올라가던 장소를 피하기 시작하면 관절 통증 가능성도 염두에 두는 것이 좋습니다.',
    category: 'daily-care',
    tags: ['고양이', '노령기', '관절관리'],
    targetSpecies: ['cat', 'common'],
    speciesKeywords: ['cat', '고양이'],
    searchKeywords: ['노령', '점프', '관절'],
    agePolicy: { type: 'lifeStage', lifeStage: 'senior', minMonths: null, maxMonths: null },
    status: 'published',
    isActive: true,
    sortOrder: 60,
    priority: 93,
    rotationWeight: 1,
    image: null,
    createdAt: '2026-03-15T00:00:00.000Z',
    updatedAt: '2026-03-15T00:00:00.000Z',
  },
  {
    id: 'guide-common-food-change',
    slug: 'food-change-7day-rule',
    title: '사료를 바꿀 때는 7일 이상 천천히 섞어 주세요',
    summary:
      '새 사료를 바로 전환하면 위장 부담이 커질 수 있습니다. 소화 상태를 보며 단계적으로 비율을 조정하는 편이 안전합니다.',
    body:
      '사료 변경은 작은 일처럼 보여도 아이의 위장에는 큰 변화일 수 있습니다.\n\n새 사료를 갑자기 100%로 바꾸기보다 기존 사료와 섞어 7일 이상 천천히 비율을 높여 주세요. 배변 상태, 식욕, 피부 반응을 함께 확인하면 잘 맞는지 더 빨리 판단할 수 있습니다.\n\n특히 노령기나 어린 시기, 장이 예민한 아이는 전환 속도를 더 느리게 가져가는 편이 안전합니다.\n\n한 번에 여러 요소를 바꾸기보다 사료만 먼저 바꾸고 간식은 기존대로 유지하면 원인 추적이 쉬워집니다.',
    category: 'nutrition',
    tags: ['식단관리', '소화관리', '급여전환'],
    targetSpecies: ['common'],
    searchKeywords: ['사료', '급여', '소화'],
    agePolicy: { type: 'all', lifeStage: null, minMonths: null, maxMonths: null },
    status: 'published',
    isActive: true,
    sortOrder: 70,
    priority: 86,
    rotationWeight: 1,
    image: null,
    createdAt: '2026-03-15T00:00:00.000Z',
    updatedAt: '2026-03-15T00:00:00.000Z',
  },
  {
    id: 'guide-common-summer-floor',
    slug: 'summer-floor-heat-check',
    title: '더운 날에는 바닥 온도부터 먼저 확인해 주세요',
    summary:
      '계절성 팁도 장기 운영 구조에 포함해야 합니다. 여름철에는 공기 온도보다 바닥 표면 온도가 더 직접적인 부담이 될 수 있습니다.',
    body:
      '여름철에는 실외 공기 온도만 보고 산책 여부를 판단하면 놓치는 부분이 생깁니다.\n\n아스팔트나 타일 바닥은 체감보다 훨씬 뜨거울 수 있어 발바닥과 체온 조절에 큰 부담을 줄 수 있습니다. 손등으로 몇 초간 바닥을 만져보고 뜨겁게 느껴지면 시간대를 조정해 주세요.\n\n실내에서도 햇빛이 오래 들어오는 창가, 베란다 바닥은 과열될 수 있으니 휴식 공간 위치를 함께 점검하는 편이 좋습니다.\n\n계절성 콘텐츠는 운영자가 시즌별로 우선순위를 조절할 수 있도록 별도 태그와 우선순위를 유지해야 합니다.',
    category: 'seasonal',
    tags: ['여름관리', '계절팁', '안전관리'],
    targetSpecies: ['common'],
    searchKeywords: ['여름', '바닥', '온도'],
    agePolicy: { type: 'all', lifeStage: null, minMonths: null, maxMonths: null },
    status: 'published',
    isActive: true,
    sortOrder: 80,
    priority: 80,
    rotationWeight: 1,
    image: null,
    createdAt: '2026-03-15T00:00:00.000Z',
    updatedAt: '2026-03-15T00:00:00.000Z',
  },
  {
    id: 'guide-other-enclosure-check',
    slug: 'enclosure-environment-check',
    title: '소형 반려동물은 케이지 환경 변화를 먼저 기록해 주세요',
    summary:
      '소형 포유류나 기타 반려동물은 환경 변화에 민감할 수 있습니다. 먹이보다 온도, 습도, 은신처 변화가 먼저 영향을 줄 때도 많습니다.',
    body:
      '토끼, 햄스터, 소형 조류 등 기타 반려동물은 생활 공간 환경 변화의 영향을 크게 받는 경우가 많습니다.\n\n식욕이 떨어지거나 활동량이 줄었다면 먹이만 보지 말고 케이지 위치, 은신처 상태, 온도와 소음 변화를 먼저 점검해 주세요. 작은 환경 변화가 스트레스로 이어지기 쉽습니다.\n\n정기 청소 일정과 환경 체크리스트를 함께 운영하면 이상 징후를 더 빨리 발견할 수 있습니다.\n\n이 카테고리는 향후 종 확장 시 `other` species 그룹의 기반 데이터 역할을 합니다.',
    category: 'environment',
    tags: ['기타반려동물', '환경관리', '관찰루틴'],
    targetSpecies: ['other', 'common'],
    speciesKeywords: ['other', 'hamster', 'turtle', 'rabbit', '거북이', '햄스터'],
    searchKeywords: ['케이지', '환경', '소형동물'],
    agePolicy: { type: 'all', lifeStage: null, minMonths: null, maxMonths: null },
    status: 'published',
    isActive: true,
    sortOrder: 90,
    priority: 74,
    rotationWeight: 1,
    image: null,
    createdAt: '2026-03-15T00:00:00.000Z',
    updatedAt: '2026-03-15T00:00:00.000Z',
  },
];

function toBodyPreview(body: string, summary: string, explicitPreview?: string) {
  if (explicitPreview?.trim()) return explicitPreview.trim();
  const normalized = body.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 140) return normalized;
  return summary.trim();
}

function freezeGuide(guide: GuideSeed): PetCareGuide {
  return Object.freeze({
    ...guide,
    bodyPreview: toBodyPreview(guide.body, guide.summary, guide.bodyPreview),
    speciesKeywords: Object.freeze([...(guide.speciesKeywords ?? [])]),
    searchKeywords: Object.freeze([...(guide.searchKeywords ?? [])]),
    publishedAt: guide.updatedAt,
    tags: Object.freeze([...guide.tags]),
    targetSpecies: Object.freeze([...guide.targetSpecies]),
  });
}

export const PET_CARE_GUIDES: ReadonlyArray<PetCareGuide> = Object.freeze(
  GUIDES.map(freezeGuide),
);
