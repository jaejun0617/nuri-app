# NURI Community Safe-Area and Fixed Compose Report

## 1. 착수와 원인

- 작업 유형: 커뮤니티 화면의 위치·CTA presentation 보완. 최신 PO 지시를 기준으로 승인된 연속 디자인 검증/증분 빌드/설치 순서를 적용했다. runtime 2개 파일과 테스트 1개 파일, 위험도 낮음. 상태 표시줄 실제 경계와 하단 간격은 PO native 확인 대상이다.
- 확인 문서: engineering workflow/checklist/memory, project-memory 4개, Master routing policy, 직전 top-anchor 보고서, 현재 화면/스타일/테스트·toolbar/계절 CTA 계약. source of truth는 최신 PO 지시와 실제 소스다. 아래 이전 보고서의 컨트롤만 safe-area 적용 판단을 다시 승인으로 취급하지 않는다.
- 이전 후보는 이미지가 상태 표시줄 뒤까지 올라가고 overlay 버튼만 inset을 사용했다. 요구는 상태 표시줄을 보호하고 바로 아래에서 히어로를 시작하는 것이다.

| 변경 전 | 변경 후 |
| --- | --- |
| 이미지 top 0, header에 top inset + 8dp | root가 top inset을 한 번 확보, header는 이미지 내부 8dp |
| 상단 `글쓰기` 버튼 | 상단 뒤로가기·커뮤니티 제목만 유지 |
| 작성 CTA가 히어로와 함께 스크롤 | 하단 고정 footer 오른쪽 48dp 원형 `+` |
| footer에는 페이지 이동만 표시 | 중앙 화살표·투명 숫자와 우측 작성의 터치 영역 분리 |

- 별도 header 띠·복제 그림·상단 확장을 추가하지 않았다. 원본 한 장의 883:439 비율, 실제 목록 너비/명시 높이/contain, 4계절 자산과 하단 연결은 유지한다.
- `+`는 공통 CtaButton의 계절 Primary와 흰 CtaIcon을 사용하며 접근성 이름은 `게시글 작성`이다. 기존 requireLogin·공지 작성 제한·navigation callback을 그대로 사용한다.
- footer는 스크롤 목록 밖 정상 흐름이며 실제 toolbar 높이 위에 배치된다. 동일한 좌우 48dp 칸, 중앙 controls, horizontal safe inset으로 페이지 이동/작성/맨 위로 버튼을 분리했다. 게시글 compact 행·필터·칩·흰 목록·toolbar·서버 계약 변경 없음.
- Auth·온보딩·Weather·API·관리자·공통 CTA palette·Android window·Supabase/DB는 범위 밖이다.

## 2. 검증 결과

- TypeScript PASS, 대상 ESLint 0 errors/0 warnings, diff check PASS.
- 대상 8 suites / 127 tests PASS. 전체 180 suites / 1,801 tests 1회 PASS.
- 최초 대상 실행의 1개 실패는 font icon 내부 Text까지 글쓰기 문구로 센 selector 문제였다. AppText 부재/plus icon/접근성 이름 검사를 분리해 보완했고 최초 로그 `targeted-first.txt`를 보존했다. 제품 기능 우회 없음.
- 0/24/48dp top inset의 단일 소유, 원본/overlay bounds, 4계절 Primary·petTheme 독립성, 360/384/400/430/768dp image sizing, fixed footer/plus, 로그인·공지 제한·기존 필터/페이지/뒤로 callback·이미지 fallback을 검사했다.
- 360/384/400/430dp에서 fontScale 1.5·네 자리 숫자의 footer 폭 예약 계산을 검사했다. 이는 로컬 구조 검증이며 실제 글리프와 native layout PASS가 아니다.
- 네 계절 제목/삽입 문구 가독성·상태 표시줄 경계·스크롤·확대 글꼴·다른 기기/iOS는 native 미확인. CI/remote/backend 검증을 새로 수행하지 않았다.

## 3. 빌드와 설치

- 증분 Release 1회 PASS: 270.427초, 995 tasks 중 61 executed / 934 up-to-date. clean·추가 빌드·Metro 개발 서버·Fast Refresh 없음.
- source/input fingerprint MATCH, Release 서명·번들·font·새 고정 작성 marker 확인 PASS. APK의 원본 4장 decoded pixels MATCH; PNG 컨테이너 재압축과 픽셀 동일성은 구분했다.
- APK: `/private/tmp/nuri-community-safe-area-compose-20261007-000148/nuri-community-seasonal-qa-76c13adb.apk`.
- SHA256: `76c13adb7615995bea166057e07c4ecfbc1374044e295e29e4251cb1af3d829c`.
- Galaxy S24 `SM-S937N` / `R5CY613NMSY`: install-r 1회 PASS, 15.458초. 설치 hash 일치, UID `10402`, 최초 설치 `2026-06-02 19:16:57`, 1080×2340/450dpi/fontScale 1.0 유지.
- 앱 실행·터치·캡처·계절/기기 설정 변경·로그아웃·저장·삭제·데이터 초기화 명령 없음. PO가 화면을 직접 확인한다. NATIVE_VISUAL_QA PENDING, FATAL/ANR/RN_FATAL 미측정.
- 기존 Gradle deprecation·NO_COLOR/FORCE_COLOR 경고는 남아 있다. 빌드는 성공했으며 의존성 변경으로 범위를 확대하지 않았다.

## 4. 보존과 문서

- 시작/현재 HEAD `aab0517e417d6dbc985d4e49af0942d34ae9b224`, branch `codex/task6-community-content-policy`. STAGED NONE, COMMIT NO, PUSH NO.
- 보존 감사 PASS: 범위 밖 기존 파일 1,565개·기존 문서 body 6개·원본 4장·compact 목록·이전 APK 6개 동일. 예상 밖 새 파일 없음, 빌드 이후 runtime 수정 없음. 결과는 증적의 `final-preservation.json`에 기록했다.
- project-memory 4개·release-checklist·리서치에 최신 판단 block만 추가했다. 이전 보고서·dirty·QA/서버 계약·Android 생성 폴더 4곳/캐시/증적은 유지한다.
- 시작 여유 공간 34.52GiB, 빌드 후 33.50GiB, 최종 감사 33.48GiB. 정리하지 않았다.
- 증적/fingerprint/실패/최종 검증/설치/보존: `/private/tmp/nuri-community-safe-area-compose-20261007-000148`. 이 후보는 Store RC가 아니다.

## 5. 다음 액션

1. PO COMMUNITY VISUAL REVIEW: 상태 표시줄 아래 원본 시작·불필요한 빈 띠 부재, 상단 제목/뒤로/삽입 문구 가독성, 하단 `+`·중앙 화살표/숫자·내비게이션 간격을 직접 확인한다.

- COMMUNITY_SAFE_AREA_COMPOSE: IMPLEMENTED_INSTALLED_PENDING_PO_REVIEW. AUTH/WEATHER/API COMPLETE_FROZEN. STORE HOLD.
- COMMIT/PUSH/CLEANUP/AUTO_START_NEXT_WORK NO. 현재 설치 후보와 산출물을 유지하고 대기한다.

PO 승인을 기다립니다.
