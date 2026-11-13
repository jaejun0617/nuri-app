import React from 'react';
import { AppState } from 'react-native';
import { NuriAlert as Alert } from '../src/app/ui/NuriAlert';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import IsolatedNoticeScreen, {
  type IsolatedNoticeHandle,
  parseExpiryField,
} from '../src/screens/SupportIsolation/IsolatedNoticeScreen';
import {
  IsolatedNoticeClient,
  NoticeError,
  parseNotice,
} from '../src/screens/SupportIsolation/isolatedNoticeClient';

const notice = {
  id: 'QA-id',
  title: 'Test notice',
  category: 'guide' as const,
  pinned: false,
  readAt: null,
  date: '2026-11-13T00:00:00Z',
};
function renderedText(
  node: ReturnType<TestRenderer.ReactTestRenderer['toJSON']>,
): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(renderedText).join(' ');
  return [
    typeof node.props.value === 'string' ? node.props.value : '',
    ...(node.children ?? []).map(child =>
      typeof child === 'string' ? child : renderedText(child),
    ),
  ].join(' ');
}
async function setup(manager = true) {
  const client = new IsolatedNoticeClient();
  jest.spyOn(client, 'login').mockResolvedValue('synthetic-user');
  jest.spyOn(client, 'canManage').mockResolvedValue(manager);
  jest.spyOn(client, 'canViewTickets').mockResolvedValue(manager);
  jest.spyOn(client, 'canViewReports').mockResolvedValue(manager);
  jest.spyOn(client, 'staffTickets').mockResolvedValue([]);
  jest.spyOn(client, 'editor').mockResolvedValue({
    id: notice.id,
    revision: 3,
    title: notice.title,
    body: 'Draft body',
    category: 'guide',
    pinned: true,
    startsAt: null,
    expiresAt: '2027-01-01T00:00:00Z',
  });
  jest
    .spyOn(client, 'list')
    .mockResolvedValue({ items: [notice], count: 1, nextCursor: null });
  jest
    .spyOn(client, 'detail')
    .mockResolvedValue({ ...notice, body: 'Exact server body' });
  jest
    .spyOn(client, 'command')
    .mockResolvedValue({ id: notice.id, revision: 1 });
  jest.spyOn(client, 'dispose').mockImplementation(() => {});
  const ref = React.createRef<IsolatedNoticeHandle>();
  const exit = jest.fn();
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <IsolatedNoticeScreen
          ref={ref}
          createClient={() => client}
          onExit={exit}
        />
      </ThemeProvider>,
    );
  });
  const press = async (id: string) => {
    await TestRenderer.act(async () =>
      tree.root.findByProps({ testID: id }).props.onPress(),
    );
  };
  const change = async (id: string, value: string) => {
    await TestRenderer.act(async () =>
      tree.root.findByProps({ testID: id }).props.onChangeText(value),
    );
  };
  await change('isolated-email', 'qa@nuri15.test');
  await change('isolated-password', 'local-test-value');
  await press('isolated-login');
  return { tree, client, ref, exit, press, change };
}
afterEach(() => jest.restoreAllMocks());
it('parses only the declared notice contract', () => {
  expect(() =>
    parseNotice({ id: 'x', title: 'a', category: 'fake', pinned: false }),
  ).toThrow('INVALID_RESPONSE');
});
it('accepts only real local calendar dates for notice expiry', () => {
  expect(parseExpiryField('2026-12-15 09:30')).toBe(
    '2026-12-15T09:30:00+09:00',
  );
  expect(parseExpiryField('2026-02-30 09:30')).toBeUndefined();
  expect(parseExpiryField('')).toBeNull();
});

