# NURI 새 대화방 표준 시작 프롬프트

아래 내용을 새 Codex 대화방의 첫 메시지로 사용한다.

```md
이 새 대화방은 기존 NURI 장기 대화와 보관된 다른 대화방의 내용을 자동으로 기억한다고 가정하지 마라.

작업명: [정확한 room 이름과 작업명]
담당 도메인: [ownership 문서의 도메인]
repo: /Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri
관리자 repo: /Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri-web
기준 HEAD: c691bb74108c1648ce59912bca6f6e00000616e1
branch: codex/task6-community-content-policy
관리자 HEAD: 5027caee2212ceca54dfe02270cc3ccdf76e32a3

작업 시작 전 다음을 읽어라.
- AGENTS.md
- docs/project-memory/NURI-CANONICAL-SOURCE-OF-TRUTH.md
- docs/project-memory/NURI-CANONICAL-CURRENT-STATE-2026-08-05.md
- docs/project-memory/NURI-OPEN-RISK-REGISTER-2026-08-05.md
- 담당 room ownership 문서
- 이 작업의 handoff 문서

시작 시 git status --short, git rev-parse --short HEAD, git branch --show-current, git diff --check를 실행한다. 현재 dirty 파일은 사용자 변경일 수 있으므로 먼저 hunk 소유권을 판정하고 삭제·reset·checkout·stash하지 않는다.

이번 작업 범위:
- [구체적인 issue와 완료 기준]

수정 금지:
- 다른 domain room 소유 코드
- Supabase migration/RLS/RPC/Storage 공용 계약(별도 승인 없이는 수정하지 않음)
- production data와 secrets
- 날짜 입력/Home/Timeline 등 명시되지 않은 dirty 변경

검증:
- 관련 TypeScript, ESLint, focused tests
- 전체 관련 테스트
- git diff --check
- 필요 시 linked Supabase read-only 확인
- Android 실기기 `SM-S937N` / `R5CY613NMSY`에서 필요한 smoke와 logcat

Git 규칙:
- git add . 금지
- 이번 작업 hunk만 부분 stage
- commit 전 staged diff 직접 확인
- 임의 force push/rebase/reset 금지
- 완료 후 commit, push, 최종 status 기록

완료 보고에는 원인, 수정 파일, 기능 보존, 테스트, remote/device evidence, APK checksum, 남은 risk를 포함하고 결과를 `NURI-00-마스터-현황·결정·과거이력`에 전달할 handoff로 작성한다.
```
