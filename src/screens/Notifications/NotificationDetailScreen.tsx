import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StackActions, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { notificationKeys } from '../../hooks/useNotificationInbox';
import { fetchNotificationDetail } from '../../services/notifications/userNotifications';
import { createNotificationOpenReceipt, NOTIFICATION_LOOKUP_TIMEOUT_MS, resolveNotificationDestination } from '../../services/notifications/openNotification';
import { withTimeout } from '../../services/app/boot';
import { useOwnerOperation } from '../../hooks/useOwnerOperation';
import { useNotificationDestinationRead } from '../../hooks/useNotificationDestinationRead';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { showToast } from '../../store/uiStore';
import {
  NotificationCanvas,
  NotificationHeader,
  NotificationDetailDesign,
  NotificationState,
} from './NotificationDesign';

function NotificationDetailContent() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, 'NotificationDetail'>
    >();
  const { params } = useRoute<RootScreenRoute<'NotificationDetail'>>();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore(s => s.session?.user.id ?? null);
  const [busy, setBusy] = useState(false);
  const acting = useRef(false);
  const redirected = useRef<string | null>(null);
  const captureCurrent = useOwnerOperation(`${params.source}:${params.id}`);
  const receipt = useMemo(() => params.notificationOpen ?? (userId
    ? createNotificationOpenReceipt({ id: params.id, source: params.source, ownerId: userId })
    : undefined), [params.id, params.notificationOpen, params.source, userId]);
  const ownerMatches = Boolean(userId && receipt?.ownerId === userId);
  const detail = useQuery({
    queryKey: [
      ...notificationKeys.owner(userId),
      'detail',
      params.source,
      params.id,
    ],
    queryFn: async () => {
      const current = captureCurrent();
      if (!current() || receipt?.ownerId !== userId) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
      const item = await withTimeout(fetchNotificationDetail(params.id, params.source), NOTIFICATION_LOOKUP_TIMEOUT_MS, 'notification detail');
      if (!current()) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
      return item;
    },
    enabled: ownerMatches,
    refetchOnMount: 'always',
    retry: params.resolveTargetOnLoad ? false : undefined,
  });
  const autoDestination = useMemo(() => {
    if (!params.resolveTargetOnLoad || !receipt || !detail.isSuccess || detail.isFetching || !detail.data) return null;
    const pets = usePetStore.getState();
    return resolveNotificationDestination(detail.data, receipt, pets.selectedPetId ?? pets.pets[0]?.id ?? null);
  }, [detail.data, detail.isFetching, detail.isSuccess, params.resolveTargetOnLoad, receipt]);
  const resolvingTarget = Boolean(params.resolveTargetOnLoad && autoDestination?.name !== 'NotificationDetail');
  useEffect(() => {
    if (!autoDestination || !receipt || redirected.current === receipt.requestId || receipt.ownerId !== userId || useAuthStore.getState().session?.user.id !== userId || !navigation.isFocused()) return;
    redirected.current = receipt.requestId;
    if (autoDestination.name === 'NotificationDetail') {
      navigation.setParams({ resolveTargetOnLoad: undefined });
      return;
    }
    // Replace only this request screen so Back returns to the original context.
    navigation.dispatch(StackActions.replace(autoDestination.name, autoDestination.params));
  }, [autoDestination, navigation, receipt, userId]);
  const { readError, retryRead } = useNotificationDestinationRead(receipt, Boolean(!resolvingTarget && detail.data && detail.isSuccess));
  const onAction = async () => {
    if (acting.current || !receipt) return;
    acting.current = true;
    setBusy(true);
    try {
      const item = await fetchNotificationDetail(params.id, params.source);
      if (useAuthStore.getState().session?.user.id !== userId || !navigation.isFocused()) return;
      const target = item.actionTarget;
      if (!target || target.kind === 'unavailable') {
        showToast({
          tone: 'info',
          title: '지금은 확인할 수 없어요',
          message: '삭제되었거나 접근 권한이 변경된 대상이에요.',
        });
        detail.refetch().catch(() => {});
        return;
      }
      const pets = usePetStore.getState().pets,
        selectedPetId = usePetStore.getState().selectedPetId;
      if (target.kind === 'notification_detail') {
          const month = item.payload?.month;
          if (
            item.payload?.layout === 'monthly_news' &&
            typeof month === 'string' &&
            /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
          ) {
            const petId = selectedPetId ?? pets[0]?.id;
            if (!petId) throw new Error('NURI_NOTIFICATION_PET_UNAVAILABLE');
            navigation.dispatch(StackActions.push('NotificationTimeline', {
              notificationOpen: receipt,
              screen: 'TimelineMain',
              params: {
                  petId,
                  ymFilter: month,
                  notificationEntryId: params.id,
                  notificationPeriod: undefined,
                  notificationOpen: receipt,
              },
            }));
          } else navigation.goBack();
      } else {
        const destination = resolveNotificationDestination(item, receipt, selectedPetId ?? pets[0]?.id ?? null);
        if (destination.name === 'NotificationDetail') throw new Error('NURI_NOTIFICATION_PET_UNAVAILABLE');
        navigation.dispatch(StackActions.push(destination.name, destination.params));
      }
    } catch {
      showToast({
        tone: 'error',
        title: '관련 내용을 열지 못했어요',
        message: '연결 상태와 아이 정보를 확인한 뒤 다시 시도해주세요.',
      });
    } finally {
      acting.current = false;
      setBusy(false);
    }
  };
  return (
    <NotificationCanvas top={insets.top}>
      <NotificationHeader title="알림 상세" onBack={navigation.goBack} />
      {!ownerMatches ? (
        <NotificationState message="현재 계정에서 확인할 수 없는 알림이에요" />
      ) : detail.isPending || (resolvingTarget && !detail.isError) ? (
        <NotificationState loading message="알림을 확인하고 있어요" />
      ) : detail.isError && (params.resolveTargetOnLoad || !detail.data) ? (
        <NotificationState message="알림을 불러오지 못했어요" retry={() => { detail.refetch().catch(() => {}); }} />
      ) : detail.data ? (
        <NotificationDetailDesign
          item={detail.data}
          bottom={insets.bottom}
          onAction={() => {
            onAction();
          }}
          busy={busy}
          readError={readError}
          onRetryRead={retryRead}
        />
      ) : (
        <NotificationState message="삭제되었거나 확인할 수 없는 알림이에요" />
      )}
    </NotificationCanvas>
  );
}

export default function NotificationDetailScreen() {
  const { params } = useRoute<RootScreenRoute<'NotificationDetail'>>();
  const userId = useAuthStore(s => s.session?.user.id ?? null);
  return (
    <NotificationDetailContent
      key={`${userId}:${params.source}:${params.id}`}
    />
  );
}
