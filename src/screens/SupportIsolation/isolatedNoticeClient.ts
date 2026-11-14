import {
  parseSupportNotificationPage,
  resolveSupportReplyNotification,
} from '../../services/notifications/supportReplyNotifications';
import { createMixedNotificationApi } from '../../services/notifications/mixedNotifications';
import type { InboxKey } from '../../services/notifications/mixedNotifications';
import { parseScopedDestinationDomain } from '../../services/notifications/scopedDestinationDomain';

export type Notice = {
  id: string;
  title: string;
  category: 'guide' | 'update';
  pinned: boolean;
  readAt: string | null;
  date: string;
  expiresAt?: string | null;
};
export type NoticeDetail = Notice & { body: string };
export type NoticeDraft = {
  id: string;
  revision: number;
  title: string;
  body: string;
  category: 'guide' | 'update';
  pinned: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  state?: 'draft' | 'published' | 'stopped';
};
export type FaqCategory = 'usage' | 'account' | 'billing';
export type FaqContent = {
  question: string;
  answer: string;
  category: FaqCategory;
};
export type FaqEntry = {
  id: string;
  published: FaqContent | null;
  working: { revision: number; draft: FaqContent } | null;
};
export type FaqCommand = {
  p_key: string;
  p_action: 'save' | 'publish' | 'stop';
  p_id?: string;
  p_revision?: number;
  p_content?: FaqContent;
};
export type StaffTicket = {
  id: string;
  title?: string | null;
  category: string;
  state: 'open' | 'closed';
  nextActor: 'staff' | 'user' | 'none';
  createdAt: string;
  unread: boolean;
};
export type CommunityNotice = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
};
export type Report = {
  id: string;
  target: string;
  reason: string;
  createdAt: string;
  status: string;
  summary: string | null;
  auditId: string | null;
  note: string | null;
};
export type ReplyAlert = {
  id: string;
  ticketId: string;
  createdAt: string;
  unread: boolean;
};
export type TicketCommand = {
  p_key: string;
  p_operation:
    | 'message'
    | 'claim'
    | 'reply'
    | 'close'
    | 'reopen'
    | 'release'
    | 'transfer';
  p_ticket?: string;
  p_revision?: number;
  p_seen_user_seq?: number;
  p_body?: string;
  p_category?: string;
  p_kind?: 'answer' | 'information';
  p_assignee?: string;
};
export type TicketPhoto = { id: string; width: number; height: number };
export type TicketPhotoCommand = {
  p_key: string;
  p_ticket: string | null;
  p_category: string | null;
  p_body: string;
  p_draft: string;
  p_photos: string[];
};
export type TicketRegistration = {
  p_key: string;
  p_title: string;
  p_category: string;
  p_body: string;
  p_draft: string | null;
  p_photos: string[];
};
export type CommunityCommand = {
  p_key: string;
  p_action: 'create' | 'update' | 'hide';
  p_id?: string;
  p_updated?: string;
  p_title?: string;
  p_content?: string;
};
export type ReportCommand = {
  p_key: string;
  p_id: string;
  p_previous: string | null;
  p_status: string;
  p_note: string;
};
export type NoticeCommand = {
  p_key: string;
  p_operation: 'save' | 'publish' | 'stop' | 'delete';
  p_id?: string;
  p_expected_revision?: number;
  p_content?: {
    title: string;
    body: string;
    category: 'guide' | 'update';
    pinned: boolean;
    startsAt?: string | null;
    expiresAt?: string | null;
  };
};
export class NoticeError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new NoticeError('INVALID_RESPONSE');
  return value as Record<string, unknown>;
}
function string(value: unknown): string {
  if (typeof value !== 'string') throw new NoticeError('INVALID_RESPONSE');
  return value;
}
function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new NoticeError('INVALID_RESPONSE');
  return value;
}
function nullableString(value: unknown) {
  return value == null ? null : string(value);
}
function faqContent(value: unknown): FaqContent {
  const row = record(value);
  const { category } = row;
  if (category !== 'usage' && category !== 'account' && category !== 'billing')
    throw new NoticeError('INVALID_RESPONSE');
  return {
    question: string(row.question),
    answer: string(row.answer),
    category,
  };
}
function faqEntry(row: Record<string, unknown>, management: boolean): FaqEntry {
  return {
    id: string(row.id),
    published: row.published === null ? null : faqContent(row.published),
    working: management
      ? { revision: integer(row.revision), draft: faqContent(row.draft) }
      : null,
  };
}
function rows(value: unknown) {
  const items = record(value).items;
  if (!Array.isArray(items)) throw new NoticeError('INVALID_RESPONSE');
  return items.map(record);
}
function cursorArgs(before?: { id: string; createdAt: string }) {
  return {
    p_before: before?.createdAt ?? null,
    p_before_id: before?.id ?? null,
    p_limit: 20,
  };
}
export function parseNotice(value: unknown): Notice {
  const row = record(value);
  if (
    (row.category !== 'guide' && row.category !== 'update') ||
    typeof row.pinned !== 'boolean'
  )
    throw new NoticeError('INVALID_RESPONSE');
  return {
    id: string(row.id),
    title: string(row.title),
    category: row.category,
    pinned: row.pinned,
    readAt: row.read_at == null ? null : string(row.read_at),
    date: string(row.first_published_at),
    expiresAt: nullableString(row.expires_at),
  };
}
function noticeDraft(row: Record<string, unknown>): NoticeDraft {
  if (
    (row.category !== 'guide' && row.category !== 'update') ||
    (row.state !== 'draft' &&
      row.state !== 'published' &&
      row.state !== 'stopped') ||
    typeof row.pinned !== 'boolean'
  )
    throw new NoticeError('INVALID_RESPONSE');
  return {
    id: string(row.id),
    revision: integer(row.revision),
    title: string(row.title),
    body: string(row.body),
    category: row.category,
    pinned: row.pinned,
    state: row.state,
    startsAt: nullableString(row.starts_at),
    expiresAt: nullableString(row.expires_at),
  };
}
export function newNoticeKey(): string {
  // The app entry point initializes the native secure random provider.
  if (typeof globalThis.crypto?.getRandomValues !== 'function')
    throw new NoticeError('RANDOM_UNAVAILABLE');
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] % 16) + 64;
  bytes[8] = (bytes[8] % 64) + 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16,
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const origin = 'http://127.0.0.1:56323';

