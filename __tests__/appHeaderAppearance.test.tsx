import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { AppHeaderLayout } from '../src/components/navigation/AppHeaderLayout';
import { APP_HEADER } from '../src/components/navigation/headerAppearance';
import { HeaderHelpButton, HEADER_HELP } from '../src/components/navigation/HeaderHelpButton';
import { styles as scheduleStyles } from '../src/screens/Schedules/ScheduleListScreen.styles';

jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/components/common/PremiumNoticeModal', () => 'PremiumNoticeModal');
jest.mock('../src/components/icons/NuriSemanticIcon', () => 'NuriSemanticIcon');

it.each([0, 24, 36])('uses the Activity inset contract without a second content inset: top=%s', async top => {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<AppHeaderLayout topInset={top} subtitle="안내" style={{ paddingTop: 8, paddingHorizontal: 18 }}><View /></AppHeaderLayout>); });
  expect(StyleSheet.flatten(tree.root.findAllByType(View)[0].props.style)).toMatchObject({ paddingTop: top + 4, paddingHorizontal: 12, paddingBottom: 7 });
  await act(async () => tree.unmount());
});

it('keeps the schedule back target without a decorative ring', () => {
  const style: ViewStyle = StyleSheet.flatten(scheduleStyles.headerBackButton) ?? {};
  expect(style).toMatchObject({ width: 44, height: 44 });
  expect(style.borderWidth ?? 0).toBe(0);
  expect(style.borderRadius ?? 0).toBe(0);
});

it('keeps existing header actions and inset while normalizing caption type and spacing', async () => {
  const back = jest.fn(), action = jest.fn();
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(<AppHeaderLayout subtitle="아이와 함께할 일정을 모아봐요" style={{ paddingTop: 28 }}>
      <Pressable testID="back" onPress={back} />
      <View />
      <Pressable testID="action" onPress={action} />
    </AppHeaderLayout>);
  });
  const root = tree.root.findAllByType(View)[0];
  expect(StyleSheet.flatten(root.props.style)).toMatchObject({ paddingTop: 28, paddingBottom: 7, paddingHorizontal: 12 });
  const caption = tree.root.findAll(n => typeof n.type === 'string' && n.props.testID === 'app-header-subtitle')[0];
  expect(StyleSheet.flatten(caption.props.style)).toMatchObject({ fontSize: 11, lineHeight: 20, color: '#827D9F', marginTop: 2 });
  expect(caption.props.styleOverridesPreset).toBe(true);
  await act(async () => {
    tree.root.findByProps({ testID: 'back' }).props.onPress();
    tree.root.findByProps({ testID: 'action' }).props.onPress();
  });
  expect(back).toHaveBeenCalledTimes(1);
  expect(action).toHaveBeenCalledTimes(1);
  expect(APP_HEADER.title).toMatchObject({ fontSize: 17, lineHeight: 24, color: '#221351' });
  await act(async () => tree.unmount());
});

it.each(Object.keys(HEADER_HELP) as Array<keyof typeof HEADER_HELP>)('opens and closes the existing NURI notice for %s without a service action', async topic => {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<HeaderHelpButton topic={topic} />); });
  expect(tree.root.findAll(n => n.type === ('PremiumNoticeModal' as React.ElementType))).toHaveLength(0);
  const icon = tree.root.find(n => n.type === ('NuriSemanticIcon' as React.ElementType));
  expect(icon.props.size).toBe(24);
  const button = tree.root.findAllByProps({ testID: `header-help-${topic}` }).find(node => typeof node.props.onPress === 'function');
  if (!button) throw new Error('Missing header help action');
  await act(async () => button.props.onPress());
  const notice = tree.root.find(n => n.type === ('PremiumNoticeModal' as React.ElementType));
  expect(notice.props.titleLines).toEqual([HEADER_HELP[topic].title]);
  expect(notice.props.bodyLines).toBe(HEADER_HELP[topic].body);
  expect(notice.props.surfaceVariant).toBe('menuGlass');
  await act(async () => notice.props.onClose());
  expect(tree.root.findAll(n => n.type === ('PremiumNoticeModal' as React.ElementType))).toHaveLength(0);
  await act(async () => tree.unmount());
});
