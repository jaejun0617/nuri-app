import React from 'react';
import {
  EmptyNotificationInbox,
  NotificationGroup,
} from '../Notifications/NotificationDesign';
import {
  groupNotifications,
  type NotificationListRow,
} from '../../services/notifications/notificationPresentation';
import type { ReplyAlert } from './isolatedNoticeClient';

type SupportRow = NotificationListRow & { ticketId: string };
export function supportInboxRow(alert: ReplyAlert): SupportRow {
  return {
    id: alert.id,
    source: 'support_reply',
    category: 'news',
    title: '문의에 답변이 도착했어요',
    body: '남긴 문의의 답변을 확인해주세요.',
    createdAt: alert.createdAt,
    availableAt: alert.createdAt,
    // The server supplies read state, not a fabricated receipt timestamp.
    isRead: !alert.unread,
    ticketId: alert.ticketId,
  };
}

/** Shared inbox rows and date grouping, scoped to the authenticated local recipient. */
export default function SupportReplyInbox({
  alerts,
  busy,
  onOpen,
}: {
  alerts: ReplyAlert[];
  busy: boolean;
  onOpen: (ticketId: string) => void;
}) {
  const now = new Date();
  if (!alerts.length && !busy) return <EmptyNotificationInbox />;
  return (
    <>
      {groupNotifications(alerts.map(supportInboxRow), now, 'Asia/Seoul').map(
        group => (
          <NotificationGroup
            key={group.key}
            label={group.label}
            items={group.items}
            now={now}
            timeZone="Asia/Seoul"
            disabled={busy}
            onPress={item => onOpen(item.ticketId)}
          />
        ),
      )}
    </>
  );
}
