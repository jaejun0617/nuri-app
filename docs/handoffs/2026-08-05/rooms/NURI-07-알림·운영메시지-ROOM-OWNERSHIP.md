# NURI-07-알림·운영메시지

- 목적: in-app notification center, token lifecycle, notification dismissal/navigation
- 화면: `src/screens/Notifications`, notification UI and app banners
- 코드: `src/services/notifications`, push token lifecycle, notification stores
- Supabase: user_notifications, user_push_tokens, notification RPC; shared policy NURI-09
- tests/docs: notification/retention/push tests and notification migrations
- 허용: client notification lifecycle and stable event contract
- 금지: actual push activation without product/ops approval, community moderation logic
- 경계: community event producer NURI-06, admin send console NURI-10
- 현재 상태: ACTIVATE_LATER; actual Push disabled by policy
- 첫 작업: account switch/token cleanup audit
