# NURI-02-반려동물·프로필·날짜

- 목적: pet CRUD, profile, nickname, birthday/adoption date, pet switching
- 화면: `src/screens/Pets`, profile components, date picker
- 코드: `src/services/pets`, `profile`, `src/components/date-picker`, pet stores
- Supabase: pets/profiles read-write contract; shared policy는 NURI-09
- tests/docs: datePicker, pet, profile, onboarding tests; pet profile docs
- 허용: 날짜 입력·펫 프로필 runtime 및 관련 tests
- 금지: Home layout, Timeline query, migration 직접 수정, 공통 token 전면 변경
- 경계: common typography는 NURI-11 review, 저장 schema contract는 NURI-09
- 현재 상태: CREATE_NOW Priority 1; DATE-001
- 첫 작업: dirty date input hunk와 대표 날짜 실기기 closeout
