import React from 'react';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import CtaButton from '../src/app/ui/CtaButton';
import { Glass } from '../src/screens/Support/PreviewPrimitives';
import InquiryRegistrationForm from '../src/screens/Support/InquiryRegistrationForm';
import IsolatedStaffTickets from '../src/screens/SupportIsolation/IsolatedStaffTickets';
import {
  IsolatedNoticeClient,
  NoticeError,
} from '../src/screens/SupportIsolation/isolatedNoticeClient';
import SupportReplyInbox, {
  supportInboxRow,
} from '../src/screens/SupportIsolation/SupportReplyInbox';
import {
  groupNotifications,
  isNotificationRead,
} from '../src/services/notifications/notificationPresentation';

afterEach(() => jest.restoreAllMocks());

it('inherits the selected category and exposes long categories only in an accordion', async () => {
  const category = jest.fn();
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <InquiryRegistrationForm
          title=""
          body=""
          category="bug"
          photos={[]}
          disabled={false}
          onTitle={jest.fn()}
          onBody={jest.fn()}
          onCategory={category}
          onAddPhoto={jest.fn()}
          onRemovePhoto={jest.fn()}
          onRetryPhoto={jest.fn()}
          photoError=""
        />
      </ThemeProvider>,
    );
  });
  try {
    expect(tree.root.findAllByType(Glass)).toHaveLength(2);
    expect(
      tree.root.findAllByProps({ testID: 'inquiry-category-account' }),
    ).toHaveLength(0);
    expect(JSON.stringify(tree.toJSON())).toContain('오류·불편');
    await TestRenderer.act(async () =>
      tree.root
        .findByProps({ testID: 'inquiry-category-toggle' })
        .props.onPress(),
    );
    await TestRenderer.act(async () =>
      tree.root
        .findByProps({ testID: 'inquiry-category-account' })
        .props.onPress(),
    );
    expect(category).toHaveBeenCalledWith('account');
    expect(
      tree.root.findAllByProps({ testID: 'inquiry-category-account' }),
    ).toHaveLength(0);
    expect(
      tree.root.findByProps({ testID: 'ticket-title' }).props.maxLength,
    ).toBe(80);
    expect(
      tree.root.findByProps({ testID: 'ticket-draft' }).props.maxLength,
    ).toBe(2000);
  } finally {
    await TestRenderer.act(async () => tree.unmount());
  }
});

it('requires a title and retains the exact registration request after an uncertain response', async () => {
  const client = new IsolatedNoticeClient();
  client.userId = 'owner';
  const register = jest
    .spyOn(client, 'registerTicket')
    .mockRejectedValue(new NoticeError('NETWORK_UNCERTAIN'));
  jest.spyOn(client, 'myTickets').mockResolvedValue([]);
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <IsolatedStaffTickets
          client={client}
          mode="mine"
          initialCategory="bug"
          status={null}
          onError={jest.fn()}
          onRecovered={jest.fn()}
          onBack={jest.fn()}
        />
      </ThemeProvider>,
    );
  });
  const input = async (testID: string, value: string) =>
    TestRenderer.act(async () =>
      tree.root.findByProps({ testID }).props.onChangeText(value),
    );
  try {
    expect(
      tree.root
        .findAllByType(CtaButton)
        .some(button => button.props.testID === 'ticket-send'),
    ).toBe(true);
    await input('ticket-draft', 'Question body');
    expect(
      tree.root.findByProps({ testID: 'ticket-send' }).props.disabled,
    ).toBe(true);
    await input('ticket-title', 'Question title');
    expect(
      tree.root.findByProps({ testID: 'ticket-send' }).props.disabled,
    ).toBe(false);
    await TestRenderer.act(async () =>
      tree.root.findByProps({ testID: 'ticket-send' }).props.onPress(),
    );
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        p_title: 'Question title',
        p_body: 'Question body',
        p_category: 'bug',
      }),
    );
    expect(tree.root.findByProps({ testID: 'ticket-title' }).props.value).toBe(
      'Question title',
    );
    expect(
      tree.root.findByProps({ testID: 'ticket-title' }).props.editable,
    ).toBe(false);
    await TestRenderer.act(async () =>
      tree.root.findByProps({ testID: 'ticket-check-result' }).props.onPress(),
    );
    expect(register).toHaveBeenCalledTimes(2);
    expect(register.mock.calls[1][0]).toEqual(register.mock.calls[0][0]);
  } finally {
    await TestRenderer.act(async () => tree.unmount());
  }
});

it('renders shared inbox rows with server cursor read state and the exact inquiry target', async () => {
  const alert = {
    id: 'event',
    ticketId: 'ticket',
    createdAt: '2026-11-13T00:00:00Z',
    unread: true,
  };
  const read = supportInboxRow({ ...alert, unread: false });
  expect(isNotificationRead(read)).toBe(true);
  expect(read.readAt).toBeUndefined();
  expect(isNotificationRead(supportInboxRow(alert))).toBe(false);
  expect(
    groupNotifications([read, read], new Date(alert.createdAt), 'Asia/Seoul')[0]
      .items,
  ).toHaveLength(1);
  const open = jest.fn();
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <SupportReplyInbox alerts={[alert]} busy={false} onOpen={open} />
      </ThemeProvider>,
    );
  });
  try {
    await TestRenderer.act(async () =>
      tree.root
        .findByProps({ testID: 'notification-open-support_reply-event' })
        .props.onPress(),
    );
    expect(open).toHaveBeenCalledWith('ticket');
    expect(JSON.stringify(tree.toJSON())).toContain('읽지 않음');
  } finally {
    await TestRenderer.act(async () => tree.unmount());
  }
});
