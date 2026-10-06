# NURI Community Winter Spring Summer Verification Report

작성일: 2026-10-07 KST. 첨부된 겨울·봄·여름 원본을 가을 승인 구조로 제공하는 계약과 Galaxy S24 실제 표시를 확인했다. 세 계절의 PO 시각 승인은 대기한다.

## 1. 착수와 판단

- 작업 유형: 기존 계절 이미지 연결 확인, 회귀 테스트 보강, native QA. 현재 사용자 지시로 수행하며 별도 구조 변경은 없다. 위험도 Low.
- 시작·현재 HEAD: `6afb4655ab1def3ecd9d3b8e94116901d9a088a3`, branch `codex/task6-community-content-policy`.
- Engineering 3문서·project-memory 4문서·routing 정책·가을 동결 보고서·실제 Community source를 확인했다. 동일 작업실에서 순차 수행했다.
- 첨부 세 PNG는 현재 `src/assets/seasonal/community/{winter,spring,summer}.png`와 각각 SHA256가 완전히 같았다. 세 계절 연결은 이미 구현 커밋 `0c075cc`에 포함되어 있다. 가을 승인 때 다른 계절의 최종 native QA를 닫지는 않았으므로 이번에 실제 표시를 검증했다.
- 새로 이미지를 복사하거나 runtime을 재작성할 이유가 없다. 수정은 테스트 1파일과 상태·로그·본 보고서 3문서로 제한했다. DB·서비스·navigation·가을 layout 변경은 없다.

## 2. 이전과 이번 결과

| 대상 | 이전 | 이번 결과 |
| --- | --- | --- |
| 겨울·봄·여름 원본 | 883×439 PNG와 계절 분기가 이미 포함됨 | 새 첨부와 byte-for-byte 일치 확인, 원본 유지 |
| 히어로 구조 | 가을에서 승인된 공통 너비 비례 구조 | 세 계절 모두 동일 native 크기·시작점 확인 |
| 계절 accent | effectiveSeason 기반 기존 팔레트 | 겨울 `#3B6398`, 봄 `#B84066`, 여름 `#247264` 실기기 픽셀 확인 |
| 원본 보호 테스트 | 서로 다른 네 장·크기 확인 | 새 첨부 3장의 정확한 SHA256 보호 테스트 추가 |
| 계절 전환 테스트 | 각 계절 source·accent 확인 | 겨울→봄→여름→가을 전환 중 page/filter/30개/게시글/geometry 보존 테스트 추가 |
| 설치 | 승인 후보 `4d46d0bb` | 동일 APK를 재사용해 실기기 확인, 추가 build/install 0회 |

## 3. Galaxy S24 결과

- 기기 SM-S937N, 1080×2340px, 450dpi, 384dp, fontScale 1.0. 세 계절의 상단과 마지막 게시글·footer 캡처 총 6장을 직접 시각 확인했다.
- 모두 hero bounds `[0,93][1080,630]`, 실제 1080×537px. 상태 표시줄 아래 시작, 가을과 같은 883:439 원본 비율이다. 가로 확대·잘림·문구 중복·별도 상단 공백 없음.
- 가을 승인과 동일하게 원본 아래 29px 비례 전경만 흰 패널로 덮는다. 문구와 주요 피사체를 보존하고 흰 목록·카테고리 고유 색을 유지한다.
- 작성 FAB의 원색 픽셀은 각 승인 계절 token과 정확히 같고 plus 중심은 `#FFFFFF`다. 작성/맨 위로/페이지 이동/Bottom Navigation 서로의 버튼 영역은 겹치지 않는다. 기존 맨 위로 overlay가 행 오른쪽 일부를 가리는 경계는 변경하지 않았다.
- 첫 페이지의 마지막 행→pagination 약12.09dp, pagination→Bottom Navigation 16dp. 이전 disabled·다음 enabled, 중앙 페이지 번호·footer 구조 유지.
- Home 계절 검토 버튼으로 겨울→봄→여름→가을을 선택했다. 마지막에는 화면상 가을 선택과 Community 전체/전체/30개/1페이지/맨 위를 복구했다. 로컬 override의 기존 null/explicit 구분은 별도로 읽지 않았으며 visible season 복구와 구분한다.
- 03:54:19~04:03:01 KST bounded 로그 FATAL 0, ANR 0, RN_FATAL 0. raw 로그는 저장하지 않았다.
- 다른 기기·iOS·이번 새 360/430dp 확대 글꼴 native matrix는 미실행이다. 360/384/400/430/768dp 비율은 기존·보강 테스트 범위다.

대표 캡처: [겨울](/private/tmp/nuri-community-three-seasons-20261007-035600/winter-top.png), [봄](/private/tmp/nuri-community-three-seasons-20261007-035600/spring-top.png), [여름](/private/tmp/nuri-community-three-seasons-20261007-035600/summer-top.png).

## 4. 검증과 보존

- TypeScript PASS. Community source/스타일/계절 계약/테스트 lint 0 errors / 0 warnings. 통합 lint의 기존 Timeline no-shadow 경고 2개는 baseline 대조 후 보존했다.
- 대상 13 suites / 317 tests PASS, 추가 테스트 4건. `git diff --check` PASS. runtime 변경이 없어 full suite를 반복하지 않았다. 이전 CI 전체 통과를 이번 전체 재실행으로 표시하지 않는다.
- 설치 APK SHA256 `4d46d0bb7cfffe17f12e4ded3eae25a385109c5280456e916a12e6ed56e7deb9`와 직전 candidate 증적 일치. 패키지 내부 세 원본의 decoded pixels 일치 증적을 동일 artifact에 한정해 재사용한다. UID·최초 설치·화면 크기·density·fontScale 그대로 유지했다.
- 새 build/install/uninstall/clear-data/Metro/Fast Refresh 없음. APK는 기존 Timeline 후보까지 포함한 디자인 검토 설치본이며 clean Store RC가 아니다.
- QA 게시글·실제 콘텐츠 저장·삭제·게시글 상세 열기·조회수 변경 동작·로그아웃·계정 변경·SQL mutation 없음. QA100을 제거하거나 다시 생성하지 않았다. 이번 remote 전체 행 hash 재감사는 미실행이다.
- Auth/Weather/API source 및 기존 dirty·자산·증적·APK·Android build/.cxx/.gradle·Gradle cache 보존. cleanup/Store 없음. 기존 문서 본문은 그대로 두고 이번 상태 블록만 추가했다.

## 5. 최종 상태

- WINTER_SPRING_SUMMER_HERO: IMPLEMENTED_NATIVE_VERIFIED_PENDING_PO_APPROVAL.
- COMMUNITY_AUTUMN_DESIGN: COMPLETE_FROZEN. AUTH/WEATHER/API: COMPLETE_FROZEN.
- STAGED: NONE. COMMIT: NO. PUSH: NO. CLEANUP: NO. STORE: HOLD.
- 다음 액션은 PO 겨울·봄·여름 시각 검토 1개다. 다음 디자인 작업 자동 시작은 없다.

Evidence root: `/private/tmp/nuri-community-three-seasons-20261007-035600`. `assets.json`, `native-validation.json`, `native-log-summary.json`, `preservation.json`, 타입/lint/테스트 결과와 실제 캡처가 각 검증을 소유한다.

PO 승인을 기다립니다.
