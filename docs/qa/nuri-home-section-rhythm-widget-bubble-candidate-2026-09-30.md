# NURI 메인홈 섹션 간격·위젯 깊이·버블 조정 보고서

## 1. 착수와 판단

이번 후보는 PO가 지시한 Home 시각 보정이다. 최종 시각 승인은 대기이며 staging, commit, push는 하지 않았다. Primary owner는 NURI-03 Home이고 다른 write room은 열지 않았다.

기준은 작업 시작 시 실제 production source와 미승인 50% Home glass 후보다. 최신 지시는 이전 background-only 범위를 명시적으로 확장하여 섹션 간격, 헤더, 내부 위젯 재질, Home 커뮤니티 글꼴 및 목록 CTA의 수정을 허용했다. Hero와 날씨 UI, 데이터, 기존 이동 목적지는 보존했다.

읽은 기준 문서는 engineering workflow, checklist, memory, project-memory 4종, Master routing policy, Android release artifact 절차, toolchain·disk 정책 및 직전 `nuri-home-glass-transmission-bubble-analysis-2026-09-30.md`다. 앱 구현 파일 10개와 대상 테스트 3개를 수정했다. 위험도는 중간이며 DB, RPC, RLS, Storage와 원격 운영 변경은 없다.

냉정한 판단은 다음과 같다.

- 하단 밀집감은 유리 투명도의 문제가 아니라 섹션 사이의 실제 여백 부족이다. 날씨 아래의 기존 간격을 다른 패널에도 적용하는 방향이 적절하다.
- 작은 버블을 더 많이 넣기보다 크기 대비와 섹션별 위치를 먼저 고치는 편이 효과적이다. 큰 구체는 요청한 세 코너에만 제한했다.
- 빠른 기록 위젯은 투명한 바탕과 약한 테두리 때문에 패널과 분리되어 보이지 않았다. 두 기록 위젯 그룹에 같은 밝은 표면과 반사광을 적용했다.
- 헤드라인 아이콘과 서로 다른 들여쓰기, CTA 문구가 섹션마다 다른 시각 규칙을 만들고 있었다. 공통 헤더로 정리했다.
- 전체 유리 채움을 더 낮추는 변경은 이번 후보에 합치지 않았다. 현재 50% 위에서 새 구성과 위젯 깊이를 먼저 평가한다.

## 2. 구현 결과

### 섹션 간격

날씨의 기존 하단 padding 40dp와 유리 root의 기존 상단 margin 12dp를 보존했다. 하단 10개 섹션 사이에도 list gap 40dp를 적용했다. 따라서 **실제 패널 경계 사이 간격은 52dp**다. 단순히 40dp라고 부르면 기존 root 여백을 빠뜨린 설명이다.

Galaxy S24 계층 좌표에서 날씨부터 일기까지 인접 패널의 간격은 146~147px로 같았다. 384dp 폭 장치의 반올림 차이 범위다. Hero의 `우리 아이 더 알아보기` 버튼부터 날씨까지 기존 여백과 fold는 바꾸지 않았다.

연속된 하단 9개 간격에 40dp가 추가되므로 분리 여백만 360dp 늘어난다. 헤더와 CTA 정리에 따른 높이 변화는 별도다. 화면 호흡은 늘어나지만 마지막 섹션까지 이동하는 길이도 늘어나는 의도된 tradeoff다.

### 헤드라인과 목록 CTA

`HomeSectionHeader`로 하단 10개 헤더를 통일했다. 패널 내부 왼쪽 14dp, 상단 18dp를 기준으로 제목을 배치하며 헤드라인의 장식 아이콘은 제거했다. 위젯·날씨 지표·기능성 아이콘은 유지했다. 실기기 헤더의 왼쪽 시작점은 모두 84px로 같았다.

전체 요약은 헤더만 공통 위치로 정렬했다. 숫자 위젯은 내부 body에 18dp를 더해 기존 총 32dp의 수평 inset과 144dp 높이를 유지했다. 자주 쓰는 기록의 2×2 구조, 위젯 aspect ratio 1, 각 동작을 보존했다.

