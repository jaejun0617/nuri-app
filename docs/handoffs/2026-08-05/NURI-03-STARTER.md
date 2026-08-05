이 새 대화방은 기존 NURI 장기 대화와 보관된 다른 대화방의 내용을 자동으로 기억한다고 가정하지 마라.

# 작업명

`NURI-03-메인홈·날씨·요약` — Home dirty 변경 및 clean release gate

repo: `/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri`
기준 HEAD: `c691bb74108c1648ce59912bca6f6e00000616e1`
branch: `codex/task6-community-content-policy`
ownership: `docs/handoffs/2026-08-05/rooms/NURI-03-메인홈·날씨·요약-ROOM-OWNERSHIP.md`

현재 dirty 파일은 날짜 입력 5개 runtime/test 파일, `LoggedInHome.tsx`, project-memory 3개, `docs/리서치/리서치.md`다. 날짜 입력과 문서 변경은 이 방에서 stage하지 않는다.

canonical 문서와 ownership을 읽고 실제 `LoggedInHome.tsx` dirty hunk를 먼저 분류한다. 목표는 현재 승인된 Home 섹션 순서, NURI 브랜드 header, 프로필 typography, 최근 기록 축소, 전체 요약 카드, scroll 복원을 기능 계약과 함께 clean commit으로 닫는 것이다.

날씨 카드 visual contract, navigation bar, Community, Timeline 조회/집계, 날짜 입력은 수정하지 않는다. 전체 요약 카드의 Timeline payload는 `NURI-04`와 협의하되 primary write는 한 방에만 둔다.

검증: Home focused tests, 전체 Jest, typecheck/lint, clean release build, `SM-S937N` Home/scroll/pet switch/summary evidence, app-scoped logcat. dirty runtime이 포함된 기존 APK를 clean RC로 보고하지 않는다.

부분 stage만 사용하고 날짜 입력·문서·research 변경은 포함하지 않는다. 완료 보고를 master room으로 전달한다.
