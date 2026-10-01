# NURI Home Today Tip, Recent Records, Community Candidate

## Git·Safe Cleanup 종료 결과

- `PO_VISUAL_APPROVAL: APPROVED`. 승인 변경 46개 파일을 `44284adff5454676268db6bc6f62a6b36b7f2f2a`로 commit하고 `codex/task6-community-content-policy`에 push했다. 실제 원격 SHA 일치·ahead/behind 0/0을 확인했다.
- 이번 종료 전 20개 스위트 275개 테스트 PASS. 승인된 source·asset·test·toolchain 입력 809개 hash 동일. 공유 문서 이전 dirty hunk·Supabase CLI metadata·무관한 자산·output은 제외·보존했다.
- push 이후 아래 exact-path Git-ignored NURI 산출물 네 곳만 정리했다. 모두 tracked file·open file 0개이며 10GiB 미만인 재생성 경로다. current evidence APK는 별도 보호 위치에서 세 hash를 확인했다.

| 삭제 경로 | allocated 크기 |
| --- | ---: |
| `android/app/build` | 3,235,120KiB |
| `android/app/.cxx` | 404,616KiB |
| `android/build` | 200KiB |
| `android/.gradle` | 41,976KiB |
| 합계 | 3,681,912KiB = 3.51GiB |

- Data volume available은 51,128,292→54,258,604KiB, 48.76→51.75GiB다. 실제 여유 공간 증가는 3,130,312KiB = 2.99GiB다. APFS 공유·동시 앱 활동으로 삭제 경로의 allocated 합계와 실제 free 증가량은 다를 수 있다.
- 정리 전후 프로젝트 파일 1,353개·기존 QA 파일 5,466개 hash 동일, required source·asset·QA 손실 0개, cleanup Git delta 0. 최신 `ca7d2751`, 직전 `45d0b72b`, 이전 안정 `84961478` APK는 보존한다.
- signing·keystore·wrapper·SDK·node_modules·전역 dependency cache·개인 파일·시스템 관리 공간·기존 Watchman은 삭제하거나 종료하지 않았다. Metro OFF·Fast Refresh OFF, 실행 중인 Gradle build 없음.
- 계절 버튼 유지. 이번 종료의 추가 앱 변경·build·install·기기 실행·터치·스크롤·캡처는 0회다. native runtime·bitmap 메모리·스크롤 성능 미확인을 PO 시각 승인과 구분한다.
- 이 종료 기록은 문서만 후속 commit·push한다. 증적: `/tmp/nuri-tip-recent-community-20261001/git-closeout`의 `baseline.json`, `stage.json`, `tests.json`, `tests.log`, `cleanup.json`, `final.json`.
- 다음 후보: 반응형·bitmap 성능 검증, 오늘 한장 실제 사진 상태, 커뮤니티 실제 게시글의 정보 위계, 일정·건강 실제 활동 목록. PO 선택 전에는 자동 시작하지 않는다. 아래 실행 예정은 종료 전 이력이다.

## 최종 PO 승인과 Git 종료 계약

- PO가 최신 `ca7d2751` 설치 후보와 Recent 그림 크기·위치 corrective를 최종 승인했다. `PO_VISUAL_APPROVAL: APPROVED`다. 아래 후보의 pending 표시는 당시 이력이다.
- 승인된 세 섹션·PNG 28개·실제 데이터와 기존 action·구체·별빛을 그대로 고정한다. 네 계절 버튼을 유지하며 추가 source 수정·build·install·기기 실행·터치·스크롤·캡처는 하지 않는다.
- latest approved source·asset·test·toolchain 입력 809개 hash 동일, 관련 20개 스위트 275개 테스트 PASS 증적을 확인했다. 실제 자동 runtime·native 측정·bitmap 메모리·스크롤 성능은 미확인으로 남긴다.
- 이번 승인 source·asset·test·문서 기록만 기존 브랜치에 선별 commit·push한다. 공유 문서의 이전 dirty hunk·Supabase metadata·무관한 자산·output은 제외하고 working file 본문도 보존한다.
- push 검증 후 Git-ignored Android build/native/project-local cache만 정리한다. 최신 `ca7d2751`, 직전 `45d0b72b`, 이전 승인 안정 `84961478` APK와 모든 기존 QA 증적·source·asset·toolchain·개인 데이터는 보존한다.
- Git·cleanup 전후 측정과 보존 결과: `/tmp/nuri-tip-recent-community-20261001/git-closeout`. 추가 리디자인은 자동 시작하지 않는다.

## 최신 후보: 최근 기록 그림 크기·위치 Corrective