/** DEV transport only. No production client, persisted session, role fixture or token injection. */
export class IsolatedNoticeClient {
  readonly mixedNotifications = createMixedNotificationApi((name, args) =>
    this.request('/rest/v1/rpc/' + name, args),
  );
  async notificationDomain(identity: InboxKey) {
    return parseScopedDestinationDomain(await this.request(
      '/rest/v1/rpc/get_notification_destination_domain_v4',
      { p_id: identity.id, p_source: identity.source },
    ));
  }
  private token: string | null = null;
  private epoch = 0;
  private requests = new Set<AbortController>();
  private disposed = false;
  userId: string | null = null;
  private async request(
    path: string,
    body: unknown,
    anonymous = false,
  ): Promise<unknown> {
    if (!__DEV__ || this.disposed) throw new NoticeError('DISABLED');
    const generation = this.epoch;
    const controller = new AbortController();
    this.requests.add(controller);
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(origin + path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(!anonymous && this.token
            ? { Authorization: `Bearer ${this.token}` }
            : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const result: unknown =
        response.status === 204 ? null : await response.json();
      if (generation !== this.epoch || this.disposed)
        throw new NoticeError('SESSION_CHANGED');
      if (!response.ok) {
        if (response.status >= 500) throw new NoticeError('NETWORK_UNCERTAIN');
        const data = record(result);
        const known = new Set([
          'SUPPORT_FORBIDDEN',
          'SUPPORT_NOT_FOUND',
          'SUPPORT_REVISION_CONFLICT',
          'SUPPORT_REQUEST_CONFLICT',
          'SUPPORT_CURSOR_STALE',
          'SUPPORT_UNAVAILABLE',
          'NURI_NOTIFICATION_UNAVAILABLE',
          'NURI_NOTIFICATION_AUTH_REQUIRED',
          'SUPPORT_AUTH_REQUIRED',
          'SUPPORT_INVALID_INPUT',
          'SUPPORT_NOT_ASSIGNED',
          'SUPPORT_CLAIM_CONFLICT',
          'SUPPORT_MESSAGE_CONFLICT',
          'SUPPORT_PHOTO_INVALID',
          'SUPPORT_PHOTO_NOT_READY',
          'SUPPORT_PHOTO_EXPIRED',
          'SUPPORT_PHOTO_QUOTA',
          'SUPPORT_PHOTO_BUSY',
          'community_notice_operator_required',
        ]);
        const code =
          typeof data.message === 'string' && known.has(data.message)
            ? data.message
            : response.status === 401
            ? 'AUTH_REQUIRED'
            : 'REQUEST_REJECTED';
        throw new NoticeError(code);
      }
      return result;
    } catch (error) {
      if (error instanceof NoticeError) throw error;
      throw new NoticeError('NETWORK_UNCERTAIN');
    } finally {
      clearTimeout(timer);
      this.requests.delete(controller);
    }
  }
  async login(email: string, password: string) {
    if (this.token) throw new NoticeError('SESSION_CHANGED');
    const result = record(
      await this.request(
        '/auth/v1/token?grant_type=password',
        { email, password },
        true,
      ),
    );
    const user = record(result.user);
    this.token = string(result.access_token);
    this.userId = string(user.id);
    return this.userId;
  }
  async canManage(): Promise<boolean> {
    try {
      await this.request('/rest/v1/rpc/support_notice_list_v1', {
        p_management: true,
        p_limit: 1,
      });
      return true;
    } catch (error) {
      if (error instanceof NoticeError && error.code === 'SUPPORT_FORBIDDEN')
        return false;
      throw error;
    }
  }
  async list(
    cursor: unknown = null,
    category: 'guide' | 'update' | null = null,
  ) {
    const result = record(
      await this.request('/rest/v1/rpc/support_notice_list_v1', {
        p_cursor: cursor,
        p_category: category,
        p_limit: 20,
      }),
    );
    if (!Array.isArray(result.items) || typeof result.count !== 'number')
      throw new NoticeError('INVALID_RESPONSE');
    return {
      items: result.items.map(parseNotice),
      count: result.count,
      nextCursor: result.nextCursor,
    };
  }
  async detail(id: string, markRead = false): Promise<NoticeDetail> {
    const result = record(
      await this.request('/rest/v1/rpc/support_notice_detail_v1', {
        p_id: id,
        p_mark_read: markRead,
      }),
    );
    return { ...parseNotice(result), body: string(result.body) };
  }
  async editor(id: string): Promise<NoticeDraft> {
    return noticeDraft(
      record(
        await this.request('/rest/v1/rpc/support_notice_editor_v1', {
          p_id: id,
        }),
      ),
    );
  }
  async noticeDrafts(cursor: unknown = null) {
    const result = record(
      await this.request('/rest/v1/rpc/support_notice_list_v1', {
        p_management: true,
        p_limit: 20,
        p_cursor: cursor,
      }),
    );
    return {
      items: rows(result).map(noticeDraft),
      nextCursor: result.nextCursor,
    };
  }
  async faqs(management: boolean): Promise<FaqEntry[]> {
    const result = await this.request('/rest/v1/rpc/support_faq_list_v1', {
      p_management: management,
    });
    return rows(result).map(row => faqEntry(row, management));
  }
  async faqCommand(command: FaqCommand): Promise<FaqEntry> {
    return faqEntry(
      record(
        await this.request('/rest/v1/rpc/support_faq_command_v1', command),
      ),
      true,
    );
  }
  async staffTickets(before?: StaffTicket): Promise<StaffTicket[]> {
    return this.tickets(true, before);
  }
  async myTickets(before?: StaffTicket): Promise<StaffTicket[]> {
    return this.tickets(false, before);
  }
  private async tickets(
    management: boolean,
    before?: StaffTicket,
  ): Promise<StaffTicket[]> {
    return rows(
      await this.request('/rest/v1/rpc/support_ticket_list_v2', {
        ...cursorArgs(before),
        p_management: management,
      }),
    ).map(row => {
      if (row.state !== 'open' && row.state !== 'closed')
        throw new NoticeError('INVALID_RESPONSE');
      const nextActor = row.next_actor;
      if (nextActor !== 'staff' && nextActor !== 'user' && nextActor !== 'none')
        throw new NoticeError('INVALID_RESPONSE');
      return {
        id: string(row.id),
        title: nullableString(row.title),
        category: string(row.category),
        state: row.state,
        nextActor,
        createdAt: string(row.created_at),
        unread: row.unread === true,
      };
    });
  }
  async canViewTickets(): Promise<boolean> {
    try {
      await this.staffTickets();
      return true;
    } catch (error) {
      if (error instanceof NoticeError && error.code === 'SUPPORT_FORBIDDEN')
        return false;
      throw error;
    }
  }
  async ticketThread(id: string, after = 0, ack: number | null = null) {
    const result = record(
      await this.request('/rest/v1/rpc/support_ticket_read_v2', {
        p_ticket: id,
        p_after: after,
        p_limit: 50,
        p_ack: ack,
      }),
    );
    if (!Array.isArray(result.messages))
      throw new NoticeError('INVALID_RESPONSE');
    const messages = result.messages.map(value => {
      const row = record(value);
      if (
        typeof row.seq !== 'number' ||
        !Number.isSafeInteger(row.seq) ||
        (row.author_kind !== 'staff' && row.author_kind !== 'user')
      )
        throw new NoticeError('INVALID_RESPONSE');
      if (!Array.isArray(row.photos)) throw new NoticeError('INVALID_RESPONSE');
      const photos: TicketPhoto[] = row.photos.map(item => {
        const photo = record(item);
        const width = integer(photo.width);
        const height = integer(photo.height);
        if (!width || !height || width > 2048 || height > 2048)
          throw new NoticeError('INVALID_RESPONSE');
        return { id: string(photo.id), width, height };
      });
      return {
        id: string(row.id),
        seq: row.seq,
        body: string(row.body),
        author: row.author_kind,
        createdAt: string(row.created_at),
        photos,
      };
    });
    return {
      id: string(result.id),
      title: nullableString(result.title),
      category: string(result.category),
      nextActor: string(result.nextActor),
      revision: integer(result.revision),
      lastUserSeq: integer(result.lastUserSeq),
      messageSeq: integer(result.messageSeq),
      state:
        result.state === 'closed' ? ('closed' as const) : ('open' as const),
      assignee:
        result.assignment == null
          ? null
          : nullableString(record(result.assignment).assigneeId),
      messages,
    };
  }
  async ticketCommand(command: TicketCommand) {
    const { p_operation, ...transfer } = command;
    const row = record(
      await this.request(
        p_operation === 'transfer'
          ? '/rest/v1/rpc/support_ticket_transfer_v1'
          : '/rest/v1/rpc/support_ticket_command_v1',
        p_operation === 'transfer' ? transfer : command,
      ),
    );
    return { id: string(row.id), revision: integer(row.revision) };
  }
  async registerTicket(command: TicketRegistration) {
    const row = record(
      await this.request('/rest/v1/rpc/support_ticket_create_v2', command),
    );
    return { id: string(row.id), revision: integer(row.revision) };
  }
  async staffMembers(): Promise<string[]> {
    const value = await this.request(
      '/rest/v1/rpc/support_staff_members_v1',
      {},
    );
    if (!Array.isArray(value)) throw new NoticeError('INVALID_RESPONSE');
    return value.map(item => string(record(item).id));
  }
  async ticketPhotoMessage(command: TicketPhotoCommand) {
    const row = record(
      await this.request(
        '/rest/v1/rpc/support_ticket_photo_message_v1',
        command,
      ),
    );
    return { id: string(row.id), revision: integer(row.revision) };
  }
  async uploadTicketPhoto(input: {
    id: string;
    draft: string;
    ticket: string | null;
    base64: string;
  }) {
    const row = record(await this.request('/support/photos/upload', input));
    if (row.id !== input.id) throw new NoticeError('INVALID_RESPONSE');
  }
  async readTicketPhoto(id: string) {
    const row = record(await this.request('/support/photos/read', { id }));
    const base64 = string(row.base64);
    if (!base64.startsWith('/9j/') || base64.length > 6990508)
      throw new NoticeError('INVALID_RESPONSE');
    return `data:image/jpeg;base64,${base64}`;
  }
  async replyAlerts(before?: ReplyAlert): Promise<ReplyAlert[]> {
    return rows(
      await this.request(
        '/rest/v1/rpc/support_reply_inbox_v2',
        cursorArgs(before),
      ),
    ).map(row => ({
      id: string(row.id),
      ticketId: string(row.ticket_id),
      createdAt: string(row.created_at),
      unread: row.unread === true,
    }));
  }
  async notificationPage(before?: { id: string; createdAt: string }) {
    return parseSupportNotificationPage(
      await this.request(
        '/rest/v1/rpc/support_notification_page_v1',
        cursorArgs(before),
      ),
    );
  }
  async notificationTarget(id: string) {
    return resolveSupportReplyNotification(id, eventId =>
      this.request('/rest/v1/rpc/support_notification_target_v1', {
        p_id: eventId,
      }),
    );
  }
  async communityAllowed() {
    return (
      (await this.request('/rest/v1/rpc/support_community_allowed_v1', {})) ===
      true
    );
  }
  async communityNotices(cursorValue: unknown = null) {
    const value = record(
      await this.request('/rest/v1/rpc/community_list_posts_v3', {
        p_filter: 'notice',
        p_category: 'all',
        p_limit: 30,
        p_cursor: cursorValue,
      }),
    );
    return {
      items: rows(value).map(row => ({
        id: string(row.id),
        title: string(row.title),
        body: string(row.content),
        updatedAt: string(row.updated_at),
      })),
      nextCursor: value.nextCursor ?? null,
    };
  }
  async communityCommand(command: CommunityCommand) {
    return string(
      record(
        await this.request(
          '/rest/v1/rpc/support_community_command_v1',
          command,
        ),
      ).post_id,
    );
  }
  async reports(before?: Report): Promise<Report[]> {
    return rows(
      await this.request(
        '/rest/v1/rpc/support_report_list_v1',
        cursorArgs(before),
      ),
    ).map(row => ({
      id: string(row.id),
      target: string(row.target_type),
      reason: string(row.reason),
      createdAt: string(row.created_at),
      status: string(row.review_status),
      summary: nullableString(row.target_summary),
      auditId: nullableString(row.last_audit_id),
      note: nullableString(row.operator_note),
    }));
  }
  async canViewReports() {
    try {
      await this.reports();
      return true;
    } catch (error) {
      if (error instanceof NoticeError && error.code === 'SUPPORT_FORBIDDEN')
        return false;
      throw error;
    }
  }
  async reportReview(command: ReportCommand) {
    return string(
      await this.request('/rest/v1/rpc/support_report_review_v1', command),
    );
  }
  async command(command: NoticeCommand) {
    const result = record(
      await this.request('/rest/v1/rpc/support_notice_command_v1', command),
    );
    if (
      !Number.isSafeInteger(result.revision) ||
      typeof result.revision !== 'number'
    )
      throw new NoticeError('INVALID_RESPONSE');
    return { id: string(result.id), revision: result.revision };
  }
  async logout() {
    try {
      if (this.token) await this.request('/auth/v1/logout?scope=local', {});
    } finally {
      this.clear();
    }
  }
  private clear() {
    this.epoch++;
    for (const req of this.requests) req.abort();
    this.requests.clear();
    this.token = null;
    this.userId = null;
  }
  dispose() {
    const token = this.token;
    this.clear();
    this.disposed = true;
    // Cleanup uses its own bounded request after canceling in-flight view requests.
    if (token && __DEV__) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      fetch(origin + '/auth/v1/logout?scope=local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: '{}',
        signal: controller.signal,
      })
        .catch(() => {})
        .finally(() => clearTimeout(timer));
    }
  }
}
