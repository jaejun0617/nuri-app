# NURI Community Hero Native Corrective Report

## 1. 작업 범위와 최종 판정

Galaxy S24에서 커뮤니티 히어로의 과도한 확대와 오른쪽 잘림을 재현했고, 실제 목록 너비로 이미지의 너비와 높이를 모두 명시하여 보완했다. 추가 증분 Release build 1회, 교체 설치 1회, 네 계절 native 재검증을 완료했다. 현재 후보는 `fa7fdaa8`이며 PO 시각 승인은 대기 중이다.

- 승인: PO의 `보완 후 빌드·설치·재검증 1회 진행`. 기기 사용 중 아님도 확인했다.
- 기준: PO 원본 PNG 4장, 실제 active CommunityList, 로컬 React Native Android Image 구현, S24 화면과 UI bounds. 정적 스타일 검증을 native 성공으로 대체하지 않는다.
- 사전 확인: engineering workflow/checklist/memory, project-memory 4개, Master routing, 직전 커뮤니티 보고서, frontend 규칙.
- 위험도: 낮음. 이번 corrective의 runtime 변경은 목록 화면과 스타일 2개 파일, 테스트 1개다. 앞선 미커밋 커뮤니티 구현과 무관한 dirty는 유지한다.
- 범위 밖: Auth, 온보딩, Weather, Weather API, 관리자, 서버, DB, moderation, 기존 저장/수정/삭제/이동 정책. 별도 remote 변경은 없다.

## 2. 원인과 이전 이후

React Native Android Image는 자산의 intrinsic `width`와 `height`를 caller style 앞에 넣는다. 최초 후보는 `width: '100%'`와 `aspectRatio`만 지정하여 자산 높이 439가 남았고, FlatList header의 너비도 확대됐다. `resizeMode="contain"`만으로 잘못된 프레임 크기를 교정할 수 없었다.

| 항목 | 최초 설치 `483f29e5` | 수정 설치 `fa7fdaa8` |
| --- | --- | --- |
| 화면 너비 | 1080px | 1080px |
| 히어로 native bounds | `[0,262][1080,1496]` | `[0,262][1080,799]` |
| 히어로 높이 | 1234px | 537px |
| 원본 비율에 따른 기대 높이 | 536.942px | 536.942px |
| 시각 결과 | 왼쪽 확대, 오른쪽 그림과 문구 잘림 | 전체 구도와 문구 표시 |
| 첫 화면 글 목록 | 첫 행 일부만 보임 | 기존 compact 3행 모두 보임 |
| 고정 pagination | `[0,1848][1080,2039]` | 같은 위치 유지 |

`CommunityListScreen.tsx`에서 목록 viewport의 유효한 실제 너비를 측정한다. 첫 layout 전에는 window 너비를 사용하고, 이후 너비와 `너비 / (883 / 439)` 높이를 함께 적용한다. 이미지 오류 fallback도 같은 크기를 사용한다. 0, 음수, NaN, Infinity layout 값은 반영하지 않는다. 스타일 파일의 percentage width를 제거했다.

원본 4장, 원본에 포함된 문구, 색, 아이콘, 필터, 게시글 행, pagination, callbacks는 이번 보완에서 변경하지 않았다. 기존 aspect 산술 테스트는 native intrinsic style merge를 잡지 못했다. 이번에는 실제 자산의 883×439 기본 스타일과 최종 caller style의 병합까지 검증한다.

## 3. 검증 결과

| 검증 | 결과 |
| --- | --- |
| TypeScript | PASS |
| 대상 ESLint | 0 errors, 0 warnings |
| 대상 테스트 | 8 suites, 112 tests PASS |
| 계절 목록 테스트 | 27 tests PASS |
| 전체 테스트 | 180 suites, 1,786 tests PASS, 이번 corrective에서 1회 실행 |
| Git diff check | PASS |
| 폭별 style contract | 360, 384, 400, 430, 768dp; intrinsic 크기 override, fallback, resize, invalid layout PASS |
| 원본 PNG 보존 | 4장 동일, 883×439 유지 |
| APK 이미지 | 4장 decoded pixels 동일 |

Native 확인은 S24 `SM-S937N`, serial `R5CY613NMSY`, 1080×2340, 450dpi, 384dp, fontScale 1.0에서 수행했다.

| 계절 | 실제 히어로 | 전체 문구와 그림 | 계절 이미지와 강조색 | footer |
| --- | --- | --- | --- | --- |
| 가을 | 1080×537px | 확인 | 확인 | 고정 위치 확인 |
| 겨울 | 1080×537px | 확인 | 확인 | 고정 위치 확인 |
| 봄 | 1080×537px | 확인 | 확인 | 고정 위치 확인 |
| 여름 | 1080×537px | 확인 | 확인 | 고정 위치 확인 |

