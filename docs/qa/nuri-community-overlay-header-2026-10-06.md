# NURI Community Overlay Header PO Candidate Report

## 1. 범위와 판단

- 최신 PO 지시: 히어로가 상단까지 차지하고 실제 이미지 위에 뒤로가기·커뮤니티·글쓰기를 배치한다. 페이지 이동은 화살표만, 숫자 배경은 제거한다.
- 기준: 최신 S24 캡처와 명시 지시, 실제 CommunityList/CommunityTabList, 전역 effectiveSeason/승인 CTA 팔레트, 이전 설치 후보 `4774073c`. 이전 계절색 header 연결 판단은 최신 지시로 대체하며 승인 완료로 처리하지 않는다.
- runtime 5개 파일과 테스트 1개 파일을 보완했다. 두 목록 route의 native header만 제거하고 같은 히어로 안에 overlay를 구성한다. 다른 상세·작성 header, compact 게시글·댓글 rail·toolbar·callback·서버는 보존한다.
- Auth·온보딩·Weather·API·관리자·개인화·QA 데이터는 범위 밖이다. 그림 파일 생성/편집, 계정 변경·콘텐츠 저장/삭제·remote 작업은 없다.

## 2. 변경 전 → 변경 후

| 구역 | 변경 전 | 변경 후 |
| --- | --- | --- |
| 상단 | 별도 native header와 계절색 바탕이 그림 위 영역을 차지 | 별도 header 제거, 히어로의 그림 풍경 위에 컨트롤 overlay |
| 배경 구성 | 원본 그림이 별도 header 아래에서 시작 | 상단 문구 없는 풍경을 헤더 뒤에 확장하고 원본 전체 canvas를 아래에 보존 |
| 헤더 위치 | native header가 safe-area와 높이를 소유 | 히어로 내 absolute header가 safe-area와 실제 측정 높이를 사용 |
| 이전/다음 | 화살표 + 보이는 `이전`·`다음` 문구 | 20dp 화살표만 표시, 버튼 터치 44dp·접근성 이름 유지 |
| 페이지 숫자 | 계절 tint와 둥근 배경 | 배경·둥근 면 제거, 계절색 숫자와 로딩 표시 유지 |
| 하단 영역 | footer 최소 60dp·넓은 이동 버튼 | footer 최소 56dp·44dp 화살표 버튼, 기존 toolbar 위 고정 |

- 글자가 삽입된 원본 전체를 header 뒤로 확대하면 문구와 버튼이 겹칠 수 있다. 같은 그림의 상단 80 source px만 사용해 문구 없는 풍경을 확장하고, 원본 883×439 전체 canvas는 실제 목록 너비/비율 높이와 `contain`으로 유지했다. 16dp 연결 처리는 원본 파일을 바꾸지 않는다.
- header는 히어로와 함께 스크롤한다. pagination은 기존처럼 스크롤 밖에 고정한다. 게시글 밀도·카테고리 1회·첨부 아이콘·흰 목록·회색 비선택 칩·승인 계절색·하단 내비게이션 외형은 변경하지 않았다.
- 가을 `#B95000`, 겨울 `#3B6398`, 봄 `#B84066`, 여름 `#247264`와 기존 기능 callback·쓰기 정책·페이지 이동 계약을 유지한다.

## 3. 로컬 검증

- TypeScript PASS. 대상 ESLint 0 errors/0 warnings. `git diff --check` PASS.
- 대상 8 suites / 117 tests PASS. 전체 180 suites / 1,791 tests를 이번 source에서 1회 실행해 PASS.
- 두 목록 route의 별도 header 제거·다른 header 보존, 4계절 원본/강조색·overlay/safe-area/측정 높이, 360/384/400/430/768dp 그림 크기, invalid layout/fallback, 화살표-only/투명 숫자/44dp/disabled/loading, 쓰기·뒤로·필터·refresh·페이지 이동을 검사했다.
- 첫 lint는 제거된 숫자 tint의 불필요 dependency로 실패해 보완했다. 첫 대상 테스트는 renderer 내부 객체 직접 비교 중 Node heap OOM으로 종료됐다. 관계를 boolean으로 검증하도록 바꾸고 통과했으며 최초 로그도 보존했다. 이는 테스트 실행 실패이며 native 앱 오류로 보고하지 않는다.
- 렌더 트리·소스 검사와 실제 화면 검증을 구분한다. 최종 native 외형, 확대 글꼴·다른 기기·iOS·긴 목록 스크롤·상단 이미지 경계와 가독성은 미확인이다.

