# 커뮤니티 댓글 인앱 알림 rollback note

기준 migration: `20260722110000_community_comment_in_app_notifications.sql`

## 변경 범위

- `comments` insert 이후 게시글 작성자 또는 부모 댓글 작성자에게 `user_notifications` row를 생성한다.
- 본인 댓글·답글, 비공개·숨김·삭제 게시글, 숨김·삭제 댓글은 알림 대상에서 제외한다.
- 알림에는 댓글 원문, 이메일, 전화번호, token, secret을 저장하지 않는다.
- 실제 push dispatcher는 호출하지 않는다.

## 안전한 rollback

```sql
begin;

drop trigger if exists trg_notify_community_comment_insert_v1
  on public.comments;
drop function if exists public.notify_community_comment_insert_v1();

commit;
```

rollback은 trigger/function만 제거한다. 이미 생성된 사용자 알림을 일괄 삭제하지 않는다.

## 댓글 수 corrective migration

- 적용 migration: `20260722113000_community_comment_count_sync_repair.sql`
- 목적: `posts.comment_count`를 active/non-deleted 댓글과 답글 수에 맞추고 이후
  INSERT 또는 soft 상태 변경에도 동일 계약을 유지한다.
- 원본 게시글과 댓글은 수정하거나 삭제하지 않으며 파생 카운터만 재계산한다.
- trigger를 되돌려야 하면 `trg_sync_post_comment_count`를 제거하되, 이미 정정된
파생 카운터는 source row와 일치하므로 역보정하지 않는다.

## 댓글 알림 이동 대상 read model

- 적용 migration: `20260722120000_community_notification_navigation_targets.sql`
- 목적: 앱 알림 목록에 raw metadata 대신 UUID 형식이 검증된 게시글·댓글 목적지만
  제공한다. 기존 `get_user_notifications_v1`은 호환성을 위해 유지한다.
- rollback은 앱을 `get_user_notifications_v1` 호출로 되돌린 뒤 아래 함수만 제거한다.

```sql
drop function if exists public.get_user_notifications_v2(integer);
```