목록 목적지가 있는 8개 헤더 CTA는 **전체 보기**로 통일했다. 버튼 폭 80dp, 텍스트 중앙 정렬, 화살표는 오른쪽 5dp 위치이며 기존 누름 여유를 유지한다. 접근성 이름에는 목적지를 구체적으로 남겼다.

| 섹션 | 이동 목적지 |
| --- | --- |
| 자주 쓰는 기록 | 기존 Timeline |
| 전체 요약 | 기존 전체 요약 기록 Timeline |
| 최근 기록 | 기존 Timeline |
| 반려인들이 주목한 이야기 | 기존 커뮤니티 목록 |
| 우리 아이를 위한 추천 팁 | 기존 가이드 목록 |
| 일정 보기 | 기존 일정 목록 |
| 건강관리 최근 활동 | 기존 건강관리 화면 |
| 이번 달 누리 일기 | 기존 일기 카테고리 Timeline |

오늘 한장과 오늘의 팁에는 새 목록 목적지를 만들지 않았다. 커뮤니티 하단의 중복 `전체 보기`는 헤더 CTA 한 개로 합쳤다. `기록하기`, `일정 추가하기` 같은 실행 명령과 Hero 프로필 CTA는 그대로다.

### 두 위젯 그룹의 깊이감

`HomeWidgetMaterial`을 자주 쓰는 기록 4개와 전체 요약 4개에 공통 적용했다.

- 채움: `rgba(255, 253, 250, 0.88)`.
- 윗면: white 0.66에서 0.02로 이어지는 낮은 반사광.
- 윗 테두리: white 0.98.
- 측면: warm-neutral alpha 0.20.
- 아래 테두리: muted-neutral alpha 0.30.
- shadowOpacity 0, elevation 0. 반사광은 touch와 접근성에서 제외.

이것은 반사광과 베벨 대비로 만드는 얕은 입체감이다. 강한 drop shadow나 실제 3D 렌더링은 아니다. 이전보다 위젯 경계가 분명해졌지만, PO가 원하는 만큼 떠 보이는지는 별도의 시각 판단이 필요하다. 위젯은 읽기 쉬운 밝은 재질을 우선하므로 그 뒤의 버블은 바깥 유리패널만큼 투과하지 않는다.

바깥 Home glass의 50% 채움, 72% 테두리, 단일 surface, radius, transparent root와 no-shadow 계약은 변경하지 않았다. Profile Edit의 70%도 그대로다.

### Home 커뮤니티 글꼴

Home에 포함된 커뮤니티에서만 `FixedTypographyBoundary`를 제거했다. 깜찍발랄체를 선택하면 제목·탭·본문이 다른 Home 섹션과 같은 선택 글꼴을 따른다. Pretendard 선택도 유지된다.

커뮤니티 전용 화면의 고정 글꼴 경계와 날씨의 고정 글꼴 경계는 그대로다. 전역 제외 정책을 바꾼 것이 아니다. 탭, 캐시, 데이터 조회, 오류 처리와 게시글 이동은 보존했다.

### 버블과 배경

하나의 `HomeAmbientBubbleCanvas` owner를 유지한다. Hero의 좌측 중단·우측 하단 큰 구체와 작은 구체 재질·배치를 그대로 유지했다. 중앙의 밝은 가독성 공간도 보존했다.

Hero 아래 기존 49개를 재배치하여 작은 구체 41개와 연결용 중간 구체 8개로 구성했다. 여기에 큰 구체 3개만 추가해 총 52개다. 기존 빛 15개와 승인된 투명 sphere·radial texture를 재사용하며 새 asset, 애니메이션, native dependency를 추가하지 않았다.

