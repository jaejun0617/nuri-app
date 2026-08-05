이 새 대화방은 기존 NURI 장기 대화와 보관된 다른 대화방의 내용을 자동으로 기억한다고 가정하지 마라.

# 작업명

`NURI-12-Android·Release-QA` — clean RC·실기기·출시 gate

repo: `/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri`
기준 HEAD: `c691bb74108c1648ce59912bca6f6e00000616e1`
branch: `codex/task6-community-content-policy`
ownership: `docs/handoffs/2026-08-05/rooms/NURI-12-Android·Release-QA-ROOM-OWNERSHIP.md`

현재 앱 dirty 파일은 날짜 입력 5개 runtime/test 파일, `LoggedInHome.tsx`, project-memory 3개, `docs/리서치/리서치.md`다. 관리자 웹 worktree는 clean이다. APK provenance에는 이 dirty 상태를 명시한다.

기능 코드를 소유하지 않는다. clean 또는 명시된 dirty provenance의 APK를 build/install하고 version, checksum, signing, device, smoke, logcat, 증적을 관리한다. 현재 baseline은 `SM-S937N`, `R5CY613NMSY`, Android 16, app version 1.0 code 1이다.

네트워크·QA 계정·사용자 데이터 변경은 통제된 범위에서만 수행한다. release blocker가 발견되면 owning domain으로 되돌린다. 날짜 입력, Home, Timeline 기능을 이 방에서 수정하지 않는다.

검증: app/web relevant builds, release APK, install, cold start, Auth/Pet/Home/Timeline/Weather/Hospital/Community/More, Android Back, app-scoped logcat, evidence directory. clean RC provenance와 dirty baseline을 섞어 보고하지 않는다. 완료 후 checksum과 남은 risk를 master에 전달한다.
