# NURI Room Starter

아래는 새 대화방 첫 메시지로 복사할 단일 Markdown code block이다.

```md
이 새 대화방은 기존 NURI 장기 대화와 보관된 다른 대화방의 내용을 자동으로 기억한다고 가정하지 마라.
현재 이 대화방은 BOOTSTRAP_ONLY 상태다. NURI-00-마스터-현황·결정·과거이력의 별도 활성화 승인 전에는 코드·문서·DB를 수정하지 마라.

Room: NURI-01-인증·온보딩
Domain: NURI-01-인증·온보딩
Bootstrap mode: BOOTSTRAP_ONLY
Write state: WRITE_LOCKED
Activation: ACTIVATE_PRIORITY_2
Physical room state: ROOM_EXISTENCE_UNCONFIRMED
Role: primary
Primary issue: AUTH-001

Repository:
- app: /Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri
- admin: /Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri-web
- first handoff lineage: 최초 canonical/handoff publication `8975ba7`
- actual work baseline: room 시작 시 `git rev-parse HEAD` 결과

Room start commands:
cd /Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri
git status --short
git rev-parse HEAD
git rev-parse --short HEAD
git branch --show-current
git log --oneline --decorate -10
git diff --check

Read first:
- `AGENTS.md`
- `docs/project-memory/NURI-CANONICAL-SOURCE-OF-TRUTH.md`
- `docs/project-memory/NURI-CANONICAL-CURRENT-STATE-2026-08-05.md`
- `docs/project-memory/NURI-OPEN-RISK-REGISTER-2026-08-05.md`
- `docs/project-memory/NURI-DOMAIN-OWNERSHIP-MAP-2026-08-05.md`
- `docs/project-memory/NURI-THREAD-MAP-AND-HANDOFF-INDEX.md`
- `docs/handoffs/2026-08-05/rooms/NURI-01-인증·온보딩-ROOM-OWNERSHIP.md`
- `docs/handoffs/2026-08-05/NURI-01-STARTER.md`

Ownership:
- screens: Auth, Splash, nickname, password recovery, social login
- code/services/store: auth/session/oauth services, authStore, OAuth route/config
- Supabase: auth identities, profiles access contract; remote Provider read-only is NURI-09 support
- tests/docs: auth/session/oauth/consent tests and auth docs
- ownership boundary: `src/screens/Auth`, Splash, nickname/onboarding, account entry; `src/store/authStore.ts`, `src/services/auth`, `src/services/supabase/auth.ts`, social OAuth config/helper

Open issue: Naver 완전 제거: 사용자 노출·route·flow·helper·config·env·dependency·current 문서 잔존 0
Existing dirty changes:
- docs/project-memory/다음-작업-우선순위.md
- docs/project-memory/현재-프로젝트-상태.md
- docs/project-memory/최근-작업-로그.md
- docs/리서치/리서치.md
- src/components/date-picker/DatePickerModal.tsx
- src/components/date-picker/datePickerUtils.ts
- src/screens/Main/components/LoggedInHome/LoggedInHome.tsx
- src/screens/Pets/PetCreateScreen.tsx
- src/screens/Pets/PetProfileEditScreen.tsx
- __tests__/datePickerUtils.test.ts
These files are not automatically owned by this room. Classify hunks before any activation.

Bootstrap scope: Naver app-side 완전 제거와 Google/Kakao 회귀 기준 정리.
Next dependency: NURI-09 remote Provider read-only → NURI-12 release regression.
Bootstrap allowed: read-only code/docs/Git inspection, ownership classification, risk report and bootstrap handoff.
Bootstrap prohibited: runtime/doc/test/migration/RLS/RPC/config changes; remote Supabase changes; production data; Android build/install/device actions; stage/commit/push; reset/checkout/stash/rebase/force push; deleting dirty files; parallel write or background agents.
Do not hard-code a HEAD from this file. Do not treat `8975ba7` as current work HEAD. Do not treat historical archive text or dirty legacy docs as current policy.

Bootstrap completion report:
# NURI Room Bootstrap 완료 보고
- Room: NURI-01-인증·온보딩
- Bootstrap mode: BOOTSTRAP_READY
- Write state: WRITE_LOCKED
- Physical room state: ROOM_EXISTENCE_UNCONFIRMED
- Repository: app/admin paths above
- Actual HEAD:
- Branch:
- Git status:
- Handoff lineage: `8975ba7`
- Ownership doc: `docs/handoffs/2026-08-05/rooms/NURI-01-인증·온보딩-ROOM-OWNERSHIP.md`
- Read canonical docs:
- Screens/code/service/store/Supabase/tests: Auth, Splash, nickname, password recovery, social login; auth/session/oauth services, authStore, OAuth route/config; auth identities, profiles access contract; remote Provider read-only is NURI-09 support; auth/session/oauth/consent tests and auth docs
- Open issue: AUTH-001 — Naver 완전 제거: 사용자 노출·route·flow·helper·config·env·dependency·current 문서 잔존 0
- Existing dirty changes: preserved and not staged
- Implementation status:
- Verification status:
- Release status:
- Boundaries: `src/screens/Auth`, Splash, nickname/onboarding, account entry; `src/store/authStore.ts`, `src/services/auth`, `src/services/supabase/auth.ts`, social OAuth config/helper
- Activation blocker: NURI-00 separate approval
- Write performed: no
- File modification: none
- Commit/push: none
- Final state: BOOTSTRAP_READY / WRITE_LOCKED
```