- 후속 PO 피드백은 Recent 그림이 작고 오른쪽에 붙어 있다는 두 항목뿐이다. 이미지 원본·문구·버튼·Tip·Community·다른 섹션·배경은 변경하지 않았다.
- `HomeEditorialArtwork.tsx`의 Recent 표시만 20% 확대한다. frame 폭 37.5%·최대 135dp·aspectRatio 1.25로 기존 slot 높이를 유지하고 오른쪽 여유 16dp를 둔다. 가로 배치 360~430dp에서 중심이 약 27.25~29.5dp 왼쪽으로 이동한다.
- Image는 폭 96%·높이 120%·top -10%·left 2%다. 그림 틀의 overflow만 visible로 설정하고 확보한 가로 영역 안에서 표시한다. 최대 세로 돌출 10.8dp는 기존 문구 gap 12dp·CTA gap 14dp 안에 들어간다. 텍스트와 섹션 전체 높이는 fixed height로 제한하지 않는다.
- 위 수치는 소스와 실제 PNG alpha bounds 계산이며 최신 native section 높이 측정은 아니다. 큰 글꼴의 기존 세로 배치는 유지한다.
- TypeScript PASS, 이번 수정 source·test ESLint 오류 0·경고 0, 관련 20개 스위트 275개 테스트·diff check PASS. 기존 전체 범위 lint 경고 19개는 이전 검증 기록으로 보존한다.
- PO가 후속 검토용 QA Release·install 각 1회를 추가 승인했다. 이번 corrective 각 1회 완료, 작업 누적 각 2회. Build 4m 4s·verifier ACCEPTED·install Success다.
- 최신 APK: `/tmp/nuri-tip-recent-community-20261001/recent-art-corrective/nuri-recent-art-corrective-ca7d2751.apk`
- SHA-256: `ca7d2751f70ac7d7ff4ca85c6ec0501bcb0e7a831330c35327cd3e872800821e`
- Size: 227,500,280 bytes. Build timestamp: `2026-10-01 23:23:19 +0900`.
- source·asset·test·toolchain 809개 build 전후 hash 동일, 기존 프로젝트 1,353개 중 corrective 범위 밖 변경·누락 0개. 문서에는 이번 결과 block만 추가하며 기존 본문을 보존한다.
- 새 APK의 PNG 28개를 resource table에서 확인하고 디코드 픽셀이 직전 후보와 동일함을 확인했다. 직전 `45d0b72b` 후보와 이전 PO 승인 `84961478` APK는 보존한다.
- Evidence: `/tmp/nuri-tip-recent-community-20261001/recent-art-corrective`의 `baseline.json`, `geometry-audit.json`, `types.log`, `eslint.json`, `tests.json`, `build.log`, `release-result.json`, `install.log`, `install-result.json`, `post-build-preservation.json`.
- 계절 버튼 유지, 설치 외 기기 실행·터치·스크롤·캡처 없음. 최신 native 합성·runtime·성능은 미확인이고 최종 PO 승인은 대기다. staging·commit·push·cleanup·추가 자동 작업 없음. 아래는 최초 `45d0b72b` 후보 이력이다.

## 1. 작업 범위와 상태

- PO 요청: 오늘의 팁 네 계절 시안을 구현하고 최근 기록·커뮤니티 빈 상태의 네 계절 시안 8장을 생성한 뒤 구현한다. 커뮤니티는 인기·질문·정보·일상·자유 각각 다른 그림을 사용한다.
- 구현과 로컬 검증, 승인 QA Release·설치 각 1회 완료. 최종 PO 시각 승인은 대기다.
- 실제 기준: 현재 Home source와 승인 공통 유리·배경·foreground, 생성 시안. 시안은 표현 기준이며 실제 데이터와 기능의 source of truth는 기존 코드다.
- HEAD: `255f3e33a94fa9269146364f4918cd577906b468`
- Branch: `codex/task6-community-content-policy`
- 계절 검토 버튼은 유지한다. 설치 외 기기 실행·터치·스크롤·캡처는 하지 않았다.
- staging·commit·push·cleanup·다음 작업 자동 실행 없음. Supabase·서버·정책·전역 테마·native dependency 변경 없음.

## 2. 이미지와 디자인

시안 위치:

- 오늘의 팁 4장: `output/design/nuri-home-today-tip-four-seasons-20261001`
- 최근 기록 4장·커뮤니티 인기 4장: `output/design/nuri-home-recent-community-four-seasons-20261001`
- 각 폴더의 `generation-manifest.json`에 원본과 생성 지시를 기록한다.

실제 투명 그림: `src/assets/seasonal/home/editorial`의 PNG 28개와 `generation-manifest.json`.

