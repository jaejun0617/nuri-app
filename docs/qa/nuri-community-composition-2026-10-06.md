# NURI Community Composition PO Candidate Report

## 1. 범위와 판단

- 최신 PO 지시: 게시글 목록은 현재 실기기 기준으로 유지하고 시안과의 주요 표현 차이를 보완한다. 추가 증분 Release 빌드·설치 각 1회 승인, 설치 후 화면 확인은 PO가 직접 한다.
- 기준: 첨부 시안·S24 캡처, 실제 active CommunityList/CommunityTabList와 custom header, 전역 effectiveSeason/승인 CTA 팔레트, 직전 설치본 `fa7fdaa8`.
- 이번 변경은 runtime 4개 파일과 테스트 1개 파일이다. `PostCard.tsx`, `PostCard.styles.ts`, 목록 정책·toolbar·서버·데이터 callback은 이번 작업 전 상태를 유지한다.
- Auth·온보딩·Weather·API·관리자·사용자 개인화·QA 데이터는 범위 밖이다. 원본 그림 생성·편집, 새 기능, 실제 게시글 쓰기·삭제는 없다.

## 2. 변경 전 → 변경 후

| 구역 | 변경 전 | 변경 후 |
| --- | --- | --- |
| 헤더 | 흰색 바탕으로 계절 그림과 분리 | 계절별 밝은 바탕과 이미지 상단 24dp의 얇은 연결 처리 |
| 제목·글쓰기 | 시안 대비 크고 무거운 표현 | 제목 18/24dp·600, 글쓰기 13/18dp·600, 최소 44dp 터치 영역 |
| 그림 아래 탭 | 직선 경계 | 그림 밖 12dp 연결 공간 위로 흰색 12dp 둥근 모서리를 연결 |
| 카테고리 | 보이는 칩 자체가 최소 44dp | 터치 영역 44dp 유지, 보이는 면 최소 32dp, 일반 500·선택 600 글자 |
| 필터 간격 | 상위 최소 52dp·카테고리 행 최소 64dp | 상위 최소 48dp·카테고리 행 최소 52dp |
| 페이지 이동 | 최소 너비 78dp·높이 48dp, 페이지 표시 48dp | 최소 너비 68dp·높이 44dp, 페이지 표시 40dp, footer 최소 60dp |
| 게시글 행 | compact 행·댓글 숫자 영역·분류 1회·첨부 아이콘 | 동일하게 보존. 썸네일·큰 카드·하트 추천 UI를 추가하지 않음 |

- 원본 883×439 그림은 실제 목록 너비와 계산 높이, `contain`을 유지한다. 연결 탭이 이미지나 삽입 문구를 덮지 않도록 그림 밖 공간만 겹친다.
- 시안처럼 동일 그림을 상태 표시줄·제목 전체까지 확장한 결과는 아니다. 원본 가로 구도·삽입 문구를 잘라내지 않는 **계절색 경계 연결**이며, 최종 연결감은 PO native 검토 대상이다.
- 목록·탭은 스크롤 영역, pagination은 내비게이션 위 고정 상태를 유지한다. 비선택 칩은 `#F1F3F6`, 목록은 흰색, 강조색은 기존 전역 계절 CTA를 사용한다. 가을 `#B95000`·겨울 `#3B6398`·봄 `#B84066`·여름 `#247264`는 변경하지 않았다.
- custom header는 navigation의 배경·제목·tint 옵션을 opt-in 반영한다. 목록 외 기본 테마와 safe-area 소유권은 테스트로 보호한다.

## 3. 로컬 검증

- TypeScript PASS. 대상 ESLint 0 errors/0 warnings. `git diff --check` PASS.
- 대상 8 suites / 114 tests PASS. 전체 180 suites / 1,788 tests를 이번 source에서 1회 실행하여 PASS.
- 4계절 그림·강조색·헤더/연결 옵션, 360/384/400/430/768dp 숫자 크기, resize/invalid layout/fallback, 44dp 터치와 자연 높이, 기본 header 유지, 첨부·분류·공지·글쓰기·새로고침·페이지 이동을 검사했다.
- 첫 타입 검사는 추가 테스트의 `back.href` 누락, 첫 대상 테스트는 Touchable 내부 View와 칩 면을 구분하지 않은 selector 5건으로 실패했다. 테스트 fixture/selector를 보완한 뒤 통과했다. 최초 실패 로그를 보존했으며 실패를 숨기거나 검사를 제거하지 않았다.
- 이는 렌더 트리·소스 계약 검증이다. 실제 기기 확대 글꼴·다른 기기·iOS·긴 목록 스크롤·그림 글자 가독성의 native PASS로 해석하지 않는다.

