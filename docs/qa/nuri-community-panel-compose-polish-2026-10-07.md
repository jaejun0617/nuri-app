# NURI Community Panel and Compose Polish Report

## 1. 착수와 변경 전후

- 작업 유형: 최신 PO 지시의 목록 시작점과 작성 버튼 위치/색 presentation 보완. 추가 승인 필요 없음. runtime 3개 파일과 테스트 1개 파일, 위험도 낮음. 상태 표시줄 경계와 실제 합성 화면은 PO native 확인 대상이다.
- 확인 문서: engineering workflow/checklist/memory, project-memory 4개, Master routing policy, 직전 safe-area-compose 보고서, frontend-skill, 현재 화면/스타일/계절/아이콘/테스트 계약. source of truth는 최신 PO 지시와 실제 소스다.

| 변경 전 | 변경 후 |
| --- | --- |
| 원본 이미지 y=439 아래부터 흰 목록 패널 | y=410부터 패널 시작, 발 아래 전경 29px를 너비 비례로 덮음 |
| 작성 `+`가 pagination row의 우측 슬롯 | pagination 위 12dp, 목록 viewport 우측에 고정된 48dp 버튼 |
| 맨 위로 버튼과 작성의 위치가 별도 absolute 방식 | 같은 고정 그룹에 12dp 간격으로 쌓아 충돌 방지 |
| plus가 원본 색 semantic 아이콘으로 치환되어 inherited white가 글리프를 보장하지 않음 | 작성 버튼만 원래 Feather plus, 명시적 `#FFFFFF`, 24dp |

- 4계절 원본을 직접 확인해 발 아래 y=410을 공통 패널 기준으로 정했다. 883px 원본 기준 29px overlap은 384dp에서 12.61dp다. 이미지 파일/883:439 비율/contain/viewport 측정은 그대로이고 패널 뒤 바닥 전경만 가려진다. 이미지 fallback은 추가 overlap을 0으로 해 문구를 보호한다.
- 작성은 스크롤 목록의 형제이며 pagination 밖에 있어 스크롤해도 고정된다. 마지막 행을 위한 여백은 작성만 있을 때 72dp, 맨 위로까지 있을 때 128dp다. 추가된 고정 그룹은 horizontal safe inset도 반영한다.
- 기존 requireLogin·공지 작성 제한·navigation·저장/필터/페이지 callback 변경 없음. 게시글 compact 행·흰 배경·중앙 페이지 화살표/배경 없는 숫자·상태 표시줄 아래 시작·상단 overlay·하단 navigation은 보존했다.
- Auth·온보딩·Weather·API·관리자·전역 CTA palette·공통 아이콘·Android window·Supabase/DB는 변경하지 않았다.

## 2. 로컬 검증

- TypeScript PASS, 대상 ESLint 0 errors/0 warnings, git diff check PASS.
- 대상 9 suites / 289 tests PASS. 전체 180 suites / 1,801 tests 1회 PASS.
- 최초 대상 실행 1개 실패는 RN mock View wrapper를 잘못 순회한 selector 문제였다. 실제 children 순서 검사로 보완했으며 `targeted-first.txt`를 보존했다. 제품 기능 우회 없음.
- 네 계절 overlap·오류 fallback·360/384/400/430/768dp sizing·고정 위치·bottom clearance·horizontal inset·실제 Feather 흰 글리프와 원본 색 치환 부재·권한/callback·fontScale 1.5 pagination 폭 예약을 검사했다.
- 테스트 구조와 원본 이미지 검토는 native 합성 화면 PASS가 아니다. PO 시각 검토, 확대 글꼴 실제 화면, 다른 기기/iOS는 미확인. CI/remote/backend 검증은 수행하지 않았다.

## 3. 빌드와 설치

- 증분 Release 1회 PASS: 231.739초, 995 tasks 중 61 executed / 934 up-to-date. clean·추가 빌드·Metro 개발 서버·Fast Refresh 없음.
- source/input fingerprint MATCH, Release 서명·번들·font·새 floating-actions marker 확인 PASS. APK 네 계절 decoded pixels MATCH. PNG 컨테이너 재압축과 픽셀 동일성은 구분했다.
- Source fingerprint: `d0ce32eebd74ed47c9af7c1d92f8b83dfc2f9315b49ac744c9c59f9d4308bba8`.
- Input fingerprint: `514fb51d1a2b17594cc4d29342a9bced453e3371d96b57aea602a7cf82584821`.
- APK: `/private/tmp/nuri-community-panel-compose-polish-20261007-003122/nuri-community-seasonal-qa-861b211c.apk`.
- SHA256: `861b211c785d0bf26001c61ad0abec4e8092855e333ddabbf8873cf37bd13c3b`.
- Galaxy S24 `SM-S937N` / `R5CY613NMSY`: install-r 1회 PASS, 15.251초. 설치 hash 일치, UID `10402`, 최초 설치 `2026-06-02 19:16:57`, 1080x2340/450dpi/fontScale 1.0 유지.
- 앱 실행·터치·캡처·계절/기기 설정 변경·로그아웃·저장·삭제·데이터 초기화 명령 없음. NATIVE_VISUAL_QA PENDING, FATAL/ANR/RN_FATAL 미측정. PO가 화면을 직접 확인한다.
- 빌드의 Gradle/Android 옵션 deprecation·NO_COLOR/FORCE_COLOR·ReactNativeFeatureFlags export fallback 경고는 남아 있다. 빌드는 성공했으며 의존성 수정으로 범위를 확대하지 않았다.

## 4. 보존과 문서

- 시작/현재 HEAD `aab0517e417d6dbc985d4e49af0942d34ae9b224`, branch `codex/task6-community-content-policy`. STAGED NONE, COMMIT NO, PUSH NO.
- 최종 보존 감사 PASS: 범위 밖 기존 파일 1,565개·기존 문서 body 6개·네 계절 원본·compact 게시글 행·이전 APK 7개와 새 후보 동일. 예상 밖 새 파일 없음, 빌드 이후 runtime 수정 없음. 결과는 증적의 `final-preservation.json`에 기록했다.
- project-memory 4개·release-checklist·리서치에 최신 판단 block만 추가했다. 이전 보고서·문서 body·dirty·QA/서버 계약·네 계절 원본·기존 APK·Android 생성 폴더/캐시/증적을 보존한다.
- 시작 여유 공간 33.49GiB, 빌드 후 32.42GiB, 최종 감사 32.41GiB. 정리하지 않았다.
- 증적/fingerprint/최초 실패/최종 검증/설치: `/private/tmp/nuri-community-panel-compose-polish-20261007-003122`. 이 후보는 Store RC가 아니다.

## 5. 다음 액션

1. PO COMMUNITY VISUAL REVIEW: 목록 패널이 발 바로 아래에서 시작하는지, `+`가 흰색으로 pagination 위에 고정되는지, 스크롤 마지막 행/맨 위로와 충돌하지 않는지 직접 확인한다.

- COMMUNITY_PANEL_COMPOSE_POLISH: IMPLEMENTED_INSTALLED_PENDING_PO_REVIEW. AUTH/WEATHER/API COMPLETE_FROZEN. STORE HOLD.
- COMMIT/PUSH/CLEANUP/AUTO_START_NEXT_WORK NO. 현재 설치 후보와 산출물을 유지하고 대기한다.

PO 승인을 기다립니다.
