# NURI Community Seasonal List Design Report
<!-- NURI_COMMUNITY_HERO_CORRECTIVE_20261006_BEGIN -->
## 2026-10-06 히어로 native 보완으로 대체된 설치 후보

- 아래 내용은 최초 설치 `483f29e5`의 구현·로컬 검증 이력이다. 이후 PO 요청으로 실기기에서 1234px 높이의 확대·잘림을 재현했으므로 원본 비율 설명을 최초 후보의 native PASS로 해석하지 않는다.
- RN Image의 intrinsic 크기를 둘 다 덮도록 실제 목록 너비와 산출 높이를 명시했다. 추가 build/install-r 각 1회로 최신 후보 `fa7fdaa8`을 설치했고, S24 기본 384dp/fontScale 1.0의 네 계절 모두 1080×537px, 전체 문구/그림, 고정 footer를 확인했다.
- 타입/lint 0 errors/0 warnings, 대상 8 suites/112 tests, 전체 180 suites/1,786 tests PASS. 확대 글꼴/다른 기기/iOS·긴 목록 overflow는 미확인이다. 현재 PO 승인 대기, staged/commit/push/cleanup 없음.
- 최신 source of truth: `docs/qa/nuri-community-hero-native-corrective-2026-10-06.md`. 최초 APK와 아래 이력·기존 증적은 보존한다.
<!-- NURI_COMMUNITY_HERO_CORRECTIVE_20261006_END -->


## 1. 작업 범위와 판정

- 작업 유형: 승인 시안 기반 커뮤니티 목록 presentation 변경과 Android Release 설치 후보 제출.
- 최신 기준: PO가 제공한 커뮤니티 시안, 가을/겨울/봄/여름 원본 PNG, 실제 active CommunityList/PostCard, 전역 effectiveSeason 및 승인된 CTA 팔레트.
- 사용자 승인 범위: 구현, 로컬 검증, Release build 1회, Galaxy S24 교체 설치 1회. 물리 화면 검증은 PO가 직접 수행한다.
- source는 구현 완료, 설치 후보는 반영 완료다. PO 시각 승인과 모든 기기 native 검증은 아직 완료되지 않았다.
- routing 범위: 커뮤니티 디자인 단일 작업. 서버, moderation, 데이터 계약, 다른 디자인 작업은 활성화하지 않았다.
- 사전 확인: engineering workflow/checklist/memory, project-memory 4개 문서, Master routing, 기존 커뮤니티 QA 자료, frontend 규칙. 새로운 Supabase 작업은 없다.
- 수정 범위: runtime 8개 파일(신규 2개 포함), 새 테스트 1개, 새 이미지 4개, 기존 문서 6개에 이력 추가, 이 보고서 1개.
- 위험도: 중간. 목록 화면의 scrolling과 고정 footer, 공용 navigator의 toolbar 높이 전달이 영향을 받는다. toolbar 자체의 외형과 다른 화면 레이아웃은 변경하지 않는다.

## 2. 이전과 이후

| 대상 | 이전 실제 구현 | 이번 설치 후보 |
| --- | --- | --- |
| 히어로 | 계절 이미지 히어로 없음 | PO 원본 4장 중 전역 계절에 맞는 1장 표시 |
| 글쓰기 진입 | 상단 작성 아이콘 | 상단 `글쓰기` 텍스트 CTA, 기존 작성 허용 조건 유지 |
| 주요 탭 | 기존 전체/인기글/공지와 underline | 동작 유지, 선택 글자와 underline은 계절색 |
| 카테고리 필터 | 기존 underline 기반 표시 | 선택 solid 계절색, 비선택 회색 pill |
| 게시글 분류 | 제목 앞 분류와 메타에 분류 반복 | 제목 앞 작은 분류 chip 한 번만 표시 |
| 이미지 첨부 | 작은 이미지/텍스트 유형 아이콘 | 첨부된 경우에만 `image-outline`, 일반 글 아이콘 제거 |
| 행 높이 | compact 행, 기본 최소 62dp | 최소 62dp 유지, 큰 썸네일/시안의 높은 카드로 확대하지 않음 |
| 목록 배경 | 기존 theme 의존 일부 색 | 히어로 아래 흰색, 회색 구분선과 읽기용 진한 글자 |
| 페이지 이동 | FlatList footer로 목록과 함께 스크롤 | FlatList 밖의 고정 영역, 실제 하단 toolbar 높이 위에 배치 |
| 강조색 | 목록의 사용자 theme accent | 전역 effectiveSeason 기반 4계절 action palette |