it('hides an already-open stopped notice after foreground revalidation', async () => {
  let activate: (() => void) | undefined;
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, listener) => {
      activate = () => listener('active');
      return { remove: jest.fn() };
    });
  const { tree, client, press } = await setup(false);
  try {
    await press('isolated-notice-QA-id');
    jest
      .spyOn(client, 'detail')
      .mockRejectedValue(new NoticeError('SUPPORT_NOT_FOUND'));
    jest
      .spyOn(client, 'list')
      .mockResolvedValue({ items: [], count: 0, nextCursor: null });
    await TestRenderer.act(async () => activate?.());
    expect(renderedText(tree.toJSON())).not.toContain('Exact server body');
    expect(renderedText(tree.toJSON())).toContain('등록된 공지가 없어요.');
  } finally {
    await TestRenderer.act(async () => tree.unmount());
  }
});
it('fetches detail without read, acknowledges only after layout, and Back reloads real list', async () => {
  const { tree, client, press, ref, exit } = await setup();
  try {
    await press('isolated-notice-QA-id');
    expect(client.detail).toHaveBeenCalledTimes(1);
    expect(client.detail).toHaveBeenCalledWith('QA-id');
    expect(JSON.stringify(tree.toJSON())).toContain('Exact server body');
    await TestRenderer.act(async () =>
      tree.root.findByProps({ testID: 'isolated-detail' }).props.onLayout(),
    );
    expect(client.detail).toHaveBeenLastCalledWith('QA-id', true);
    await TestRenderer.act(async () => ref.current?.back());
    expect(client.list).toHaveBeenCalledTimes(2);
    expect(exit).not.toHaveBeenCalled();
  } finally {
    await TestRenderer.act(async () => tree.unmount());
  }
  expect(client.dispose).toHaveBeenCalledTimes(1);
});
it('hides an open notice at expiry even without a database event', async () => {
  jest.useFakeTimers();
  const { tree, client, press } = await setup(false);
  try {
    jest
      .spyOn(client, 'detail')
      .mockResolvedValue({
        ...notice,
        body: 'Expiring body',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
      });
    await press('isolated-notice-QA-id');
    expect(renderedText(tree.toJSON())).toContain('Expiring body');
    jest
      .spyOn(client, 'list')
      .mockResolvedValue({ items: [], count: 0, nextCursor: null });
    await TestRenderer.act(async () => {
      jest.advanceTimersByTime(1001);
    });
    expect(renderedText(tree.toJSON())).not.toContain('Expiring body');
    expect(renderedText(tree.toJSON())).toContain('등록된 공지가 없어요.');
  } finally {
    await TestRenderer.act(async () => tree.unmount());
    jest.useRealTimers();
  }
});
it('does not acknowledge a failed detail request', async () => {
  const { tree, client, press } = await setup();
  try {
    jest
      .spyOn(client, 'detail')
      .mockRejectedValue(new NoticeError('SUPPORT_NOT_FOUND'));
    await press('isolated-notice-QA-id');
    expect(client.detail).toHaveBeenCalledTimes(1);
    expect(
      tree.root.findAllByProps({ testID: 'isolated-detail' }),
    ).toHaveLength(0);
  } finally {
    await TestRenderer.act(async () => tree.unmount());
  }
});
it('does not retry a failed read acknowledgment without user action', async () => {
  const { tree, client, press } = await setup();
  try {
    jest
      .spyOn(client, 'detail')
      .mockResolvedValueOnce({ ...notice, body: 'Body' })
      .mockRejectedValue(new NoticeError('NETWORK_UNCERTAIN'));
    await press('isolated-notice-QA-id');
    await TestRenderer.act(async () =>
      tree.root.findByProps({ testID: 'isolated-detail' }).props.onLayout(),
    );
    expect(client.detail).toHaveBeenCalledTimes(2);
  } finally {
    await TestRenderer.act(async () => tree.unmount());
  }
});
it('ordinary isolated user has no authoring control', async () => {
  const { tree } = await setup(false);
  try {
    expect(tree.root.findAllByProps({ testID: 'isolated-new' })).toHaveLength(
      0,
    );
    expect(
      tree.root.findAllByProps({ testID: 'isolated-tickets' }),
    ).toHaveLength(0);
    expect(
      tree.root.findAllByProps({ testID: 'isolated-reports' }),
    ).toHaveLength(0);
    await TestRenderer.act(async () =>
      tree.root
        .findByProps({ testID: 'isolated-notice-QA-id' })
        .props.onPress(),
    );
    expect(tree.root.findAllByProps({ testID: 'isolated-edit' })).toHaveLength(
      0,
    );
    expect(
      tree.root.findAllByProps({ testID: 'isolated-delete' }),
    ).toHaveLength(0);
  } finally {
    await TestRenderer.act(async () => tree.unmount());
  }
});
it('edits a server draft without losing pin or publication window', async () => {
  const { tree, client, press, change } = await setup();
  try {
    await press('isolated-notice-QA-id');
    await press('isolated-edit');
    expect(client.editor).toHaveBeenCalledWith(notice.id);
    await change('isolated-body', 'Updated body');
    expect(
      tree.root.findAllByProps({ testID: 'isolated-publish' }),
    ).toHaveLength(0);
    await press('isolated-save');
    expect(client.command).toHaveBeenCalledWith(
      expect.objectContaining({
        p_operation: 'save',
        p_id: notice.id,
        p_expected_revision: 3,
        p_content: {
          title: notice.title,
          body: 'Updated body',
          category: 'guide',
          pinned: true,
          startsAt: null,
          expiresAt: '2027-01-01T00:00:00Z',
        },
      }),
    );
  } finally {
    await TestRenderer.act(async () => tree.unmount());
  }
});
it('confirms deletion and resolves response loss with the same request', async () => {
  const { tree, client, press } = await setup();
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  try {
    await press('isolated-notice-QA-id');
    await press('isolated-edit');
    jest
      .spyOn(client, 'command')
      .mockRejectedValueOnce(new NoticeError('NETWORK_UNCERTAIN'))
      .mockResolvedValue({ id: notice.id, revision: 4 });
    await press('isolated-delete');
    expect(client.command).not.toHaveBeenCalled();
    await TestRenderer.act(async () =>
      alert.mock.calls
        .at(-1)?.[2]
        ?.find(button => button.text === '삭제')
        ?.onPress?.(),
    );
    const first = jest.mocked(client.command).mock.calls[0][0];
    expect(first).toMatchObject({
      p_operation: 'delete',
      p_id: notice.id,
      p_expected_revision: 3,
    });
    expect(
      tree.root.findByProps({ testID: 'isolated-body' }).props.editable,
    ).toBe(false);
    await press('isolated-save');
    expect(client.command).toHaveBeenNthCalledWith(2, first);
    expect(client.list).toHaveBeenCalledTimes(2);
  } finally {
    await TestRenderer.act(async () => tree.unmount());
  }
});
it('opens a separate authorized inquiry screen and clears it on revoked permission', async () => {
  const { tree, client, press } = await setup();
  try {
    jest
      .spyOn(client, 'staffTickets')
      .mockRejectedValue(new NoticeError('SUPPORT_FORBIDDEN'));
    await press('isolated-tickets');
    expect(client.staffTickets).toHaveBeenCalled();
    expect(
      tree.root.findAllByProps({ testID: 'isolated-tickets' }),
    ).toHaveLength(0);
  } finally {
    await TestRenderer.act(async () => tree.unmount());
  }
});
it('clears displayed content when read acknowledgment detects revoked access', async () => {
  const { tree, client, press } = await setup();
  try {
    jest
      .spyOn(client, 'detail')
      .mockResolvedValueOnce({ ...notice, body: 'Sensitive notice body' })
      .mockRejectedValue(new NoticeError('SUPPORT_FORBIDDEN'));
    await press('isolated-notice-QA-id');
    await TestRenderer.act(async () =>
      tree.root.findByProps({ testID: 'isolated-detail' }).props.onLayout(),
    );
    expect(renderedText(tree.toJSON())).not.toContain('Sensitive notice body');
    expect(tree.root.findAllByProps({ testID: 'isolated-new' })).toHaveLength(
      0,
    );
    expect(
      tree.root.findAllByProps({ testID: 'isolated-detail' }),
    ).toHaveLength(0);
  } finally {
    await TestRenderer.act(async () => tree.unmount());
  }
});
it('removes the author draft when a command is denied by current server permission', async () => {
  const { tree, client, press, change } = await setup();
  try {
    jest
      .spyOn(client, 'command')
      .mockRejectedValue(new NoticeError('SUPPORT_FORBIDDEN'));
    await press('isolated-new');
    await change('isolated-title', 'Private draft');
    await change('isolated-body', 'Private draft body');
    await press('isolated-save');
    expect(renderedText(tree.toJSON())).not.toContain('Private draft');
    expect(tree.root.findAllByProps({ testID: 'isolated-new' })).toHaveLength(
      0,
    );
  } finally {
    await TestRenderer.act(async () => tree.unmount());
  }
});
it('keeps uncertain save request key and requires publish confirmation', async () => {
  const { tree, client, press, change } = await setup();
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  try {
    jest
      .spyOn(client, 'command')
      .mockRejectedValueOnce(new NoticeError('NETWORK_UNCERTAIN'))
      .mockResolvedValue({ id: notice.id, revision: 1 });
    await press('isolated-new');
    await change('isolated-title', 'New title');
    await change('isolated-body', 'Body');
    await press('isolated-save');
    const first = jest.mocked(client.command).mock.calls[0][0];
    expect(
      tree.root.findByProps({ testID: 'isolated-title' }).props.editable,
    ).toBe(false);
    await press('isolated-save');
    expect(client.command).toHaveBeenNthCalledWith(2, first);
    await press('isolated-publish');
    expect(client.command).toHaveBeenCalledTimes(2);
    expect(alert).toHaveBeenCalledWith(
      '게시할까요?',
      expect.any(String),
      expect.any(Array),
    );
    const buttons = alert.mock.calls.at(-1)?.[2];
    await TestRenderer.act(async () =>
      buttons?.find(button => button.text === '게시')?.onPress?.(),
    );
    expect(client.command).toHaveBeenLastCalledWith(
      expect.objectContaining({
        p_operation: 'publish',
        p_id: notice.id,
        p_expected_revision: 1,
      }),
    );
  } finally {
    await TestRenderer.act(async () => tree.unmount());
  }
});
