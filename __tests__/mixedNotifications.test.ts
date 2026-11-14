import { createMixedNotificationApi, mixedInboxKey } from '../src/services/notifications/mixedNotifications';
import { groupNotifications } from '../src/services/notifications/notificationPresentation';
import { IsolatedNoticeClient } from '../src/screens/SupportIsolation/isolatedNoticeClient';

const id = '41141a56-c735-4174-88e7-0507b5609da4';
const ticketId = '72050b3f-9aaf-4648-8f07-9002d03b0859';
const at = '2026-11-14T01:00:00.123456Z';
const row = { notification_id: id, notification_source: 'user', title: 'Personal', body: 'Body',
  available_at: at, created_at: at, read_at: null, schema_version: 1 };
const reply = { ...row, notification_source: 'support_reply', is_read: false };
const result = { items: [row, reply], hasMore: true, unreadCount: 7, timeZone: 'Asia/Seoul', snapshotAt: at };

it('keeps source identity and exact server cursor precision without deriving unread from page length', async () => {
  const rpc = jest.fn().mockResolvedValue(result);
  const api = createMixedNotificationApi(rpc);
  const page = await api.page();
  expect(page.unreadCount).toBe(7);
  expect(groupNotifications(page.items, new Date(at), 'Asia/Seoul')[0].items).toHaveLength(2);
  expect(page.items[1]).not.toHaveProperty('readAt');
  await api.page(page.nextCursor);
  expect(rpc.mock.calls[1]).toEqual(['get_notification_inbox_v4', {
    p_snapshot: at, p_at: at, p_id: id, p_source: 'support_reply',
  }]);
});

it('only resolves a matching current identity and never acknowledges on lookup', async () => {
  const rpc = jest.fn().mockResolvedValue({ ...reply, target: { kind:'support_ticket', ticketId, messageSeq:84 } });
  const api = createMixedNotificationApi(rpc);
  await expect(api.target({ id, source:'support_reply' })).resolves.toEqual({
    kind:'support', target:{kind:'support_ticket',ticketId,messageSeq:84},
  });
  expect(rpc).toHaveBeenCalledTimes(1);
  await expect(api.target({ id, source:'user' })).rejects.toThrow('NURI_NOTIFICATION_RESPONSE_INVALID');
});

it('keeps a distinct cache namespace per owner session and does not replay uncertain commands', async () => {
  const rpc = jest.fn().mockRejectedValue(new Error('response missing'));
  const api = createMixedNotificationApi(rpc);
  expect(mixedInboxKey({key:'a',userId:id,api,isCurrent:()=>true})).not.toEqual(
    mixedInboxKey({key:'b',userId:id,api,isCurrent:()=>true}),
  );
  await expect(api.command('hide')).rejects.toThrow('response missing');
  expect(rpc).toHaveBeenCalledTimes(1);
});

it('rejects inconsistent or failed badge responses instead of returning zero', async () => {
  const api = createMixedNotificationApi(jest.fn().mockResolvedValue({
    unreadCount: 7, badge:{count:0,observedAt:10,validUntil:null},
  }));
  await expect(api.unread()).rejects.toThrow('NURI_NOTIFICATION_RESPONSE_INVALID');
});

it('discards a former account response even when the transport ignores cancellation', async () => {
  const a = new IsolatedNoticeClient();
  const b = new IsolatedNoticeClient();
  const respond = (body: unknown) => new Response(JSON.stringify(body));
  let completeA: (response: Response) => void = () => {
    throw new Error('expected outstanding request');
  };
  const fetchMock = jest.spyOn(global, 'fetch')
    .mockResolvedValueOnce(respond({ access_token: 'account-a', user: { id } }))
    .mockImplementationOnce(() => new Promise(resolve => { completeA = resolve; }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(respond({ access_token: 'account-b', user: { id: ticketId } }))
    .mockResolvedValueOnce(respond({ ...result, items: [], hasMore: false, unreadCount: 0 }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  try {
    await a.login('a@example.test', 'password-a');
    const pending = a.mixedNotifications.page().catch((error: unknown) => error);
    a.dispose();
    expect(fetchMock.mock.calls[1][1]?.signal?.aborted).toBe(true);
    await b.login('b@example.test', 'password-b');
    await expect(b.mixedNotifications.page()).resolves.toMatchObject({ unreadCount: 0, items: [] });
    completeA(respond(result));
    expect(await pending).toMatchObject({ code: 'SESSION_CHANGED' });
    expect(b.userId).toBe(ticketId);
  } finally {
    b.dispose();
    fetchMock.mockRestore();
  }
});

it('does not contact the isolated transport outside development', async () => {
  const previous = Object.getOwnPropertyDescriptor(global, '__DEV__');
  const fetchMock = jest.spyOn(global, 'fetch');
  Object.defineProperty(global, '__DEV__', { configurable: true, value: false });
  try {
    await expect(new IsolatedNoticeClient().mixedNotifications.page()).rejects.toMatchObject({
      code: 'DISABLED',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    if (previous) Object.defineProperty(global, '__DEV__', previous);
    else Reflect.deleteProperty(global, '__DEV__');
    fetchMock.mockRestore();
  }
});
