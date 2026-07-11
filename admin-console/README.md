# NURI Admin Console

This folder is a separated admin web track, not a React Native in-app route.

## Pages

- `index.html`: responsive NURI operations dashboard shell.
- `notification-console.html`: QA-scoped app-internal notification send console.

## Scope

- The dashboard provides the information architecture for NURI operations:
  users, pets, timeline/records, health, walk, animal hospitals,
  community, notifications, rankings, activity/XP/titles, reports/evidence,
  QA/release, policy, and audit logs.
- Sends an app-internal notification to one QA target at a time.
- Uses `admin_send_qa_user_notification_v1` for admin-only QA target sends.
- Uses `create_qa_user_notification_v1` only for QA self live-retention smoke.
- Shows a redacted audit feed via `admin_notification_audit_feed_v1`.

## Safety Rules

- Do not place these pages inside the app's 일반 사용자 navigation.
- Do not paste or store a service role key here.
- Do not paste FCM, Expo Push, or other push secrets here.
- Do not public-host this folder before an auth/role gate exists.
- Do not enable production broadcast until opt-out, approval, and push policies
  are complete.
- Target selectors expose QA nicknames only, not raw user ids, email, phone, or pet ids.
- Production deployment requires authentication, authorization, HTTPS hosting,
  audit log review, and secret management outside this static page.

## Local Use

Open `index.html` in a browser to review the operations dashboard layout.

Open `notification-console.html` in a browser, enter the Supabase URL and
publishable key, then log in with an admin or super_admin account. For
`adminQA` retention smoke, log in as the QA account and use the QA self smoke
button.

## Responsive QA Targets

- Desktop: 1920px and 1440px.
- Tablet: 1024px and 768px.
- Mobile: 390px narrow layout.

The dashboard should keep the sidebar, main workspace, and right insight panel
on desktop, stack the insight panel on tablet, and collapse navigation into a
horizontal top strip on mobile without horizontal overflow.