## 4. 빌드와 설치

- 승인된 증분 Release 1회 PASS: 243.387초, 995 tasks 중 61 executed / 934 up-to-date. clean·Metro 개발 서버·Fast Refresh·추가 빌드 없음.
- build source/input fingerprint MATCH, Release 서명·번들·font 검증 PASS. overlay 코드 marker 포함과 APK 원본 계절 그림 4장 decoded pixels MATCH. PNG 재압축과 이미지 픽셀 동일성을 구분했다.
- 후보 APK: `/private/tmp/nuri-community-overlay-header-20261006-231811/nuri-community-seasonal-qa-37447d7e.apk`.
- APK SHA256: `37447d7e3e5f375730d30ca1f359e9c0f922a697690848cfa7289e6192ed1b48`.
- Galaxy S24 `SM-S937N` / `R5CY613NMSY`: 업데이트 설치 1회 PASS, 15.295초. 설치 hash MATCH, UID `10402`·최초 설치 `2026-06-02 19:16:57`·1080×2340/450dpi/fontScale 1.0 유지.
- 앱 실행·터치·캡처·계절/설정 변경·로그아웃·저장·삭제를 하지 않았다. PO가 화면을 직접 확인한다. NATIVE_VISUAL_QA PENDING, FATAL/ANR/RN_FATAL 미측정. 이전 후보의 native 증거를 이번 후보 PASS로 재사용하지 않는다.
- 기존 Gradle deprecation·RN feature-flag export 경고가 로그에 있다. 빌드는 성공했으며 이번 범위를 확대해 의존성을 변경하지 않았다.

## 5. 보존과 문서

- 시작/현재 HEAD `aab0517e417d6dbc985d4e49af0942d34ae9b224`, branch `codex/task6-community-content-policy`. STAGED NONE, COMMIT NO, PUSH NO.
- 보존 감사 PASS: 범위 밖 기존 파일 1,560개 동일, 기존 문서 body 6개 동일, compact 목록·원본 4장·이전 APK 4개·현재 후보 보존. 빌드 후 runtime 변경 없음, Android build/.cxx/.gradle 생성 폴더 유지.
- project-memory 4개·release-checklist·리서치에 marker block만 추가하고 이전 이력을 보존했다. 기존 CTA 제한인 Timeline 빈 상태 Primary 중복·일정 상세 첫 진입 색 합성은 열지 않았다. 새 QA 보고서 외 기존 보고서는 수정하지 않았다.
- 증적·fingerprint·최종 보존 결과: `/private/tmp/nuri-community-overlay-header-20261006-231811`. 시작 가용 36.43GiB, 최종 감사 시 35.39GiB. CLEANUP/REMOTE/STORE 작업 없음.

## 6. PO 확인 항목

1. 넓은 상단 빈 영역 대신 실제 이미지 위에 뒤로가기·제목·글쓰기가 배치됐는지.
2. 네 계절의 확장 풍경과 원본 그림 경계가 자연스럽고 문구가 버튼 뒤에 중복되지 않는지.
3. 전체·인기글·공지와 gray 비선택/계절색 선택 칩이 기존대로인지.
4. compact 게시글·댓글 숫자·분류 1회·첨부 표시가 유지됐는지.
5. 화살표-only 이전/다음·투명 페이지 숫자·로딩/disabled와 하단 내비게이션 간격.
6. 좁은 폭·확대 글꼴·긴 목록에서 header/칩/페이지 이동 잘림과 스크롤 동작.

## 7. 최종 상태

- COMMUNITY_OVERLAY_HEADER: IMPLEMENTED_INSTALLED_PENDING_PO_REVIEW. 다음 즉시 작업은 PO COMMUNITY VISUAL REVIEW 1개다.
- AUTH/WEATHER/API: COMPLETE_FROZEN. STORE HOLD. COMMIT/PUSH/CLEANUP/AUTO_START_NEXT_WORK: NO.

PO 승인을 기다립니다.