| 대상 | 그림 구성 | 계절별 수 |
| --- | --- | ---: |
| 오늘의 팁 | 유리 메모·소리 표현·heart | 4 |
| 최근 기록 빈 상태 | 빈 유리 기록지·bookmark·pen | 4 |
| 커뮤니티 인기 | 두 말풍선·heart·작은 pearl | 4 |
| 커뮤니티 질문 | 물음표 말풍선·lightbulb | 4 |
| 커뮤니티 정보 | 정보 표시·파란 정보 선·유리 말풍선 | 4 |
| 커뮤니티 일상 | 빈 추억 frame·sun·heart 말풍선 | 4 |
| 커뮤니티 자유 | 별 말풍선·작은 분홍 구체 | 4 |

- built-in image_gen으로 생성한 원본을 보존한다. AI 편집으로 기존 사용자 사진이나 UI를 변경하지 않았다.
- 가을 peach·amber, 겨울 ice blue·lilac, 봄 pink, 여름 aqua 계열이다. 탭별 그림은 색만 바꾼 동일 파일이 아니라 서로 다른 주제를 가진다.
- PNG 28개의 SHA-256은 모두 다르며 genuine RGBA를 확인했다. 전체 PNG 크기 48,118,739 bytes, 약 45.89MiB다.
- Tip·Recent 원본은 1254×1254, Community 원본은 1536×1024다. 투명 픽셀 비율은 약 40.7~64.3%다.

## 3. 구현과 보존

- `HomeEditorialArtwork.tsx`: 7종·4계절의 정적 require map과 레이아웃 소유 frame. Image는 absolute·contain이며 원본 높이가 섹션 높이를 결정하지 않는다. 장식은 pointerEvents none·접근성 숨김이다.
- Tip·Recent frame은 폭 30%·최대 108dp·aspectRatio 1, Community frame은 폭 62%·최대 190dp·aspectRatio 1.5다. 섹션 전체 fixed height와 텍스트 줄 제한은 두지 않는다.
- `HomeEditorialStates.tsx`: Tip은 핵심 문장·메모·divider·기존 설명으로 구성한다. Recent confirmed-empty는 기존 작성 action과 아이콘 없는 중앙 정렬 기록하기를 유지한다. Community는 선택 탭의 그림과 기존 문구를 보여준다.
- Tip·Recent는 350dp 미만 또는 fontScale 1.3 이상에서 세로 배치한다. 작은 폭·확대 글꼴에서도 문구를 잘라 감추지 않는다.
- Recent는 ready와 preview 0개일 때만 빈 그림을 보여준다. loading·refreshing·loadingMore와 error는 별도 안내다. 기록이 있는 기존 row는 변경하지 않았다.
- Community의 요청·캐시·순서·stale 응답 차단·실제 게시글·반응·상세 진입·loading·retry는 유지한다. 빈 preview는 전체 게시판이 비었다는 증거가 아니므로 기존 전체 보기 action을 보존한다.
- 세 대상의 section anchor에서만 구체와 별빛을 보완했다. 대상당 edge-cropped 구체 2개·medium 1개·small 2개·별빛 3개다. 단일 measured canvas, static descriptor와 touch 차단을 유지한다.
- Hero·날씨·자주 쓰는 기록·전체 요약·사진·추천 팁·일정·건강·일기·outer glass·Bottom Navigation은 변경하지 않았다. 전체 배경 색을 다시 설계하지 않았다.
- 새 그림과 본문에는 별도 backing card·BlurView·elevation·drop shadow를 추가하지 않았다. 기록하기 elevation·shadowOpacity는 0이다.

## 4. 검증

| 항목 | 실제 결과 |
| --- | --- |
| Node | 24.20.0 |
| Yarn | 3.6.4 |
| TypeScript | PASS |
| Targeted ESLint | 오류 0·새 경고 0·기존 경고 19개 |
| Relevant targeted tests | 20개 스위트·271개 테스트 PASS |
| git diff --check | PASS |
| QA Release | 1회·4m 37s·BUILD SUCCESSFUL |
| Static APK verifier | ACCEPTED·서명 일치·debuggable false·cleartext false·JS bundle 포함 |
| Galaxy S24 install -r | 1회·Success |

