# NURI Room Creation Order

이 문서는 사용자가 Codex UI에서 방을 생성하는 순서와 bootstrap/activation 순서를 분리한다. Codex가 실제 방을 만들거나 존재를 확인했다고 가정하지 않는다.

## Priority 1

1. `NURI-02-반려동물·프로필·날짜` — `ACTIVATE_FIRST` — DATE-001
2. `NURI-03-메인홈·날씨·요약` — `ACTIVATE_FIRST` — HOME-001
3. `NURI-04-기록·Timeline` — `ACTIVATE_FIRST` — TIMELINE-001

## Priority 2 sequence

4. `NURI-09-Supabase·RLS·RPC·운영DB` — `ACTIVATE_PRIORITY_2` — AUTH-001 remote support, SUPABASE-001
5. `NURI-01-인증·온보딩` — `ACTIVATE_PRIORITY_2` — AUTH-001 primary
6. `NURI-12-Android·Release-QA` — `ACTIVATE_PRIORITY_2` — Google/Kakao regression and release evidence

## Later

7. `NURI-10-관리자웹·운영도구` — operator QA
8. `NURI-05`, `NURI-06`, `NURI-07`, `NURI-08`, `NURI-11`, `NURI-13` — 해당 도메인 변경 시
9. `NURI-14-v1.1-아키텍처·확장` — cross-domain v1.1 decision 시 reference-only

## 실행 규칙

1. 사용자가 방을 만든다.
2. 새 방은 `ROOM_EXISTENCE_UNCONFIRMED`일 수 있으며 첫 메시지는 `BOOTSTRAP_ONLY / WRITE_LOCKED`다.
3. bootstrap report가 `BOOTSTRAP_READY / WRITE_LOCKED`가 된 뒤 NURI-00이 하나의 방만 활성화한다.
4. 활성화된 방만 `WRITE_ACTIVE`가 될 수 있다.
5. 선행 방의 commit/push와 NURI-00 검수가 끝나기 전에는 다음 write를 시작하지 않는다.
6. 같은 worktree, 같은 Android 기기, 같은 migration 경계를 병렬 write하지 않는다.
