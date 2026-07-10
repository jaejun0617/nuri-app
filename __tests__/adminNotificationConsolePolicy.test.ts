import {
  ADMIN_NOTIFICATION_QA_TARGETS,
  buildAdminNotificationPreview,
  normalizeAdminAuditTarget,
  validateAdminNotificationDraft,
} from '../src/services/admin/adminNotificationConsolePolicy';

describe('admin notification console policy', () => {
  it('QA fixture target list is deterministic and does not expose raw identifiers', () => {
    expect(ADMIN_NOTIFICATION_QA_TARGETS.map(target => target.nickname)).toEqual([
      'adminQA',
      'adminQA3',
      'adminQA4',
      'adminQA5',
      'adminQA6',
      'adminQA7',
      'adminQA8',
    ]);
  });

  it('allows single QA target drafts only', () => {
    const result = validateAdminNotificationDraft({
      targetNickname: 'adminQA',
      title: '  운영 안내  ',
      body: ' 새 알림 보존 정책 smoke입니다. ',
      type: 'notice',
    });

    expect(result).toEqual({
      ok: true,
      normalized: {
        targetNickname: 'adminQA',
        title: '운영 안내',
        body: '새 알림 보존 정책 smoke입니다.',
        type: 'notice',
      },
    });
  });

  it('blocks broadcast and non-QA targets before RPC invocation', () => {
    expect(
      validateAdminNotificationDraft({
        targetNickname: 'adminQA',
        title: '공지',
        body: '전체 발송은 아직 비활성화입니다.',
        type: 'notice',
        broadcastRequested: true,
      }),
    ).toEqual({ ok: false, reason: 'broadcast_disabled' });

    expect(
      validateAdminNotificationDraft({
        targetNickname: 'real-user',
        title: '공지',
        body: 'QA 대상 외 직접 발송은 콘솔 1차 범위가 아닙니다.',
        type: 'notice',
      }),
    ).toEqual({ ok: false, reason: 'invalid_target' });
  });

  it('builds preview without user id, email, or phone', () => {
    const preview = buildAdminNotificationPreview({
      targetNickname: 'adminQA3',
      title: '랭킹 QA 알림',
      body: '홈 quick dismiss와 inbox delete 분리 확인',
      type: 'service',
    });

    expect(preview).toContain('대상: adminQA3');
    expect(preview).not.toContain('user_id');
    expect(preview).not.toContain('@');
    expect(preview).not.toContain('010');
  });

  it('masks non-QA audit targets', () => {
    expect(normalizeAdminAuditTarget('adminQA8')).toBe('adminQA8');
    expect(normalizeAdminAuditTarget('external-user')).toBe('관리 대상');
    expect(normalizeAdminAuditTarget(null)).toBe('QA 대상');
  });
});
