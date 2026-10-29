import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NotificationOpenReceipt } from '../services/notifications/openNotification';
import { markUserNotificationRead } from '../services/notifications/userNotifications';
import { appQueryClient } from '../services/query/appQueryClient';
import { notificationKeys } from './useNotificationInbox';
import { useAuthStore } from '../store/authStore';
import { showToast } from '../store/uiStore';

/** A native onAppear/transitionEnd plus committed domain success is required.
 * Mount, focus or dispatch alone never consumes an unread notification. */
export function useNotificationDestinationRead(receipt: NotificationOpenReceipt | undefined, ready: boolean) {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const [appeared, setAppeared] = useState<string | null>(null);
  const [failedRequest, setFailedRequest] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const completed = useRef<string | null>(null);
  const pending = useRef<string | null>(null);
  const scope = useRef({ active: false });
  const requestId = receipt?.requestId;
  const ownerId = receipt?.ownerId;
  useLayoutEffect(() => {
    if (!requestId || !ownerId) return;
    let root = navigation;
    for (let depth = 0; depth < 5 && !root.getState().routeNames.includes('AppTabs'); depth += 1) {
      const parent = root.getParent<NativeStackNavigationProp<ParamListBase> | undefined>();
      if (!parent) return;
      root = parent;
    }
    // A receipt belongs to one owner lifetime, not merely the same user ID
    // observed again after A -> B -> A. A new receipt gets a new scope object.
    const current = { active: useAuthStore.getState().session?.user.id === ownerId };
    scope.current = current;
    const unsubscribeOwner = useAuthStore.subscribe((next, previous) => {
      if (next.session?.user.id === previous.session?.user.id) return;
      current.active = false;
      setAppeared(null);
      setFailedRequest(null);
    });
    const onEnd = root.addListener('transitionEnd', event => {
      if (current.active && !event.data.closing && root.isFocused()) setAppeared(requestId);
    });
    const onBlur = root.addListener('blur', () => setAppeared(null));
    return () => { current.active = false; unsubscribeOwner(); onEnd(); onBlur(); };
  }, [navigation, ownerId, requestId]);
  useEffect(() => {
    if (!receipt || !ready || appeared !== receipt.requestId || pending.current === receipt.requestId || completed.current === receipt.requestId) return;
    const current = scope.current;
    const isCurrent = () => current.active && scope.current === current && useAuthStore.getState().session?.user.id === receipt.ownerId;
    if (!isCurrent()) return;
    pending.current = receipt.requestId;
    setFailedRequest(null);
    let mounted = true;
    markUserNotificationRead(receipt).then(async () => {
      if (!isCurrent()) return;
      completed.current = receipt.requestId;
      await appQueryClient.invalidateQueries({ queryKey: notificationKeys.owner(receipt.ownerId) });
    }).catch(() => {
      if (mounted && isCurrent()) {
        setFailedRequest(receipt.requestId);
        showToast({ tone: 'error', title: '읽음 상태를 저장하지 못했어요', message: '연결을 확인한 뒤 다시 시도해주세요.' });
      }
    }).finally(() => { if (pending.current === receipt.requestId) pending.current = null; });
    return () => { mounted = false; };
  }, [appeared, ready, receipt, retry]);
  const retryRead = useCallback(() => setRetry(value => value + 1), []);
  return { readError: Boolean(receipt && failedRequest === receipt.requestId), retryRead };
}
