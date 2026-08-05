이 새 대화방은 기존 NURI 장기 대화와 보관된 다른 대화방의 내용을 자동으로 기억한다고 가정하지 마라.

# 작업명

`NURI-04-기록·Timeline` — 전체 요약·Timeline parity 및 fast re-entry closeout

repo: `/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri`
기준 HEAD: `c691bb74108c1648ce59912bca6f6e00000616e1`
branch: `codex/task6-community-content-policy`
ownership: `docs/handoffs/2026-08-05/rooms/NURI-04-기록·Timeline-ROOM-OWNERSHIP.md`

현재 dirty 파일은 날짜 입력 5개 runtime/test 파일, `LoggedInHome.tsx`, project-memory 3개, `docs/리서치/리서치.md`다. 이 방에는 Timeline 관련 새 변경만 stage한다.

현재 HEAD의 TimelineEntryGate, timelineEntry controller, FlashList generation, all filtered record pagination을 실제 코드 기준으로 재검증한다. 목표는 산책·식사·생활·전체 요약 수치와 Timeline 목록 parity, KST 날짜, CRUD 반영, 고속 진입에서 stale header/list/count/empty/offset가 없는지 clean APK로 닫는 것이다.

Home layout과 날짜 입력은 수정하지 않는다. Supabase query/schema 변경은 필요성이 입증될 때 `NURI-09`를 primary로 지정한다. Timeline 내부 filter·month·other subcategory·detail back은 보존한다.

검증: timelineEntry/weeklySummary/records focused tests, 전체 Jest, typecheck/lint, release APK, 네 카드 20x와 mixed fast re-entry, Android Back/top Back/Home tab, UIAutomator/screenrecord, app-scoped logcat. 이전 evidence는 참고로만 사용한다.

기존 dirty hunk는 stage하지 않고, 관련 변경만 부분 stage·commit·push한다. 결과를 master에 전달한다.