원래 목록에도 사진 썸네일 영역은 없었다. 이번에는 시안의 큰 사진 영역을 새로 만들지 않고 기존 compact 구조를 보존했다. 사용자 게시글 제목/본문/닉네임/날짜/메모 및 QA 데이터 문구는 수정하지 않았다.

## 3. 히어로 이미지 계약

- 원본 위치: `/Users/shinjaejun/Desktop/시안/스플래시화면/커뮤니티 히어로섹션/`의 `가을.png`, `겨울.png`, `봄.png`, `여름.png`.
- repo 자산: `src/assets/seasonal/community/`의 `autumn.png`, `winter.png`, `spring.png`, `summer.png`.
- 4장 모두 883 × 439px. 원본을 byte-identical 복사했으며 총 2,650,803 bytes다. 이미지 생성, 재색칠, 글자 덮어쓰기, 원본 수정은 없다.
- 화면 너비 100%, `aspectRatio: 883 / 439`, `resizeMode="contain"`. 전체 그림을 잘라내거나 늘리지 않는다. 360/384/400/430/768dp에서 산출 높이는 약 179.0/190.9/198.9/213.8/381.8dp다.
- 기존 native 상단 제목 영역을 유지하며 그 아래 히어로를 표시한다. 이미지와 tabs/categories는 ListHeaderComponent라 목록과 함께 스크롤된다. pagination만 고정이다.
- 그림에 한국어 문구가 이미 포함되어 있어 같은 문구를 live text로 중복 배치하지 않는다. 접근성에는 별도 이미지 설명을 제공한다. 이미지 로딩 실패는 명시적인 fallback 문구로 처리한다.
- APK 최적화가 PNG를 재압축하고 리소스 경로를 단축했다. `aapt2` resource table로 가을 `res/aT.png`, 겨울 `res/q7.png`, 봄 `res/IG.png`, 여름 `res/yG.png`를 확인하고 원본과 decoded bitmap pixels 동일성을 검증했다.
- 이 구조는 원본의 전체 구도를 보존하지만 bitmap 안의 글자는 시스템 글꼴 확대와 독립적으로 커지지 않는다. 작은 폭의 실제 가독성은 PO 확인 대상이다. 모든 기기 화면에서 QA 완료라는 판정은 하지 않는다.

## 4. 팔레트와 레이아웃

| 계절 | 선택 chip/underline/목록 accent | 흰색 글자 solid 계산 대비 |
| --- | --- | --- |
| 가을 | `#B95000` | 4.99:1 |
| 겨울 | `#3B6398` | 6.13:1 |
| 봄 | `#B84066` | 5.30:1 |
| 여름 | `#247264` | 5.73:1 |

- 비선택 chip: `#F1F3F6` 배경, `#566271` 글자. 계산 대비 5.59:1. 본문 `#243042`/white 13.32:1.
- 기존 SEASON_CTA를 재사용한다. 화면별 계절 계산이나 사용자 pet theme를 Primary 대체색으로 쓰지 않는다. 하단 내비게이션의 사용자 개인화는 보존한다.
- category touch minHeight 44dp, pagination CtaButton의 공용 최소 48dp, 자연 높이 적용. 긴 문구는 수평 category scrolling을 사용하며 글자 축소로 끼워 넣지 않는다.
- toolbar `onLayout`의 실제 높이를 opt-in context로 전달한다. CommunityList만 소비하며 별도 root 진입에서는 bottom safe inset을 사용한다. 기존 Home 재선택, tab 이동, More drawer 경로를 보존한다.
- pagination은 목록 밖에 둔다. 요청 중/빈 목록/이동할 페이지 없음에서는 이전·다음 비활성 상태를 유지한다. page-size 선택, 페이지 변경 후 맨 위 이동, 당겨 새로고침, 기존 맨 위 버튼을 유지한다.
- 공지는 기존 의미와 작은 pin badge를 보존한다. 서버 공지 게시글과 일반 카테고리를 합성하거나 사용자 글을 공지로 승격하지 않는다. 공지 탭의 카테고리 필터 숨김과 전체 탭에서만 작성 가능한 기존 정책도 유지한다.
- 조회/추천/댓글 값은 기존 서버 응답 그대로다. 시안의 하트 영역을 새로운 client-only 추천 기능으로 만들지 않았다.