- 기존 Home 계절 검토 버튼으로 확인한 뒤 원래 보이는 가을로 복귀했다. 커뮤니티 목록에서 종료했다.
- 목록 viewport 안에서 위로 스와이프 1회 후 footer 위치와 그림 유지 확인. 이번 3개 글은 모두 화면 안에 들어가 실제 스크롤 offset은 발생하지 않았다. 수정 후 긴 목록 overflow 스크롤은 미확인이다.
- 게시글 상세에는 들어가지 않았고, 저장/삭제/로그아웃/QA row 수정과 기기 설정 변경은 하지 않았다.
- 22:09:21~22:14:36 KST의 앱 PID 오류 및 앱 관련 ActivityManager 로그: FATAL 0, RN error lines 0, ANR 0. 로그를 지우지 않았다. 장기 안정성 판정은 아니다.
- 다른 기기 native, 확대 글꼴, 가로 화면, tablet, iOS는 미확인이다. bitmap 내부 글자는 fontScale과 독립적으로 확대되지 않는 기존 경계가 유지된다. native 대비를 정량 PASS로 판정하지 않는다.
- 첨부된 게시글이 현재 세 행에 없어 첨부 아이콘의 실제 표시와 이미지 오류 fallback native는 미확인이다. 관련 로컬 테스트는 PASS다.

## 4. Release와 설치

- 추가 증분 Release build 1회 PASS, 235.609초. 995 tasks 중 61 executed, 934 up-to-date. clean과 재빌드 없음.
- Release verifier, 서명, package, embedded bundle, source/input fingerprint MATCH. 문서만 build 이후 추가했다.
- 후보: `/private/tmp/nuri-community-hero-native-20261006-215829/nuri-community-seasonal-qa-fa7fdaa8.apk`, 273,463,954 bytes.
- SHA-256: `fa7fdaa8d152bf9ecac71115db66a02a94f42fc27780688ae560a941499ea4ce`.
- install-r 1회 PASS, 15.25초. 설치 base APK hash MATCH, UID `10402`, 최초 설치 `2026-06-02 19:16:57`, 화면 크기/밀도/fontScale 보존. uninstall과 clear-data 없음.
- `install.json`은 설치 직후 앱을 아직 열지 않은 시점의 기록이다. 이후 실행/터치/native 검증은 별도 `native-qa.json`과 캡처가 소유한다.

## 5. 증적과 보존

- 증적: `/private/tmp/nuri-community-hero-native-20261006-215829`.
- 전후: `baseline-tree.png/.xml`, `after-autumn.png/.xml`; 계절별 `after-winter`, `after-spring`, `after-summer`; 복귀 `after-autumn-restored`; 스와이프 `after-scroll`. bounds 측정 JSON을 함께 보존한다.
- `home-season-before.png`와 XML은 화면 전환 시점이 달라 검증 증적으로 사용하지 않는다. 이후 캡처는 UI idle dump 뒤 screenshot 순서로 통일했다.
- 테스트/build/install 로그, candidate/artifact JSON, native 로그, 최종 보존 결과를 유지한다. 기존 증적 루트는 수정하지 않았다.
- HEAD `aab0517e417d6dbc985d4e49af0942d34ae9b224`, branch `codex/task6-community-content-policy`. staged NONE, commit NO, push NO.
- 이전 CTA/Community APK, 새 APK, 원본/QA 데이터, unrelated dirty, Android build/.cxx/.gradle 및 cache 보존. cleanup NO, Store HOLD.
- 종료 hash 검사 PASS: 이번 수정 범위 밖 기존 1,560개 파일 동일, 문서 7개를 제외한 build 당시 1,563개 파일 동일. 문서 7개는 추가 block을 제거한 본문이 작업 전 원문과 정확히 같다. 이전 CTA/Community APK와 새 APK hash도 일치한다.
- 여유 공간은 시작 약 38.56GiB, 종료 약 37.40GiB다. 추가 후보/증적을 보존했으며 저장공간 정리는 진행하지 않았다.
- 기존 CTA의 빈 Timeline Primary 중복과 일정 상세 첫 진입 색 합성 문제는 별도 알려진 제한이며 이번에 해결한 것으로 기록하지 않는다.

## 6. 문서 반영

현재 상태, 핵심 결정, 다음 우선순위, 최근 로그, release-checklist, 리서치와 직전 커뮤니티 보고서에 이번 corrective block만 추가한다. 기존 본문은 유지하고, 최초 `483f29e5`의 히어로 native 수용 실패와 최신 `fa7fdaa8`의 S24 재검증을 구분한다. 관련 보존의 최종 판정은 `final-preservation.json`이 소유한다.

## 7. 다음 액션

PO가 현재 설치 후보의 히어로 크기와 전체 구도, 목록 밀도, 고정 pagination을 시각 검토한다. 승인 전 commit/push, 추가 build/install, cleanup, Store 및 다음 디자인은 자동 시작하지 않는다.

PO 승인을 기다립니다.
