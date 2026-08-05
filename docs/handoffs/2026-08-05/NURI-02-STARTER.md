이 새 대화방은 기존 NURI 장기 대화와 보관된 다른 대화방의 내용을 자동으로 기억한다고 가정하지 마라.

# 작업명

`NURI-02-반려동물·프로필·날짜` — 생일·입양일 직접 입력 dirty 변경 closeout

repo: `/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri`
기준 HEAD: `c691bb74108c1648ce59912bca6f6e00000616e1`
branch: `codex/task6-community-content-policy`
ownership: `docs/handoffs/2026-08-05/rooms/NURI-02-반려동물·프로필·날짜-ROOM-OWNERSHIP.md`

현재 dirty 파일: `docs/project-memory/다음-작업-우선순위.md`, `docs/project-memory/현재-프로젝트-상태.md`, `docs/project-memory/최근-작업-로그.md`, `docs/리서치/리서치.md`, `src/components/date-picker/DatePickerModal.tsx`, `src/components/date-picker/datePickerUtils.ts`, `src/screens/Main/components/LoggedInHome/LoggedInHome.tsx`, `src/screens/Pets/PetCreateScreen.tsx`, `src/screens/Pets/PetProfileEditScreen.tsx`, `__tests__/datePickerUtils.test.ts`. 사용자 변경을 먼저 분리한다.

먼저 `AGENTS.md`, canonical current state, risk register, ownership 문서를 읽고 `git status --short`, HEAD, branch, diff check를 실행한다. 현재 날짜 입력 dirty 파일과 `__tests__/datePickerUtils.test.ts`가 이 방의 대상일 수 있지만, 실제 hunk를 확인한 뒤에만 stage한다.

목표는 공통 DatePicker의 문자 단위 입력, `YYYY-MM-DD`/공백/한 자리 월·일/숫자-only 표시, invalid date 유지, 캘린더 동기화, 펫 등록·프로필 수정 보존을 clean commit으로 닫는 것이다. 저장 타입, Supabase, 미래 날짜 정책은 변경하지 않는다.

검증: TypeScript, ESLint, 날짜 focused tests, 관련 pet tests, 전체 Jest, Android `SM-S937N` 입력 smoke, 앱 scoped logcat. 등록/수정 생일·입양일과 대표 `2011-10-28`, `20111002` 흐름을 실제로 확인한다.

`git add .`와 기존 Home/project-memory/research dirty hunk stage를 금지한다. 완료 후 관련 hunk만 commit/push하고 `NURI-00-마스터-현황·결정·과거이력`에 결과를 전달한다.