## 5. 로컬 검증

| 검증 | 최종 결과 |
| --- | --- |
| TypeScript | PASS |
| 대상 ESLint | 0 errors / 0 warnings |
| 대상 테스트 | 8 suites / 106 tests PASS |
| 새 계절 목록 테스트 | 21 tests PASS |
| 전체 테스트 | 180 suites / 1,780 tests PASS |
| Git diff whitespace 검사 | PASS |
| 원본과 repo 이미지 | 4장 byte-identical |
| 원본과 APK 이미지 | 4장 decoded pixels identical |
| 보호 파일 비교, 문서 추가 직전 | 범위 밖 tracked 1,453개 동일 |

- 새 테스트는 네 계절의 실제 screen render, petTheme 분리, hero/gray chips, category 중복 제거, 첨부 표시/접근성, 고정 pagination/toolbar 높이/standalone inset, 로딩/오류/빈 상태, image error, 페이지·필터·쓰기·refresh callbacks를 확인한다.
- 폭별 aspect-ratio 산술 검증과 React Native component/style 검증은 native pixel rendering과 별개다. 실제 큰 글꼴/가로 모드/태블릿/iOS는 미확인이다.
- 전체 테스트 총 2회. 첫 실행은 navigator formatting으로 기존 Home 재선택 source guard의 문자열 비교 1개가 실패했다. 원래 한 줄 emit 표현을 복구했으며 기능 변경 없이 두 번째 전체 실행이 PASS다. 최초 실패 증적도 보존했다.
- 서버/remote/DB/RPC/RLS/Storage/Edge/Auth 운영 변경 및 remote smoke는 이번 범위가 아니며 수행하지 않았다.

## 6. Release와 설치

- 증분 Release `assembleRelease` 1회 PASS, 측정 811.931초(약 13분 32초). 995 tasks 중 873 executed / 112 from cache / 10 up-to-date.
- 이전 승인된 저장공간 정리로 native 생성물이 제거되어 상당수 작업을 재생성했다. 새 `clean` 또는 두 번째 build는 실행하지 않았다.
- signer/package/non-debuggable/embedded bundle 등 기존 Release verifier PASS. 서명 SHA-256 `08efb41ea4729792ce9fc3d242be9704e84a8ea3eadcbbcf1c8426884db689d3`.
- 최초 artifact 이미지 검사는 단축된 resource 이름을 처리하지 못해 FAIL을 기록했다. 같은 APK의 실제 resource table과 decoded pixels로 검사를 보완하여 최종 PASS했다. APK를 다시 생성하지 않았다.
- 후보 APK: `/private/tmp/nuri-community-seasonal-hero-20261006-211950/nuri-community-seasonal-qa-483f29e5.apk`.
- APK SHA-256: `483f29e5d6702e5e90d81594523e896da0cae63401f01e0d64183a7334e1a7ad`, 273,463,918 bytes.
- build 당시 runtime source/input fingerprint MATCH. 문서 기록은 build 이후 추가했으며 설치 runtime source는 이후 수정하지 않았다.
- Galaxy S24 `SM-S937N`, serial `R5CY613NMSY`, `install -r` 1회 PASS(15.081초). 설치된 base APK SHA는 후보와 일치한다.
- 앱 UID `10402`, 최초 설치 시각 `2026-06-02 19:16:57`, 1080×2340, 450dpi, fontScale 1.0 모두 전후 동일. uninstall/clear-data/로그아웃/QA row 삭제/설정 변경 없음.
- 설치 외 앱 실행/터치/스크롤/캡처는 하지 않았다. native visual QA는 PO_PENDING. FATAL/ANR/RN_FATAL은 이번 실행 QA를 하지 않았으므로 미측정이며 0으로 보고하지 않는다.

