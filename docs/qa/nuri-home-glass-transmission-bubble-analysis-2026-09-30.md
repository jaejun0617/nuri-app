# NURI 메인홈 유리 투과감 시험과 하단 버블 분석

후속 상태: PO의 적용 지시에 따른 섹션 간격·위젯·헤더·Home 글꼴·버블 통합 후보를 `nuri-home-section-rhythm-widget-bubble-candidate-2026-09-30.md`에 기록했다. 아래의 버블 미적용 판단과 APK는 당시 분석·시험 이력이다.

## 결론

Home 유리 채움을 70%에서 58%로 시험한 뒤, PO의 추가 지시에 따라 50%로 한 단계 더 낮췄다. 현재 Galaxy S24에는 50% 후보가 설치되어 있다. 이 수치는 유리표면의 채움 불투명도이며 글자, 아이콘, 버튼 또는 섹션 전체의 불투명도가 아니다.

엔지니어링 시각 판단으로는 배경 투과감이 개선되었지만, 투명도만으로 하단의 단조로움이 모두 해결되지는 않는다. 다음 권장안은 **50%를 시험 기준으로 유지하면서 작은 버블의 배치를 재조정하고, 몇 곳에만 큰 버블을 추가하는 것**이다. 50%는 최종 승인값이 아니며 미적 판단은 PO가 직접 한다. 이번 턴에는 버블을 추가하거나 옮기지 않았다.

## 작업 범위와 기준

- Primary owner: NURI-03 Home. 다른 write room, 계절, 기능 및 backend 작업 없음.
- UI 기준: 현재 production source. 배경 기준: 직전 glossy bubble 후보 및 PO가 첨부한 실기기 전체 요약 화면.
- 앱 수정: `src/components/home/HomeSectionGlass.tsx`와 `__tests__/homeSectionGlass.test.ts` 두 파일.
- Home의 Autumn 공통 표면만 `rgba(255, 252, 246, 0.50)`로 변경했다. Weather와 10개 하단 섹션에 동일하게 적용된다.
- 테두리 `rgba(255, 255, 255, 0.72)`, 기존 radius, transparent root, single glass surface, shadowOpacity 0, elevation 0 유지.
- Profile Edit의 Autumn 채움 70%, 다른 계절의 재질, Hero, 배경 descriptor, 렌더러, 기존 내부 카드와 데이터 및 navigation 보존.
- Weather, Hero stage, Home composition, Home styles, Profile Edit palette, 배경 descriptor 및 renderer는 작업 전후 SHA-256 동일함을 확인했다.

## 투과감 시험 분석

단순 alpha 합성 기준으로 배경 기여는 70% 채움에서 30%, 58% 채움에서 42%, 50% 채움에서 50%다. 이것은 합성 비율이지 눈으로 느끼는 개선율이나 광학적 투과율 측정값이 아니다. 실제 배경과 표면 색이 모두 밝아서 변화는 점진적이다.

- 58%: 색과 버블이 조금 더 비치지만 넓은 패널은 여전히 밝은 카드처럼 읽힌다.
- 50%: 패널 안쪽의 peach와 버블 경계가 한 단계 더 보인다. 확인한 Weather, Summary, Health, Today Tip, Diary에서 텍스트의 대비를 방해하는 변화는 관찰하지 않았다.
- 아직 남는 한계: 작은 버블만 있는 배경은 유리를 더 투명하게 해도 크기 대비와 구성이 생기지 않는다. 지금은 추가 투명도 조정보다 배경 구성을 보완하는 편이 효과적이라는 판단이다.
- 전체 요약 숫자 카드와 추천 콘텐츠의 흰 내부 카드는 기존 불투명 surface를 유지한다. 바깥 유리를 낮춰도 그 카드 뒤의 배경은 투과하지 않는다. 이는 보존한 기존 UI이지 새 backing box가 아니다.

## 하단이 심심하게 보이는 원인

실제 descriptor에는 Hero 아래 작은 버블 49개와 빛 15개가 있다. Weather부터 Diary까지 구간 이름별로 버블이 4~5개씩 정의되어 있다. 따라서 하단에 버블이 아예 없거나 수가 계속 감소하는 구현은 아니다.

