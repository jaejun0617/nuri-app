import { useCallback, useEffect, useRef, useState } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { fetchNotificationDetail, type UserNotificationSource } from '../services/notifications/userNotifications';
import { createNotificationOpenReceipt, NOTIFICATION_LOOKUP_TIMEOUT_MS, resolveNotificationDestination } from '../services/notifications/openNotification';
import { withTimeout } from '../services/app/boot';
import { useAuthStore } from '../store/authStore';
import { usePetStore } from '../store/petStore';
import { showToast } from '../store/uiStore';

/** Fetch while the origin remains visible, then dispatch one destination. The
 * destination, not this request, acknowledges successful presentation/read. */
export function useOpenNotification(mode: 'push' | 'replace' = 'push') {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scope = useRef({ active: true, pending: false, version: 0 });
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    const current = scope.current;
    current.active = true;
    const unsubscribe = navigation.addListener('blur', () => { current.version += 1; });
    const unsubscribeOwner = useAuthStore.subscribe((next, previous) => {
      if (next.session?.user.id !== previous.session?.user.id) current.version += 1;
    });
    return () => { current.active = false; unsubscribe(); unsubscribeOwner(); };
  }, [navigation]);
  const open = useCallback(async (input: { id: string; source: UserNotificationSource }) => {
    const current = scope.current;
    const ownerId = useAuthStore.getState().session?.user.id;
    if (!ownerId || current.pending || !navigation.isFocused()) return;
    current.pending = true;
    const version = current.version;
    setOpening(true);
    try {
      const item = await withTimeout(fetchNotificationDetail(input.id, input.source), NOTIFICATION_LOOKUP_TIMEOUT_MS, 'notification detail');
      if (!current.active || current.version !== version || !navigation.isFocused() || useAuthStore.getState().session?.user.id !== ownerId) return;
      const pets = usePetStore.getState();
      const receipt = createNotificationOpenReceipt({ ...input, ownerId });
      const destination = resolveNotificationDestination(item, receipt, pets.selectedPetId ?? pets.pets[0]?.id ?? null);
      navigation.dispatch(mode === 'replace'
        ? StackActions.replace(destination.name, destination.params)
        : StackActions.push(destination.name, destination.params));
    } catch {
      if (current.active && current.version === version && useAuthStore.getState().session?.user.id === ownerId) showToast({ tone: 'error', title: '알림을 열지 못했어요', message: '연결 상태를 확인하고 다시 눌러주세요.' });
    } finally {
      current.pending = false;
      if (current.active) setOpening(false);
    }
  }, [mode, navigation]);
  return { open, opening };
}