- 작은 구체: 반응형 18~42dp.
- 중간 구체: 44~64dp.
- 큰 구체: viewport 폭의 0.30~0.34, 96~150dp clamp.
- 큰 구체 위치: 전체 요약 우상단, 사진 프레임 바깥 하단, 일기 하단. 중심을 화면 바깥에 둬 절반 이상 crop한다.
- 구체 대부분은 좌우 edge에 배치하고 중앙 텍스트·CTA 대비를 낮게 유지했다.

하단 10개 섹션의 실제 `onLayout` 좌표를 하나의 canvas로 전달한다. 상위 content·lower root의 위치와 섹션별 y·height를 합성해 해당 코너를 따른다. 값은 0.5dp 단위로 정규화하며 동일한 값이면 기존 state를 반환한다. scroll 이벤트에서 장식 state를 갱신하지 않는다. 고정 content height나 기기 모델 분기는 없다.

## 3. 검증 결과

### Local

- Node 24.20.0, Yarn 3.6.4: toolchain PASS.
- TypeScript: PASS.
- 대상 ESLint: 오류 0개, 새 경고 0개. 기존 `no-shadow` 경고 23개는 유지되어 전체 경고 0개라고 보고하지 않는다.
- 관련 9개 테스트 스위트, 82개 테스트: PASS. 전체 테스트는 실행하지 않았다.
- `git diff --check`: PASS.
- 360dp, 400dp, 430dp 버블 descriptor, 위치 측정 갱신, pointerEvents none, 뒤쪽 layering, 공통 헤더·위젯·글꼴 경계와 기존 기록 계산 계약을 확인했다. 해당 세 폭의 물리 실기기 화면 검증으로 확대 해석하지 않는다.
- 작업 시작 백업과 대조하여 `HomeSectionGlass`, Weather card, Autumn Hero stage, Profile Edit palette, Community styles 및 기존 CTA 동작 컴포넌트가 byte-identical임을 확인했다.

### Release와 실기기

- Android Release 1회, `adb install -r` 1회, 앱 데이터 보존.
- 서명 검사 ACCEPTED. `com.nuri.app`, versionName 1.0, versionCode 1, debuggable false, embedded JS bundle.
- APK: `/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/android/app/build/outputs/apk/release/nuri-d2c93da-qa-release.apk`.
- APK SHA-256: `585d8e1df5cfd6b54b2bc17ba1a066d7b581cc4bc4910f0e3c3310f6380e7b04`.
- 동일 SHA-256의 보존 APK: `/tmp/nuri-home-rhythm-20260930/nuri-d2c93da-home-rhythm-585d8e1d.apk`.
- Build timestamp: 2026-09-30 14:17:37 KST.
- Galaxy S24 `SM_S937N / R5CY613NMSY`, Android 16.
- Metro OFF. Release에 Fast Refresh 의존 없음.
- Hero 및 날씨와 하단 10개 섹션 render, 전체 scroll, Bottom Navigation, 맨 위로 복귀 확인.
- 날씨 상세, 건강 기록 입력, 전체 요약 Timeline, 커뮤니티 목록, 건강관리, 일기 Timeline 진입·복귀 확인. 테스트 중 기록 저장이나 사용자 데이터 수정은 하지 않았다.
- Hero에서 이전 50% 후보와 비교 가능한 고유 label 40개 bounds가 동일하다. 모든 앱 UI의 pixel 동일성 검증으로 확대하지 않는다.
- 패널 간 gap 146~147px, 헤더 x 84px, 구체의 세 지정 코너, 마지막 section까지 배경 cover 확인.
- 확인한 대표 화면에서 새 gray backing, 잘린 헤더 텍스트, 수평 overflow, seam, Red Screen과 touch blocking을 관찰하지 않았다. 사진 placeholder의 기존 회색 영역은 배경 결함이 아니다.
- 14:19:22~14:39:14 KST 확인 구간 NURI PID 29493의 FATAL 0, RN Fatal 0, ANR 0. Crashlytics 예외 핸들러 초기화 debug 로그는 fatal로 집계하지 않았다.
- 시작·종료 disk free 약 42GiB. source, 승인 APK, cache와 증적 삭제 없음.

