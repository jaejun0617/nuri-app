import {
  NoticeError,
  type IsolatedNoticeClient,
  type Notice,
} from './isolatedNoticeClient';

/** Rebuild a changed cursor window before displaying it; dedupe alone cannot repair gaps. */
export async function reloadNoticeWindow(
  client: Pick<IsolatedNoticeClient, 'list'>,
  category: 'guide' | 'update' | null,
  previousCount: number,
  anchorId?: string,
) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const items: Notice[] = [];
      let cursor: unknown = null;
      for (let page = 0; page < 50; page++) {
        const result = await client.list(cursor, category);
        items.push(...result.items);
        cursor = result.nextCursor;
        if (
          cursor === null ||
          (items.length >= previousCount &&
            (!anchorId || items.some(item => item.id === anchorId)))
        ) {
          return { ...result, items };
        }
      }
      throw new NoticeError('SUPPORT_CURSOR_STALE');
    } catch (error) {
      if (
        attempt ||
        !(error instanceof NoticeError) ||
        error.code !== 'SUPPORT_CURSOR_STALE'
      )
        throw error;
    }
  }
  throw new NoticeError('SUPPORT_CURSOR_STALE');
}