## 7. 보존과 문서

- HEAD `aab0517e417d6dbc985d4e49af0942d34ae9b224`, branch `codex/task6-community-content-policy`. staged NONE, commit NO, push NO.
- AUTH/온보딩/Weather/Weather API/관리자 source와 기능은 보호했다. 종료 검사에서 이번 runtime/문서 범위 밖 tracked 1,447개와 문서 6개를 제외한 build 당시 tracked/untracked 1,563개의 hash가 동일했다. 공용 문서 6개는 이번 block을 제거한 내용이 작업 전 원문과 정확히 같아 기존 dirty 본문 보존을 확인했다. 이전 승인 CTA APK, 원본 4장, 새 APK/build/cache/과거 symbolication metadata 보존도 PASS다.
- 변경 문서: project-memory의 현재 상태/핵심 결정/우선순위/최근 로그, release-checklist, 리서치. 보고서는 구현·설치 사실과 PO/native 미확인을 구분하는 source of truth다.
- 기존 CTA의 Timeline 빈 상태 Primary 중복과 일정 상세 첫 진입 색 합성 문제는 알려진 미해결 제한으로 보존한다. 이번 커뮤니티 작업에서 해결했다고 보고하지 않는다.
- 기존 증적/원본/승인 APK와 새 build/.cxx/Gradle cache/APK를 유지한다. cleanup NO, Store HOLD, 새 작업 자동 시작 NO.
- 이번 작업 시작 여유 공간은 약 43.86GiB, 설치 직후 약 38.56GiB다. 정상 native 재생성/후보 보존으로 사용량이 증가했으며 추가 정리는 하지 않는다.

## 8. PO 확인 항목

1. Home의 전역 계절 선택 후 커뮤니티로 돌아와 네 계절의 전체 그림과 accent가 맞는지 확인한다. 확인 후 원래 계절로 복귀한다.
2. 히어로 그림의 잘림/늘어짐, 작은 글자의 가독성, 상단 `커뮤니티`/`글쓰기` 간격을 확인한다.
3. 일반 행 높이, 분류 chip 한 번만 표시, 첨부 아이콘과 썸네일 영역 없음, 제목/댓글 수를 확인한다.
4. 전체/인기글/공지, 질문/정보/일상/자유, 비선택 회색 및 선택 계절색을 확인한다. 공지의 카테고리 숨김은 기존 정책이다.
5. 긴 목록 스크롤 중 pagination이 하단 내비게이션 바로 위에 유지되는지, 마지막 행/맨 위 버튼과 겹치지 않는지 확인한다.
6. 이전/다음, 표시 개수 변경, 당겨 새로고침, 상세 진입·복귀, 허용되는 탭의 글쓰기 진입을 확인한다. 저장/삭제는 이 디자인 검토에 필요하지 않다.
7. 좁은 폭/확대 글꼴에서 필터 수평 이동, 버튼 잘림, footer/하단 내비게이션 간격을 확인한다. 설정을 변경했다면 원래 값으로 복귀한다.

## 9. 최종 상태

COMMUNITY_SEASONAL_LIST: IMPLEMENTED_INSTALLED_PENDING_PO_APPROVAL

LOCAL_VALIDATION: PASS

GALAXY_S24_INSTALL: PASS

NATIVE_VISUAL_QA: PO_PENDING

AUTH / WEATHER / API: COMPLETE_FROZEN

COMMIT / PUSH / CLEANUP: NO

STORE: HOLD

NEXT_ACTION: PO COMMUNITY VISUAL REVIEW

증적 루트: `/private/tmp/nuri-community-seasonal-hero-20261006-211950`.

PO 승인을 기다립니다.