Galaxy S24의 약 384dp 폭 기준 버블 지름은 10~38dp다. 49개 중 37개가 30dp 미만이다. 대부분 좌측 3~14%, 우측 87~98% 위치에 있어 가장자리에서만 작게 보이며, 패널 안쪽은 채움과 밝은 색의 합성으로 더 연해진다.

첨부 화면의 전체 요약 우상단은 크기 대비를 넣기 좋은 빈 코너다. 현재는 작은 버블만 있고 넓은 헤더 공간에는 눈에 띄는 원형 구성이 없어, Hero의 큰 구체와 비교하면 하단이 반복적으로 느껴진다. 이 마지막 문장은 시각 분석이며 객관적 성능이나 최종 PO 판정이 아니다.

## 권장 버블 보완안

아래는 제안이며 이번 턴 미적용이다. 기존 Hero의 만족스러운 구체 재질, 색 공기 및 구성은 변경하지 않는다.

### 큰 버블은 세 곳만 우선 검토

1. 전체 요약 우상단: 오른쪽 외곽에 잘린 glossy 구체 1개와 작은 동반 버블 2~3개. 제목, 설명과 숫자 카드 뒤는 피한다.
2. 오늘 한장 바깥 하단 코너: 반대쪽 가장자리에 큰 구체 1개. 실제 사진 위로 올라오지 않으며 사진 프레임 바깥에서 보이게 한다.
3. 이번 달 누리 일기 하단 코너: 잘린 구체 1개와 작은 버블로 마지막 분위기를 마무리한다. 기록하기 버튼 중앙은 비운다.

첫 후보 지름은 viewport 폭의 약 0.27~0.35, S24에서는 약 104~134dp를 권장한다. Hero의 큰 구체보다 작게 유지하고, 약 40~60%가 화면 밖으로 잘리게 한다. 한 viewport에 큰 버블은 최대 1개이며 인접 섹션에 연속 반복하지 않는다. 이는 확정 pixel map이 아니라 실제 섹션 여백을 기준으로 적용할 크기 지침이다.

### 작은 버블은 개수보다 배치를 먼저 보완

- 현재 49개를 먼저 재배치한다. 모든 구간에 같은 개수와 간격을 반복하거나 수를 두 배로 늘리지 않는다.
- 눈에 잘 읽히는 18~38dp 작은 구체와 44~64dp 연결용 구체를 섞어 크기 대비를 만든다. 8~14dp 빛은 보조로 사용한다.
- 일부를 화면 끝에서 살짝 안쪽으로 옮겨 패널 rim을 통과하는 모습을 보여준다. 중앙 약 64%는 계속 차분하게 유지한다.
- 한 화면에서 실제로 보이는 작은 구체 3~5개를 목표로 하되, 긴 섹션은 상단과 하단의 분포를 나눈다. 재배치 후에도 비는 구간에만 소수 추가한다.
- 작은 군집, 떨어진 단독 구체, 비대칭 대각 흐름을 번갈아 사용한다. Recent와 Health처럼 텍스트 중심인 구간은 더 조용하게 둔다.
- 기존 pearl 소재와 warm peach, ivory, blush의 색감을 사용한다. 새로운 흰색 대형 판, 단색 원, 과도한 반짝임이나 새 계절 색을 추가하지 않는다.

### 위치를 고정할 때의 구현 주의

현재 `zone`은 descriptor 분류값이고 실제 섹션 좌표를 측정한 anchor가 아니다. 버블의 세로 위치는 Hero 아래 전체 content 높이에 대한 백분율이다. 데이터로 섹션 높이가 바뀌면 특정 코너와의 관계가 달라질 수 있다.

다음 구현에서 정확한 전체 요약 우상단 배치를 유지하려면 기존 layout 흐름을 보존하면서 해당 섹션의 실제 좌표를 읽어 하나의 canvas에 전달해야 한다. 측정값이 바뀔 때만 갱신하며 scroll 이벤트마다 state를 갱신하지 않는다. 섹션별 배경 owner나 고정 기기 높이를 만들지 않는다. 이 구현은 아직 하지 않았다.

