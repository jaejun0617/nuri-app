# NURI Admin Notification Console

This folder is a separated admin page track, not a React Native in-app route.

## Scope

- Sends an app-internal notification to one QA target at a time.
- Uses `admin_send_qa_user_notification_v1` for admin-only QA target sends.
- Uses `create_qa_user_notification_v1` only for QA self live-retention smoke.
- Shows a redacted audit feed via `admin_notification_audit_feed_v1`.

## Safety Rules

- Do not place this page inside the app's 일반 사용자 navigation.
- Do not paste or store a service role key here.
- Do not paste FCM, Expo Push, or other push secrets here.
- Broadcast is intentionally disabled until opt-out, approval, and push policies are complete.
- Target selectors expose QA nicknames only, not raw user ids, email, phone, or pet ids.

## Local Use

Open `notification-console.html` in a browser, enter the Supabase URL and publishable key, then log in with an admin or super_admin account. For `adminQA` retention smoke, log in as the QA account and use the QA self smoke button.
