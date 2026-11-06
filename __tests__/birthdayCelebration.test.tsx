import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, Modal, StyleSheet, Text } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { AppFontPreferenceProvider } from '../src/app/providers/AppFontPreferenceProvider';
import { APP_FONT_PREFERENCE_STORAGE_KEY } from '../src/services/local/appFontPreference';
import BirthdayCelebrationModal from '../src/components/notifications/BirthdayCelebrationModal';
import { birthdayPetId, isBirthdayToday, claimHomeBirthday } from '../src/services/notifications/birthdayCelebration';
import { createNotificationOpenReceipt, resolveNotificationDestination } from '../src/services/notifications/openNotification';
import type { UserNotificationItem } from '../src/services/notifications/userNotifications';
import { ACTIVITY_READING_TYPE } from '../src/theme/activityTypography';

jest.mock('../src/services/supabase/client', () => ({ supabase: {} }));
jest.mock('../src/components/common/MenuGlassSurface', () => ({ MenuGlassSurface: () => null }));
jest.mock('../src/components/icons/NuriSemanticIcon', () => 'Icon');
const item: UserNotificationItem = {
  id: 'birthday', source: 'user', title: '사랑의 생일이에요', body: '함께한 순간',
  type: 'event', eventType: 'pet.birthday', readAt: null, createdAt: '2026-11-06T00:00:00Z',
  availableAt: '2026-11-05T15:00:00Z', timeZone: 'Asia/Seoul', actionTarget: { kind: 'pet_anniversary', petId: 'pet' },
};
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-06T05:00:00Z'));
  const storage = new Map<string, string>();
  jest.mocked(AsyncStorage.getItem).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => { storage.set(key, value); });
});
afterEach(() => jest.useRealTimers());

it('uses the notification timezone and due date, not the recovery creation time or device day', () => {
  expect(isBirthdayToday(item)).toBe(true);
  expect(isBirthdayToday(item, new Date('2026-11-05T14:59:59Z'))).toBe(false);
  expect(isBirthdayToday(item, new Date('2026-11-06T15:00:00Z'))).toBe(false);
  expect(isBirthdayToday({ ...item, createdAt: '2026-11-07T00:00:00Z' })).toBe(true);
  expect(birthdayPetId({ ...item, actionTarget: { kind: 'unavailable' } })).toBeNull();
  expect(birthdayPetId({ ...item, eventType: 'pet.memorial' })).toBeNull();
});
it('records one presentation per owner/pet/local birthday without touching notification read state', async () => {
  await expect(claimHomeBirthday('owner-a', 'pet', item)).resolves.toBe(true);
  await expect(claimHomeBirthday('owner-a', 'pet', item)).resolves.toBe(false);
  await expect(claimHomeBirthday('owner-b', 'pet', item)).resolves.toBe(true);
  await expect(claimHomeBirthday('owner-a', 'wrong-pet', item)).resolves.toBe(false);
  expect(item.readAt).toBeNull();
});
it('routes only validated birthday targets through celebration detail, preserving other anniversaries', () => {
  const receipt = createNotificationOpenReceipt({ id: item.id, source: item.source, ownerId: 'owner' });
  expect(resolveNotificationDestination(item, receipt, null).name).toBe('NotificationDetail');
  expect(resolveNotificationDestination({ ...item, eventType: 'pet.together_anniversary' }, receipt, null).name).toBe('NotificationTimeline');
});
it.each(['pretendard', 'jisu'] as const)('respects the stored %s font with the actual name and independent Back/CTA actions', async mode => {
  const close = jest.fn(), open = jest.fn();
  const theme = createTheme('light');
  await AsyncStorage.setItem(APP_FONT_PREFERENCE_STORAGE_KEY, mode);
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => { tree = Renderer.create(<ThemeProvider theme={theme}><AppFontPreferenceProvider><BirthdayCelebrationModal visible petId="birthday-pet" petName="아주 긴 실제 아이 이름" petAvatarUrl="https://example.test/birthday-pet.jpg" today onClose={close} onOpen={open} /></AppFontPreferenceProvider></ThemeProvider>); });
  expect(JSON.stringify(tree.toJSON())).toContain('아주 긴 실제 아이 이름');
  const frame = StyleSheet.flatten(tree.root.findByProps({ testID: 'birthday-photo-frame' }).props.style);
  expect(frame.width).toBeGreaterThan(0);
  expect(frame.height / frame.width).toBeCloseTo(355 / 362);
  const photo = tree.root.findByProps({ testID: 'birthday-pet-photo' });
  expect(photo.props.source).toEqual({ uri: 'https://example.test/birthday-pet.jpg' });
  expect(photo.props.resizeMode).toBe('cover');
  expect(StyleSheet.flatten(photo.props.style).opacity).toBe(0);
  act(() => photo.props.onLoad());
  expect(StyleSheet.flatten(photo.props.style).opacity).toBe(1);
  const labels = tree.root.findAllByType(Text);
  expect(labels).toHaveLength(4);
  for (const label of labels) {
    expect(StyleSheet.flatten(label.props.style).fontFamily).toBe(theme.typography.appFontMode[mode].fontFamily);
  }
  const greeting = labels.find(node => node.props.children === '아주 긴 실제 아이 이름아,\n생일을 축하해!');
  expect(greeting).toBeDefined();
  if (!greeting) throw new Error('Missing birthday greeting');
  expect(StyleSheet.flatten(greeting.props.style).fontSize).toBe(ACTIVITY_READING_TYPE.title.fontSize);
  expect(StyleSheet.flatten(tree.root.findByProps({ testID: 'birthday-eyebrow' }).props.style).fontSize).toBe(ACTIVITY_READING_TYPE.label.fontSize);
  expect(StyleSheet.flatten(tree.root.findByProps({ testID: 'birthday-message' }).props.style).fontSize).toBe(ACTIVITY_READING_TYPE.body.fontSize);
  expect(tree.root.findAllByType(Image).filter(node => node.props.testID?.startsWith('birthday-decoration-'))).toHaveLength(12);
  expect(tree.root.findAllByProps({ testID: 'birthday-decoration-party-hat' })).toHaveLength(0);
  expect(tree.root.findAllByType(Image).filter(node => node.props.testID?.startsWith('birthday-decoration-')).every(node => node.props.accessible === false)).toBe(true);
  act(() => tree.root.findByType(Modal).props.onRequestClose());
  expect(close).toHaveBeenCalledTimes(1);
  expect(open).not.toHaveBeenCalled();
  const action = tree.root.findAll(node => node.props.accessibilityLabel === '함께한 추억 보기' && typeof node.props.onPress === 'function')[0];
  await act(async () => { await action.props.onPress(); });
  expect(open).toHaveBeenCalledTimes(1);
  await act(async () => tree.unmount());
});