## 검증과 설치 이력

- Node 24.20.0, Yarn 3.6.4.
- 58%와 50% 각각 TypeScript, 대상 ESLint 오류 0개·경고 0개, 관련 6개 스위트 66개 테스트, git diff check 통과. 전체 테스트는 실행하지 않았다.
- 360dp, 400dp, 430dp Weather geometry와 action, single glass surface, non-interactive layer, Profile Edit 및 다른 계절 보존 계약 통과.
- 58% Release 1회, 설치 1회. APK SHA-256: `bcc8b6b240354732b6cdfa48815d27d3d5a1d3cc69cb8011819dd43ee499c761`.
- PO가 작업 중 투명도 추가 조정을 요청하여 50% Release 1회, 설치 1회를 별도로 진행했다. 자동 미세조정 반복이 아니라 새 지시에 따른 두 번째 시험이다.
- 현재 50% APK SHA-256: `1caa2a8c936c0d448eae3cf685bf8ee61d5efce2fbc6cf64a783104942fb7d3c`.
- 두 artifact 모두 서명 검증 ACCEPTED, `com.nuri.app`, versionName 1.0, versionCode 1, debuggable false, embedded JS bundle. Metro OFF, release Fast Refresh 없음.
- Device: Galaxy S24 `SM_S937N / R5CY613NMSY`, Android 16. 앱 데이터를 보존했다.
- 50% 후보의 Home 진입, Weather와 10개 하단 섹션 렌더, 전체 scroll, 날씨 상세 이동·복귀, Timeline 탭 이동·Home 복귀, 맨 위로 이동 확인.
- Hero의 비교 가능한 공통 label 44개 bounds가 70% 기준과 동일하다. 모든 섹션 전체 pixel 동일성 검증으로 확대 해석하지 않는다.
- 2026-09-30 13:13:20 KST 이후 확인 구간 NURI PID 20835의 Fatal, ANR, RN Fatal 0건. 확인한 화면에서 Red Screen, 새 gray outer field, 새 elevation artifact 또는 clipping 없음.
- 원격 DB, API, 정책 변경 없음. 이 표면-only 시험에 remote catalog 확인은 필요하지 않아 실행하지 않았다.

## 증적과 되돌림 경계

현재 50% 대표 화면:

- Weather와 Frequent: `/tmp/nuri-home-glass-50-20260930/01-weather-frequent-50.png`.
- 전체 요약: `/tmp/nuri-home-glass-50-20260930/02-summary-50.png`.
- Health, Today Tip, Diary: `/tmp/nuri-home-glass-50-20260930/03-health-tip-diary-50.png`.
- UI hierarchy와 로그: `/tmp/nuri-home-glass-50-20260930`.
- 58% 비교 자료: `/tmp/nuri-home-glass-58-20260930`.

70% 원본 표면 source·테스트와 APK는 `/tmp/nuri-home-glass-58-20260930/baseline`, 58% source·테스트와 APK는 `/tmp/nuri-home-glass-50-20260930/baseline`에 보존했다. 되돌릴 때는 이번 Home alpha 분기와 관련 테스트만 대상으로 하며 기존 dirty UI 및 배경 작업을 되돌리지 않는다.

Disk preflight: 58% 시작 43GiB, 50% 시작 42GiB로 healthy. 기존 source, 승인 APK, QA 증적 및 cache 삭제 없음. 이번 생성물은 QA 캡처·로그와 보존 APK이며 증적 보존을 위해 유지한다.

## 최종 상태와 다음 액션

- HEAD: `d2c93dab520fb19a85de1bd992c7e705b2e72c9f`.
- Branch: `codex/task6-community-content-policy`.
- 기존 dirty 보존. staging, commit, push 없음.
- 현재 Home 유리 채움: 50% 시험 후보. 최종 PO 승인 대기.
- 배경 버블: 직전 후보 그대로. 큰 버블 추가 및 하단 재배치는 분석안이며 미적용.
- 다음 액션: PO가 50% 재질과 위 버블 보완안의 적용 여부를 결정한다. 다음 수정과 다른 계절을 자동 시작하지 않는다.

PO 승인을 기다립니다.