## 4. 빌드와 설치

- 증분 Release 1회 PASS: 244.840초, 995 tasks 중 61 executed / 934 up-to-date. clean·Metro 서버·Fast Refresh·추가 빌드 없음.
- source/input fingerprint MATCH, Release 서명·번들·font 검증 PASS. APK에서 추출한 원본 계절 그림 4장 decoded pixels MATCH. PNG container 재압축과 픽셀 동일성을 구분했다.
- 후보 APK: `/private/tmp/nuri-community-composition-20261006-225113/nuri-community-seasonal-qa-4774073c.apk`.
- APK SHA256: `4774073cfaab3be924d97c35992e34bdd24c8eb6a1e5c4350919ecac7abb3cf3`.
- Galaxy S24 `SM-S937N` / `R5CY613NMSY`: `install-r` 1회 PASS, 15.324초. 실제 설치 hash MATCH, UID `10402`·최초 설치 `2026-06-02 19:16:57`·1080×2340/450dpi/fontScale 1.0 유지.
- 이번 설치 이후 앱 실행·터치·캡처·계절 변경·저장·삭제·기기 설정 변경은 하지 않았다. Native 시각 QA는 PO_PENDING, FATAL/ANR/RN_FATAL은 미측정이다. 이전 후보의 native 증적을 이번 후보 PASS로 재사용하지 않는다.
- Gradle deprecation과 기존 RN 내부 feature-flag export 경고가 빌드 로그에 있다. 빌드는 성공했으며 이번 디자인 범위를 확대해 의존성을 변경하지 않았다.

## 5. 보존과 문서

- 시작/현재 HEAD `aab0517e417d6dbc985d4e49af0942d34ae9b224`, branch `codex/task6-community-content-policy`. STAGED NONE, COMMIT NO, PUSH NO.
- 기존 dirty·원본 4장·compact 목록 파일·Auth/Weather/API·이전 보고서·증적·APK와 Android build/.cxx/.gradle/cache를 보존한다. 새 cleanup·remote·Store 작업 없음.
- project-memory 4개, release-checklist와 리서치에는 이번 상태의 marker block만 추가한다. 기존 문서 body와 이전 판단은 삭제하지 않는다.
- 기존 CTA 잔여인 Timeline 빈 상태 Primary 중복·일정 상세 첫 진입 색 합성은 이번 해결 대상으로 열지 않았다.
- 상세 로그와 fingerprint: `/private/tmp/nuri-community-composition-20261006-225113`. 최종 보존 확인은 해당 root의 `final-preservation.json`을 따른다.
- 최종 보존 감사 PASS: 작업 범위 밖 기존 파일 1,560개 변경 없음, 기존 문서 body 6개 동일, compact 목록·원본 4장·이전 APK 3개 동일. 빌드 이후 runtime 변경 없음, Android 생성 폴더 4곳 유지, HEAD/index 불변.

## 6. PO 확인 항목

1. 4계절의 제목/글쓰기 바탕과 히어로 상단 연결감.
2. 그림 전체 구도와 문구가 그대로 보이고 둥근 탭 경계가 자연스러운지.
3. 전체·인기글·공지, gray 비선택 칩과 계절색 선택 칩의 크기·간격.
4. 게시글 compact 높이·댓글 숫자·분류 1회·첨부 아이콘이 기존대로인지.
5. 고정 페이지 이동·하단 내비게이션 간격과 실제 이전/다음 동작.
6. 좁은 폭·확대 글꼴에서 header/칩/페이지 이동 잘림 여부.

## 7. 최종 상태

- COMMUNITY_COMPOSITION: IMPLEMENTED_INSTALLED_PENDING_PO_REVIEW.
- NATIVE_VISUAL_APPROVAL: PENDING. 다음 즉시 작업은 PO COMMUNITY VISUAL REVIEW 1개다.
- AUTH/WEATHER/API: COMPLETE_FROZEN. STORE HOLD. COMMIT/PUSH/CLEANUP/AUTO_START_NEXT_WORK: NO.

PO 승인을 기다립니다.