- HEAD 기준 대상 lint에는 기존 no-shadow 경고 20개가 있다. 이전 Tip 선언 제거 후 19개이며 새 파일·테스트의 경고는 0개다. 위치 숫자를 정규화하되 rule·이름·메시지를 유지해 비교했다. 기존 경고를 숨기거나 전역 lint 규칙을 완화하지 않았다.
- 테스트는 네 계절과 다섯 탭 전환, 서로 다른 28개 source, transparent asset hash, 작성 callback, loading/error 분리, 320/360/400/430dp frame, 확대 글꼴 세로 배치, 기존 Home 데이터·배경·계절 버튼 계약을 포함한다. Full test는 실행하지 않았다.
- 추가 검증 중 raw PNG RGBA hash는 Android 최적화로 일치하지 않았다. 실제 원인은 alpha 0 픽셀의 보이지 않는 RGB 정규화다. resource table로 28개 그림의 축약된 파일 경로를 해석한 뒤 모든 alpha 값과 alpha가 0보다 큰 픽셀의 RGB가 원본과 동일함을 확인했다. 차이를 무시한 시각 승인으로 취급하지 않는다.

## 5. 설치 후보와 증적

- Device: Galaxy S24, `SM_S937N`, `R5CY613NMSY`
- Application: `com.nuri.app`, versionName `1.0`, versionCode `1`, QA release
- Build timestamp: `2026-10-01 23:02:23 +0900`
- APK: `/tmp/nuri-tip-recent-community-20261001/nuri-tip-recent-community-candidate-45d0b72b.apk`
- SHA-256: `45d0b72b2105b4416c486a3cb38de9f62b1c5c96b4706d2ee4f81425c1b76fea`
- Size: 227,507,500 bytes, 약 216.97MiB. 직전 승인 APK보다 약 33.29MiB 크다.
- Evidence root: `/tmp/nuri-tip-recent-community-20261001`
- 주요 증적: `baseline.json`, `asset-audit.json`, `types-final.log`, `eslint-comparison.json`, `tests-final.json`, `build.log`, `release-result.json`, `apk-resources.txt`, `install.log`, `install-result.json`, `home-owner-preservation.json`, `pre-build-preservation.json`, `post-build-preservation.json`, `final-preservation.json`.

## 6. 보존과 검증 경계

- 빌드 전후 source·asset·test·toolchain 입력 809개 hash 동일. 기존 프로젝트 파일 1,311개 중 요청 범위 밖 변경·누락은 0개다.
- Home의 기존 named block 40개 중 변경 대상 네 개를 제외한 36개가 그대로다. Tip copy와 표현을 추출하고 Recent empty 표현과 세 섹션의 계절 prop만 연결했다.
- HEAD·branch·staged 상태 동일. 기존 dirty 문서 본문·리서치·CLI metadata·무관한 자산·산출물은 보존한다. 문서에는 이번 후보 block만 앞에 추가한다.
- 이전 승인 APK `/tmp/nuri-summary-four-season-20261001/nuri-total-summary-candidate-84961478.apk`의 기존 hash와 파일을 보존했다.
- 앱 uninstall·데이터 초기화·fixture·계정·기기 설정 변경 없음. 설치 외 adb 동작은 연결 목록 확인뿐이다.
- 최신 native section 높이·화면 합성·가독성·터치·메모리·스크롤 성능·Fatal·ANR·RN Fatal은 미확인이다. 사용자 기기 조작 중단 계약을 따랐으며 로컬 테스트와 설치 성공을 실기기 UX 검증으로 표현하지 않는다.
- 28개 bitmap의 다운로드 크기 비용은 실제로 증가했다. 승인된 시각을 임의 압축·재색칠하지 않았으며, 실제 디코드 peak memory는 측정하지 않았다. 최종 시각 확인과 성능 확인을 별개로 관리한다.
- Metro 8081 listener·Gradle daemon은 종료 시 없으며 Fast Refresh는 Release에서 OFF다. Watchman PID `43589`는 `2026-09-27 14:32:42`부터 실행 중인 기존 공유 서비스로 확인해 종료하지 않았다. 이번 작업에서 별도 개발 server·watcher를 시작하지 않았다.

## 7. PO 직접 확인

1. 기존 상단 계절 버튼으로 세 섹션의 네 계절 그림과 배경 연결을 확인한다.
2. 커뮤니티 다섯 탭의 빈 상태에서 각각 다른 주제와 색조가 보이는지 확인한다.
3. 오늘의 팁은 핵심 문장이 먼저 보이고, Recent는 기존 기록하기로 진입하는지 확인한다.
4. 그림이 지나치게 작거나 섹션이 과도하게 길지 않은지, 헤더·본문·버튼과 구체·별빛이 겹치지 않는지 확인한다.
5. 실제 기록·게시글이 있는 화면과 로딩·오류가 빈 그림으로 잘못 대체되지 않는지 확인한다.

위 체크리스트는 후보 검토 당시 항목이며 PO 최종 승인은 수신했다. 다음은 종료 결과 보고 후 PO의 새 지시 대기다.
