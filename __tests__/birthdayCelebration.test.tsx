import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, Modal, StyleSheet } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import BirthdayCelebrationModal from '../src/components/notifications/BirthdayCelebrationModal';
import { birthdayPetId, isBirthdayToday, claimHomeBirthday } from '../src/services/notifications/birthdayCelebration';
import { createNotificationOpenReceipt, resolveNotificationDestination } from '../src/services/notifications/openNotification';
import type { UserNotificationItem } from '../src/services/notifications/userNotifications';

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
it('uses the actual long pet name, image and independent Back/CTA actions', async () => {
  const close = jest.fn(), open = jest.fn();
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => { tree = Renderer.create(<ThemeProvider theme={createTheme('light')}><BirthdayCelebrationModal visible petName="아주 긴 실제 아이 이름" today onClose={close} onOpen={open} /></ThemeProvider>); });
  expect(JSON.stringify(tree.toJSON())).toContain('아주 긴 실제 아이 이름');
  const artwork = StyleSheet.flatten(tree.root.findByType(Image).props.style);
  expect(artwork.width).toBeGreaterThan(0);
  expect(artwork.width).toBeLessThanOrEqual(240);
  expect(artwork.height).toBe(artwork.width);
  const petLabel = tree.root.findAll(node => node.props.children === '아주 긴 실제 아이 이름' && node.props.fontModeOverride === 'jisu')[0];
  expect(StyleSheet.flatten(petLabel.props.style).fontSize).toBe(15);
  const greeting = tree.root.findAll(node => node.props.children === '생일을 축하해 ♡' && node.props.fontModeOverride === 'jisu')[0];
  expect(StyleSheet.flatten(greeting.props.style).fontSize).toBe(22);
  act(() => tree.root.findByType(Modal).props.onRequestClose());
  expect(close).toHaveBeenCalledTimes(1);
  expect(open).not.toHaveBeenCalled();
  const action = tree.root.findAll(node => node.props.accessibilityLabel === '함께한 추억 보기' && typeof node.props.onPress === 'function')[0];
  act(() => action.props.onPress());
  expect(open).toHaveBeenCalledTimes(1);
  await act(async () => tree.unmount());
});
