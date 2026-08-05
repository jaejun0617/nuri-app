# NURI-05-일정·건강·활동

- 목적: schedules, health report, activity records, daily streak/progress
- 화면: `src/screens/Schedules`, `src/screens/HealthReport`, activity surfaces
- 코드: `src/services/schedules`, `health-report`, `activity`, related stores
- Supabase: schedules, health logs, XP/activity tables; shared RLS는 NURI-09
- tests/docs: schedules, health, activity, reward policy tests
- 허용: domain runtime and focused tests
- 금지: generic Timeline filter semantics, Home layout, reward/private memory scope
- 경계: record row source는 NURI-04와 계약으로 공유
- 현재 상태: ACTIVATE_LATER
- 첫 작업: schedule/health/activity cross-domain contract review
