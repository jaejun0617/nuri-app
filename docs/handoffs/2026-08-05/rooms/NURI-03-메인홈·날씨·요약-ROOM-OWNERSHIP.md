# NURI-03-메인홈·날씨·요약

- 목적: logged-in/guest Home, profile summary, frequent/recent records, total summary, weather presentation
- 화면: `src/screens/Main`, `src/screens/Weather`의 user-facing Home-linked views
- 코드: `src/services/home`, `src/services/weather`, `LoggedInHome`, Home stores/query hooks
- Supabase: Home read contracts; shared memories query semantics는 NURI-04, shared DB policy는 NURI-09
- tests/docs: home widget/summary/weather tests; Home/typography docs
- 허용: Home composition, summary display, Home-owned service calls, weather presentation
- 금지: Timeline internal state, navigation bar, Community, weather backend contract 변경
- 경계: Home→Timeline payload는 NURI-04 primary; weather provider/cache backend는 NURI-09 review
- 현재 상태: ACTIVATE_SCHEDULED, order 2; HOME-001
- 첫 작업: dirty Home hunk 분리와 clean APK regression
