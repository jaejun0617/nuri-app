import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { NotificationDetailDesign } from '../src/screens/Notifications/NotificationDesign';
import type { UserNotificationItem } from '../src/services/notifications/userNotifications';

const item: UserNotificationItem = {
  id: '22222222-2222-4222-8222-222222222222', source: 'user',
  title: '누리 소식', body: '새로운 소식이에요.', type: 'notice',
  readAt: null, createdAt: '2026-11-05T00:00:00Z', category: 'news',
  actionTarget: { kind: 'notification_detail' },
};

it('centers the text-only action without changing its callback or busy lock', async () => {
  const onAction = jest.fn();
  let tree!: Renderer.ReactTestRenderer;
  const render = (busy: boolean) => <ThemeProvider theme={createTheme('light')}>
    <NotificationDetailDesign item={item} bottom={24} onAction={onAction} busy={busy} />
  </ThemeProvider>;
  await act(async () => { tree = Renderer.create(render(false)); });
  const button = () => tree.root.findAllByType(TouchableOpacity).find(node => node.props.testID === 'notification-detail-confirm')!;
  expect(StyleSheet.flatten(button().props.style)).toMatchObject({ justifyContent: 'center', alignItems: 'center' });
  expect(button().findAll(node => node.props.name === 'chevron-right')).toHaveLength(0);
  const label = button().findByType(Text);
  expect(label.props.children).toBe('확인');
  expect(StyleSheet.flatten(label.props.style).textAlign).toBe('center');
  await act(async () => button().props.onPress());
  expect(onAction).toHaveBeenCalledTimes(1);
  await act(async () => tree.update(render(true)));
  expect(button().props.disabled).toBe(true);
  expect(button().props.accessibilityState).toEqual({ disabled: true, busy: true });
  expect(button().findByType(Text).props.children).toBe('확인 중');
  await act(async () => tree.unmount());
});
