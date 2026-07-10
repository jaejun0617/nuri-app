// 파일: src/services/admin/adminNotificationConsolePolicy.ts
// 역할:
// - 앱 내부 일반 사용자 surface와 분리된 운영자 알림 콘솔의 안전 정책을 정의한다.
// - 콘솔 UI는 QA 대상 단일 발송만 허용하고, 전체 발송은 명시적으로 비활성화한다.

export type AdminNotificationType = 'notice' | 'account' | 'service' | 'event';

export type AdminNotificationTarget = {
  nickname: string;
  label: string;
};

export type AdminNotificationDraft = {
  targetNickname: string;
  title: string;
  body: string;
  type: AdminNotificationType;
  broadcastRequested?: boolean;
};

export type AdminNotificationValidationResult =
  | {
      ok: true;
      normalized: {
        targetNickname: string;
        title: string;
        body: string;
        type: AdminNotificationType;
      };
    }
  | {
      ok: false;
      reason:
        | 'broadcast_disabled'
        | 'invalid_target'
        | 'title_required'
        | 'body_required'
        | 'invalid_type';
    };

export const ADMIN_NOTIFICATION_QA_TARGETS: ReadonlyArray<AdminNotificationTarget> = [
  { nickname: 'adminQA', label: 'adminQA' },
  { nickname: 'adminQA3', label: 'adminQA3' },
  { nickname: 'adminQA4', label: 'adminQA4' },
  { nickname: 'adminQA5', label: 'adminQA5' },
  { nickname: 'adminQA6', label: 'adminQA6' },
  { nickname: 'adminQA7', label: 'adminQA7' },
  { nickname: 'adminQA8', label: 'adminQA8' },
];

export const ADMIN_NOTIFICATION_TYPES: ReadonlyArray<AdminNotificationType> = [
  'notice',
  'account',
  'service',
  'event',
];

export function isAdminNotificationTarget(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ADMIN_NOTIFICATION_QA_TARGETS.some(
    target => target.nickname.toLowerCase() === normalized,
  );
}

export function isAdminNotificationType(
  value: string,
): value is AdminNotificationType {
  return ADMIN_NOTIFICATION_TYPES.includes(value as AdminNotificationType);
}

export function validateAdminNotificationDraft(
  draft: AdminNotificationDraft,
): AdminNotificationValidationResult {
  if (draft.broadcastRequested) {
    return { ok: false, reason: 'broadcast_disabled' };
  }

  const targetNickname = draft.targetNickname.trim();
  if (!isAdminNotificationTarget(targetNickname)) {
    return { ok: false, reason: 'invalid_target' };
  }

  const title = draft.title.trim();
  if (!title) {
    return { ok: false, reason: 'title_required' };
  }

  const body = draft.body.trim();
  if (!body) {
    return { ok: false, reason: 'body_required' };
  }

  if (!isAdminNotificationType(draft.type)) {
    return { ok: false, reason: 'invalid_type' };
  }

  return {
    ok: true,
    normalized: {
      targetNickname,
      title,
      body,
      type: draft.type,
    },
  };
}

export function buildAdminNotificationPreview(input: {
  targetNickname: string;
  title: string;
  body: string;
  type: AdminNotificationType;
}): string {
  return [
    `대상: ${input.targetNickname}`,
    `종류: ${input.type}`,
    `제목: ${input.title.trim()}`,
    `본문: ${input.body.trim()}`,
  ].join('\n');
}

export function normalizeAdminAuditTarget(value: unknown): string {
  if (typeof value !== 'string') return 'QA 대상';
  const trimmed = value.trim();
  return isAdminNotificationTarget(trimmed) ? trimmed : '관리 대상';
}
