이 새 대화방은 기존 NURI 장기 대화와 보관된 다른 대화방의 내용을 자동으로 기억한다고 가정하지 마라.

# 작업명

`NURI-09-Supabase·RLS·RPC·운영DB` — remote catalog와 provider policy closeout

repo: `/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri`
기준 HEAD: `c691bb74108c1648ce59912bca6f6e00000616e1`
branch: `codex/task6-community-content-policy`
ownership: `docs/handoffs/2026-08-05/rooms/NURI-09-Supabase·RLS·RPC·운영DB-ROOM-OWNERSHIP.md`

현재 앱 dirty 파일은 날짜 입력 5개 runtime/test 파일, `LoggedInHome.tsx`, project-memory 3개, `docs/리서치/리서치.md`다. 관리자 웹 worktree는 clean이다. 이 방은 기존 dirty 파일을 stage하지 않는다.

이번 작업은 read-only catalog, local/remote migration 정합성, RLS/policy, RPC/function grants, triggers, public trust boundary, OAuth provider 정책을 실제 remote 기준으로 확인한다. 현재 `supabase db push --dry-run`은 up to date이고 Docker 부재로 `db dump` full catalog는 미확인이다.

production data, migration edit/apply, RLS disable, secret 출력은 금지한다. Naver app/config 잔존은 사실대로 분리하고 hard removal 여부를 결정하지 못하면 risk로 남긴다. feature room의 앱 호출 계약과 공용 DB 변경을 혼합하지 않는다.

검증: CLI read-only, migration list/dry-run, 가능한 remote SQL catalog, 관련 tests, diff check. 필요 시 앱/관리자 room에 계약 결과를 handoff한다. migration이 필요하면 별도 사용자 승인과 staged review를 먼저 기록한다.
