# NURI Community Original Hero Top Anchor Report

## 1. 원인과 수정

- 최신 PO 지시: 원본 히어로 이미지 자체를 상단 맨 위에 맞춘다.
- 직전 `37447d7e`는 제가 상단 풍경 복제 영역을 normal flow로 추가해 원본 canvas를 여전히 아래로 밀었다. 같은 그림을 header 뒤에 사용했어도 원본 맨 위 정렬이라는 요구에 맞지 않았다. 이전 결과를 승인 완료로 처리하지 않는다.

| 변경 전 | 변경 후 |
| --- | --- |
| 상단 풍경 영역 뒤에서 원본 시작 | 상단 풍경 영역 제거, 원본 canvas가 히어로의 첫 요소 |
| header 측정 높이가 원본 시작점을 결정 | 이미지 absolute top 0/left 0, 안전 여백은 overlay 컨트롤에만 적용 |
| 원본 위 16dp blend와 복제 이미지 | 복제 이미지·높이 state·상단 blend 모두 제거, 원본 한 장만 표시 |

- 원본 883×439 파일 4장과 실제 목록 너비/원본 비율 높이, `contain`을 유지했다. 그림을 새로 생성·편집하거나 늘려 왜곡하지 않았다.
- header는 이미지 위에 겹치며 히어로와 함께 스크롤한다. 뒤로가기 열을 외곽으로 조정해 삽입 문구와 겹침을 줄이고, 제목 중심·44dp 터치를 유지했다. 별도 native header는 다시 켜지 않았다.
- 이번 변경은 runtime 3개 파일과 테스트 1개 파일이다. Root/Tab navigation·compact 게시글·첨부 표시/분류·흰 목록·회색 칩·계절색·화살표 pagination/투명 숫자·toolbar·기능 callback·서버는 변경하지 않았다.
- Auth·온보딩·Weather·API·관리자·QA·개인화는 범위 밖이다. Android window/system-bar 정책을 전역 변경하지 않았다.

## 2. 검증

- 최종 TypeScript PASS, 대상 ESLint 0 errors/0 warnings, `git diff --check` PASS.
- 대상 8 suites / 117 tests PASS. 전체 180 suites / 1,791 tests PASS. 전체는 초기 배치와 최종 header 간격 보완 후 총 2회 실행해 모두 통과했고, 두 실행 로그를 구분해 보존했다.
- 4계절에서 원본 한 장·복제/상단 blend 부재·canvas/image 원점·header만 safe-area 적용, 360/384/400/430/768dp 실제 너비·fallback·resize/invalid layout, route header 보호·기존 쓰기/뒤로/필터/페이지 이동 계약을 검사했다.
- 이는 코드/렌더 트리 검증이다. 화면 최상단의 실제 픽셀·bitmap 문구와 header의 겹침/가독성·확대 글꼴·다른 기기/iOS·긴 목록 스크롤은 native 미확인이다. 설치 검증을 시각 PASS로 보고하지 않는다.

## 3. 빌드와 설치

- 연속 디자인 보완 정책으로 증분 Release와 업데이트 설치를 각 1회 진행했다. Release PASS: 247.031초, 995 tasks 중 61 executed / 934 up-to-date. clean·Metro 개발 서버·Fast Refresh·추가 빌드 없음.
- source/input fingerprint MATCH, Release 서명·번들·font 검증 PASS. 새 canvas 코드 포함·제거한 복제 영역 marker 부재, APK 원본 4장 decoded pixels MATCH. PNG 재압축과 픽셀 동일성을 구분했다.
- APK: `/private/tmp/nuri-community-top-anchor-20261006-233845/nuri-community-seasonal-qa-ed3f9d2f.apk`.
- SHA256: `ed3f9d2f7108fa6e485b9f43eff6ad50a6fb4c8f3b0a3478ab0103572e9c0f4c`.
- Galaxy S24 `SM-S937N` / `R5CY613NMSY`: 업데이트 설치 1회 PASS, 15.169초. 설치 hash·UID `10402`·최초 설치 `2026-06-02 19:16:57`·1080×2340/450dpi/fontScale 1.0 유지.
- 앱 실행·터치·캡처·계절/설정 변경·로그아웃·저장·삭제 없음. PO가 화면을 직접 확인한다. NATIVE_VISUAL_QA PENDING, FATAL/ANR/RN_FATAL 미측정.
- 기존 Gradle deprecation·RN feature-flag export 경고는 남아 있다. 빌드는 성공했으며 의존성 변경으로 범위를 확대하지 않았다.

## 4. 보존과 문서

- 시작/현재 HEAD `aab0517e417d6dbc985d4e49af0942d34ae9b224`, branch `codex/task6-community-content-policy`. STAGED NONE, COMMIT NO, PUSH NO.
- 보존 감사 PASS: 범위 밖 기존 파일 1,563개·문서 body 6개·원본 4장·compact 목록·이전 APK 5개 동일. 빌드 후 runtime 변경 없음, Android 생성 폴더 4곳/캐시/증적 유지.
- project-memory 4개·release-checklist·리서치에 최신 판단 block만 추가했다. 이전 보고서와 실패/후보 이력을 덮어쓰지 않았다. 기존 CTA 잔여와 frozen 영역을 다시 열지 않았다.
- 증적/fingerprint/보존 결과: `/private/tmp/nuri-community-top-anchor-20261006-233845`. CLEANUP/REMOTE/STORE 작업 없음.

## 5. 다음 액션

1. PO COMMUNITY VISUAL REVIEW: 원본 맨 위 시작·추가 풍경/빈 띠 부재, 네 계절 header/삽입 문구 가독성·겹침, 좁은 폭/확대 글꼴·스크롤과 하단 간격을 직접 확인한다.

- COMMUNITY_TOP_ANCHOR: IMPLEMENTED_INSTALLED_PENDING_PO_REVIEW. AUTH/WEATHER/API COMPLETE_FROZEN. STORE HOLD.
- COMMIT/PUSH/CLEANUP/AUTO_START_NEXT_WORK NO. 현재 설치 후보와 산출물을 유지하고 대기한다.

PO 승인을 기다립니다.