it.each([['누리', '누리야,\n생일을 축하해!'], ['사랑', '사랑아,\n생일을 축하해!'], ['', '생일을 축하해!']])('uses the actual %s name without an empty or invented vocative', async (name, expected) => {
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => { tree = Renderer.create(<ThemeProvider theme={createTheme('light')}><BirthdayCelebrationModal visible petId="pet" petName={name} today onClose={jest.fn()} onOpen={jest.fn()} /></ThemeProvider>); });
  expect(tree.root.findByProps({ testID: 'birthday-greeting' }).props.children).toBe(expected);
  expect(tree.root.findAllByProps({ testID: 'birthday-pet-photo' })).toHaveLength(0);
  expect(JSON.stringify(tree.toJSON())).toContain('등록된 사진이 없어요');
  await act(async () => tree.unmount());
});

it('keeps a failed photo bounded and resets its state before a different pet loads', async () => {
  let tree!: Renderer.ReactTestRenderer;
  const render = (id: string, uri: string) => <ThemeProvider theme={createTheme('light')}><BirthdayCelebrationModal visible petId={id} petName={id} petAvatarUrl={uri} today onClose={jest.fn()} onOpen={jest.fn()} /></ThemeProvider>;
  await act(async () => { tree = Renderer.create(render('first', 'https://example.test/first.jpg')); });
  const first = tree.root.findByProps({ testID: 'birthday-pet-photo' });
  const frame = StyleSheet.flatten(tree.root.findByProps({ testID: 'birthday-photo-frame' }).props.style);
  act(() => first.props.onError());
  expect(JSON.stringify(tree.toJSON())).toContain('사진을 불러오지 못했어요');
  await act(async () => tree.update(render('second', 'https://example.test/second.jpg')));
  const second = tree.root.findByProps({ testID: 'birthday-pet-photo' });
  expect(second.props.source.uri).toBe('https://example.test/second.jpg');
  expect(StyleSheet.flatten(second.props.style).opacity).toBe(0);
  expect(StyleSheet.flatten(tree.root.findByProps({ testID: 'birthday-photo-frame' }).props.style)).toEqual(frame);
  await act(async () => tree.unmount());
});

it('serializes rapid memory CTA presses until the original action completes', async () => {
  let finish!: () => void;
  const open = jest.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => { tree = Renderer.create(<ThemeProvider theme={createTheme('light')}><BirthdayCelebrationModal visible petId="pet" petName="누리" today onClose={jest.fn()} onOpen={open} /></ThemeProvider>); });
  const action = tree.root.findAll(node => node.props.accessibilityLabel === '함께한 추억 보기' && typeof node.props.onPress === 'function')[0];
  act(() => { action.props.onPress(); action.props.onPress(); });
  expect(open).toHaveBeenCalledTimes(1);
  await act(async () => finish());
  await act(async () => tree.unmount());
});
