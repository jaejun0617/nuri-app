import { reloadNoticeWindow } from '../src/screens/SupportIsolation/noticeWindow';
import {
  NoticeError,
  type Notice,
} from '../src/screens/SupportIsolation/isolatedNoticeClient';

const row = (id: string): Notice => ({
  id,
  title: id,
  category: 'guide',
  pinned: false,
  readAt: null,
  date: '2026-11-13T00:00:00Z',
});
it('rebuilds the full loaded window and locates an anchor moved by pin/category changes', async () => {
  const list = jest
    .fn()
    .mockResolvedValueOnce({ items: [row('new')], count: 3, nextCursor: 'p2' })
    .mockResolvedValueOnce({
      items: [row('middle')],
      count: 3,
      nextCursor: 'p3',
    })
    .mockResolvedValueOnce({
      items: [row('anchor')],
      count: 3,
      nextCursor: null,
    });
  expect(
    (await reloadNoticeWindow({ list }, null, 1, 'anchor')).items.map(
      item => item.id,
    ),
  ).toEqual(['new', 'middle', 'anchor']);
  expect(list.mock.calls.map(call => call[0])).toEqual([null, 'p2', 'p3']);
});
it('discards partial pages on stale generation and restarts once', async () => {
  const list = jest
    .fn()
    .mockResolvedValueOnce({
      items: [row('old')],
      count: 2,
      nextCursor: 'old-cursor',
    })
    .mockRejectedValueOnce(new NoticeError('SUPPORT_CURSOR_STALE'))
    .mockResolvedValueOnce({
      items: [row('current')],
      count: 1,
      nextCursor: null,
    });
  expect(
    (await reloadNoticeWindow({ list }, 'guide', 2)).items.map(item => item.id),
  ).toEqual(['current']);
  expect(list.mock.calls.map(call => call[0])).toEqual([
    null,
    'old-cursor',
    null,
  ]);
});
it('does not loop indefinitely on continuing stale generations or hide network failure', async () => {
  const list = jest
    .fn()
    .mockRejectedValue(new NoticeError('SUPPORT_CURSOR_STALE'));
  await expect(reloadNoticeWindow({ list }, null, 20)).rejects.toThrow(
    'SUPPORT_CURSOR_STALE',
  );
  expect(list).toHaveBeenCalledTimes(2);
  const offline = jest
    .fn()
    .mockRejectedValue(new NoticeError('NETWORK_UNCERTAIN'));
  await expect(reloadNoticeWindow({ list: offline }, null, 20)).rejects.toThrow(
    'NETWORK_UNCERTAIN',
  );
  expect(offline).toHaveBeenCalledTimes(1);
});