Remote 변경은 없으며 이 Home presentation 작업에서 SQL catalog 검사는 실행하지 않았다. 원격 운영 closeout을 주장하지 않는다.

## 4. 증적과 문서

대표 캡처와 UI 계층·검사·빌드·로그는 `/tmp/nuri-home-rhythm-20260930`에 있다. Long-scroll 합성은 만들지 않았다.

1. [Hero](/tmp/nuri-home-rhythm-20260930/01-hero.png)
2. [프로필 CTA·날씨·자주 쓰는 기록 헤더](/tmp/nuri-home-rhythm-20260930/02-weather-frequent.png)
3. [자주 쓰는 기록 4개·전체 요약 우상단](/tmp/nuri-home-rhythm-20260930/03-frequent-summary.png)
4. [전체 요약 위젯·최근 기록](/tmp/nuri-home-rhythm-20260930/04-summary-recent.png)
5. [최근 기록·사진 바깥 코너](/tmp/nuri-home-rhythm-20260930/05-photo-community.png)
6. [Home 커뮤니티 글꼴·추천 헤더](/tmp/nuri-home-rhythm-20260930/06-community-recommendation.png)
7. [추천 팁·일정](/tmp/nuri-home-rhythm-20260930/07-recommendation-schedule.png)
8. [건강관리·오늘의 팁·일기 헤더](/tmp/nuri-home-rhythm-20260930/08-health-tip-diary.png)
9. [마지막 일기와 하단 큰 구체](/tmp/nuri-home-rhythm-20260930/09-tip-diary-bottom.png)

작업 전 source 16개 및 직전 50% APK는 `/tmp/nuri-home-rhythm-20260930/baseline`에 보존했다. 되돌릴 경우 이번 간격·헤더·위젯·Home font boundary·버블 anchor 변경만 대상으로 하며 기존 dirty 전체를 되돌리지 않는다.

project-memory 4종, release checklist 및 리서치에 이번 변경의 이유, 새 기준과 PO 대기를 기록했다. 이전 50% 분석에서 버블 변경이 미적용이라고 쓴 내용은 이번 구현 전의 이력이다.

## 5. PO 직접 승인과 최종 상태

1. 날씨 아래와 같은 섹션 간격이 답답함을 해소하면서 지나치게 길어 보이지 않는가.
2. 자주 쓰는 기록과 전체 요약 위젯이 같은 재질로, 유리 위에 살짝 떠 있는 듯 보이는가.
3. 밝은 위젯 표면과 바깥 50% 유리의 대비가 적절한가.
4. 헤드라인 아이콘 제거와 공통 시작점이 전체 Home을 더 정돈되게 만드는가.
5. `전체 보기`의 중앙 텍스트와 오른쪽 화살표가 자연스럽고 목적지가 충분히 직관적인가.
6. Home 커뮤니티의 선택 글꼴 적용과 전용 커뮤니티의 고정 글꼴 구분이 적절한가.
7. 작은 버블의 크기와 분포가 하단 단조로움을 줄이면서 콘텐츠를 방해하지 않는가.
8. 전체 요약 우상단, 사진 바깥 코너, 일기 하단의 큰 구체가 과하지 않은가.
9. Hero의 만족스러운 구성과 중앙 가독성이 유지됐는가.

HEAD: `d2c93dab520fb19a85de1bd992c7e705b2e72c9f`.
Branch: `codex/task6-community-content-policy`.
Staged NONE. Commit NO. Push NO. Preexisting dirty PRESERVED.

구현과 객관 검증은 완료했다. 시각 완성도는 PO 승인 대기다. Galaxy S24는 Hero 시작 화면으로 준비했다. 다른 계절, 다음 기능과 추가 투명도 조정을 자동 시작하지 않는다. 다음 액션은 이번 설치 후보에 대한 PO 직접 승인 한 가지다.

PO 승인을 기다립니다.
