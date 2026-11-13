import React from 'react';
import { AppState } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { Choices } from '../src/screens/Support/PreviewPrimitives';
import { NuriAlert } from '../src/app/ui/NuriAlert';
import IsolatedStaffTickets from '../src/screens/SupportIsolation/IsolatedStaffTickets';
import {
  IsolatedNoticeClient,
  NoticeError,
} from '../src/screens/SupportIsolation/isolatedNoticeClient';

async function setup(mode: 'staff' | 'alerts' = 'staff') {
  const client = new IsolatedNoticeClient();
  client.userId = 'staff-a';
  const thread: Awaited<ReturnType<IsolatedNoticeClient['ticketThread']>> = {
    id: 'ticket',
    title: null,
    category: 'bug',
    nextActor: 'staff',
    revision: 2,
    lastUserSeq: 1,
    messageSeq: 1,
    state: 'open',
    assignee: 'staff-a',
    messages: [
      {
        id: 'message',
        seq: 1,
        body: 'Question',
        author: 'user',
        createdAt: '2026-11-13T00:00:00Z',
        photos: [],
      },
    ],
  };
  jest
    .spyOn(client, 'staffTickets')
    .mockResolvedValue([
      {
        id: 'ticket',
        category: 'bug',
        state: 'open',
        nextActor: 'staff',
        createdAt: '2026-11-13T00:00:00Z',
        unread: true,
      },
    ]);
  jest.spyOn(client, 'staffMembers').mockResolvedValue(['staff-a', 'staff-b']);
  jest
    .spyOn(client, 'ticketThread')
    .mockImplementation(async (_id, after = 0) => ({
      ...thread,
      messages: thread.messages.filter(message => message.seq > after),
    }));
  jest.spyOn(client, 'notificationPage').mockResolvedValue({ items: [], hasMore: false, unreadCount: 0, timeZone: 'Asia/Seoul' });
  const onError = jest.fn();
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <IsolatedStaffTickets
          client={client}
          mode={mode}
          status={null}
          onBack={jest.fn()}
          onError={onError}
          onRecovered={jest.fn()}
        />
      </ThemeProvider>,
    );
  });
  const press = async (testID: string) => {
    await TestRenderer.act(async () =>
      tree.root.findByProps({ testID }).props.onPress(),
    );
  };
  if (mode === 'staff') await press('isolated-ticket-ticket');
  return { client, tree, thread, press, onError };
}
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});
it('preserves authorized reply draft on stale revision and refreshes without resending', async () => {
  const { client, tree, press, onError } = await setup();
  try {
    jest
      .spyOn(client, 'ticketCommand')
      .mockRejectedValue(new NoticeError('SUPPORT_REVISION_CONFLICT'));
    await TestRenderer.act(async () =>
      tree.root
        .findByProps({ testID: 'ticket-draft' })
        .props.onChangeText('Keep my draft'),
    );
    await press('ticket-send');
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'SUPPORT_REVISION_CONFLICT' }),
    );
    expect(tree.root.findByProps({ testID: 'ticket-draft' }).props.value).toBe(
      'Keep my draft',
    );
    await TestRenderer.act(async () =>
      tree.root
        .findByProps({ testID: 'ticket-pull-refresh' })
        .props.onRefresh(),
    );
    expect(client.ticketCommand).toHaveBeenCalledTimes(1);
    expect(tree.root.findByProps({ testID: 'ticket-draft' }).props.value).toBe(
      'Keep my draft',
    );
  } finally {
    await TestRenderer.act(async () => tree.unmount());
  }
});
it('hands off with seen-message revision and preserves draft on successful administrative action', async () => {
  const { client, tree, press } = await setup();
  try {
    jest
      .spyOn(client, 'ticketCommand')
      .mockResolvedValue({ id: 'ticket', revision: 3 });
    const alert = jest.spyOn(NuriAlert, 'alert');
    await TestRenderer.act(async () => {
      tree.root
        .findByProps({ testID: 'ticket-draft' })
        .props.onChangeText('Unsent draft');
      tree.root
        .findAllByType(Choices)
        .find(item => item.props.label === '인계할 담당자')
        ?.props.onChange('staff-b');
    });
    await press('ticket-transfer');
    await TestRenderer.act(async () =>
      alert.mock.calls[0][2]
        ?.find(button => button.text === '인계')
        ?.onPress?.(),
    );
    expect(client.ticketCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        p_operation: 'transfer',
        p_revision: 2,
        p_seen_user_seq: 1,
        p_assignee: 'staff-b',
      }),
    );
    expect(tree.root.findByProps({ testID: 'ticket-draft' }).props.value).toBe(
      'Unsent draft',
    );
  } finally {
    await TestRenderer.act(async () => tree.unmount());
  }
});
it('uses only reads for active-screen catch-up and removes its timer on unmount', async () => {
  jest.useFakeTimers();
  const oldState = AppState.currentState;
  AppState.currentState = 'active';
  const { client, tree } = await setup('alerts');
  const writes = jest.spyOn(client, 'ticketCommand');
  try {
    await TestRenderer.act(async () => {
      jest.advanceTimersByTime(15000);
    });
    expect(client.notificationPage).toHaveBeenCalledTimes(2);
    AppState.currentState = 'background';
    await TestRenderer.act(async () => {
      jest.advanceTimersByTime(15000);
    });
    expect(client.notificationPage).toHaveBeenCalledTimes(2);
    expect(writes).not.toHaveBeenCalled();
  } finally {
    await TestRenderer.act(async () => tree.unmount());
    AppState.currentState = oldState;
  }
  await TestRenderer.act(async () => {
    jest.advanceTimersByTime(15000);
  });
  expect(client.notificationPage).toHaveBeenCalledTimes(2);
});
