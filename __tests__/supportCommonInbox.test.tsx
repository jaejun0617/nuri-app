import React from 'react';
import { AppState, ScrollView } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { parseSupportNotificationPage, resolveSupportReplyNotification } from '../src/services/notifications/supportReplyNotifications';
import NotificationFeed from '../src/screens/Notifications/NotificationFeed';
import IsolatedStaffTickets from '../src/screens/SupportIsolation/IsolatedStaffTickets';
import { IsolatedNoticeClient } from '../src/screens/SupportIsolation/isolatedNoticeClient';
import { InquiryMessage } from '../src/screens/Support/InquiryPresentation';

const id = '11111111-1111-4111-8111-111111111111';
const ticket = '22222222-2222-4222-8222-222222222222';
const payload = { items: [{ id, source: 'support_reply', createdAt: '2026-11-13T15:00:00Z',
  isRead: false, target: { kind: 'support_ticket', ticketId: ticket, messageSeq: 25 } }],
  hasMore: false, unreadCount: 1, timeZone: 'Asia/Seoul' };
afterEach(() => jest.restoreAllMocks());
it('rejects untrusted targets and malformed read state without inventing read timestamps', async () => {
  const page = parseSupportNotificationPage(payload);
  expect(page.items[0].readAt).toBeUndefined();
  expect(page.items[0].isRead).toBe(false);
  for (const change of [{ isRead: 'false' }, { source: 'user' }, { target: { kind: 'route', ticketId: ticket } }]) {
    expect(() => parseSupportNotificationPage({ ...payload, items: [{ ...payload.items[0], ...change }] })).toThrow();
  }
  const lookup = jest.fn().mockRejectedValue(new Error('SUPPORT_NOT_FOUND'));
  await expect(resolveSupportReplyNotification(id, lookup)).rejects.toThrow('SUPPORT_NOT_FOUND');
  expect(lookup).toHaveBeenCalledWith(id);
});
it('uses the common feed, resolves the server event and loads the actual reply before acknowledging', async () => {
  const previousState = AppState.currentState;
  AppState.currentState = 'active';
  const client = new IsolatedNoticeClient(); client.userId = 'owner';
  const page = parseSupportNotificationPage(payload);
  jest.spyOn(client, 'notificationPage').mockResolvedValue(page);
  const target = jest.spyOn(client, 'notificationTarget').mockResolvedValue(page.items[0].target);
  const read = jest.spyOn(client, 'ticketThread').mockResolvedValue({
    id: ticket, title: 'Question', category: 'usage', state: 'open', nextActor: 'none',
    assignee: null, revision: 2, lastUserSeq: 24, messageSeq: 25,
    messages: [{ id, seq: 25, author: 'staff', body: 'Answer', createdAt: payload.items[0].createdAt, photos: [] }],
  });
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => { tree = TestRenderer.create(<ThemeProvider theme={createTheme('light')}>
    <IsolatedStaffTickets client={client} mode="alerts" status={null} onError={jest.fn()}
      onRecovered={jest.fn()} onBack={jest.fn()} />
  </ThemeProvider>); });
  try {
    expect(tree.root.findByType(NotificationFeed).props.items).toEqual(page.items);
    await TestRenderer.act(async () => { await tree.root.findByType(NotificationFeed).props.onOpen(page.items[0]); });
    expect(target).toHaveBeenCalledWith(id);
    expect(read).toHaveBeenCalledWith(ticket, 5);
    expect(read).toHaveBeenCalledTimes(1);
    expect(tree.root.findByType(InquiryMessage).findAll(node => node.props.children === 'Answer').length).toBeGreaterThan(0);
    const scroll = tree.root.findByType(ScrollView);
    const layouts: Array<(event: { nativeEvent: { layout: { y: number; height?: number } } }) => void> = [];
    for (let node = tree.root.findByType(InquiryMessage).parent; node && node !== scroll; node = node.parent) {
      const cb = node.props.onLayout;
      if (typeof cb === 'function' && !layouts.includes(cb)) layouts.push(cb);
    }
    const [rowLayout, groupLayout] = layouts;
    await TestRenderer.act(async () => {
      scroll.props.onLayout({ nativeEvent: { layout: { height: 600 } } });
      groupLayout({ nativeEvent: { layout: { y: 80 } } });
      rowLayout({ nativeEvent: { layout: { y: 700, height: 110 } } });
    });
    expect(read).toHaveBeenCalledTimes(1);
    await TestRenderer.act(async () => {
      scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 480 }, layoutMeasurement: { height: 600 } } });
    });
    expect(read).toHaveBeenLastCalledWith(ticket, 25, 25);
  } finally {
    await TestRenderer.act(async () => tree.unmount());
    AppState.currentState = previousState;
  }
});
