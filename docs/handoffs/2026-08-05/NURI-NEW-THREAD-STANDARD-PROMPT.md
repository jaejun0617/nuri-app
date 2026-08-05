# NURI 새 대화방 표준 시작 프롬프트

아래 단일 Markdown code block을 새 Codex 대화방 첫 메시지로 사용한다. 방의 물리적 생성 여부는 사용자가 UI에서 확인하며, Codex는 새 방을 생성했다고 주장하지 않는다.

```md
이 새 대화방은 기존 NURI 장기 대화와 보관된 다른 대화방의 내용을 자동으로 기억한다고 가정하지 마라.
현재 이 대화방은 BOOTSTRAP_ONLY 상태다. NURI-00-마스터-현황·결정·과거이력의 별도 활성화 승인 전에는 코드·문서·DB를 수정하지 마라.

Room: [정확한 NURI room 이름]
Domain: [소유 도메인]
Bootstrap mode: BOOTSTRAP_ONLY
Write state: WRITE_LOCKED
Activation class: ACTIVATE_FIRST | ACTIVATE_SCHEDULED | ACTIVATE_LATER | REFERENCE_ONLY
Activation order: 1~6 | 마스터 승인 시 결정 | v1.1 승인 시 결정
Physical room state: ROOM_EXISTS

Repository:
- app: /Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri
- admin: /Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri-web
- handoff lineage: 최초 canonical/handoff publication `8975ba7`
- actual work baseline: room 시작 시 아래 명령 결과를 사용하며 HEAD를 프롬프트에 고정하지 않는다.

시작 시 반드시 실행:
    cd /Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri
    git status --short
    git rev-parse HEAD
    git rev-parse --short HEAD
    git branch --show-current
    git log --oneline --decorate -10
    git diff --check

읽을 기준 문서:
- `AGENTS.md`
- `docs/project-memory/NURI-CANONICAL-SOURCE-OF-TRUTH.md`
- `docs/project-memory/NURI-CANONICAL-CURRENT-STATE-2026-08-05.md`
- `docs/project-memory/NURI-OPEN-RISK-REGISTER-2026-08-05.md`
- `docs/project-memory/NURI-DOMAIN-OWNERSHIP-MAP-2026-08-05.md`
- `docs/project-memory/NURI-THREAD-MAP-AND-HANDOFF-INDEX.md`
- `docs/handoffs/2026-08-05/rooms/[이 방의 ownership 문서]`
- `docs/handoffs/2026-08-05/[이 방의 starter 또는 task handoff]`

고정 기준:
- 첫 handoff lineage는 `8975ba7`이며 실제 작업 기준은 항상 room 시작 시 Git HEAD다.
- social policy는 Google ON, Kakao ON, Naver 완전 제거, Apple OFF다.
- Android evidence는 model `SM-S937N`, adb serial `R5CY613NMSY`, Android 16으로 기록한다. market name은 검증하지 않았으면 쓰지 않는다.
- 기존 dirty 변경은 사용자 소유일 수 있으므로 hunk를 먼저 분류하고 삭제·reset·checkout·stash하지 않는다.

Bootstrap에서 확인할 범위:
- 소유 화면, 코드, service, store, Supabase 영역, tests, 관련 docs
- canonical 기준과 실제 코드/Git의 차이
- 기존 dirty 파일과 이 방의 소유권
- open issue, 선행 조건, 다른 room과의 경계
- 구현 상태, 검증 상태, 출시 상태를 분리한 현재 판정

BOOTSTRAP_ONLY에서 허용:
- 파일 읽기와 구조 조사
- Git status/log/diff-check 같은 read-only 확인
- 문서·코드·remote·Android 증거의 존재 여부 기록
- NURI-00에 제출할 bootstrap report 작성

BOOTSTRAP_ONLY에서 금지:
- runtime 코드, 문서, 테스트, migration, RLS, RPC, config 수정
- Supabase remote 변경, production data 변경, secret 출력
- Android build/install/device 조작
- stage, commit, push, reset, checkout, stash, rebase, force push
- 다른 room의 파일 수정, background agent 또는 병렬 write
- 기존 dirty 변경 삭제 또는 자동 정리

활성화 후에도 NURI-00이 명시한 scope만 수정한다. 한 번에 하나의 room만 `WRITE_ACTIVE`가 될 수 있다.

Bootstrap 완료 보고 형식:
# NURI Room Bootstrap 완료 보고
- Room:
- Domain:
- Bootstrap mode: BOOTSTRAP_READY
- Write state: WRITE_LOCKED
- Physical room state:
- Repository:
- Actual HEAD:
- Branch:
- Git status:
- Handoff lineage: `8975ba7`
- Ownership doc:
- Read canonical docs:
- Screens/code/service/store/Supabase/tests:
- Open issue:
- Existing dirty changes:
- Implementation status:
- Verification status:
- Release status:
- Boundaries and dependencies:
- Activation blocker:
- Write performed: no
- File modification: none
- Commit/push: none
- Final state: BOOTSTRAP_READY / WRITE_LOCKED
```
