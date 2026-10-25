import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { notificationKeys } from '../../hooks/useNotificationInbox';
import {
  fetchNotificationDetail,
  markUserNotificationRead,
} from '../../services/notifications/userNotifications';
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
  const queryClient = useQueryClient();
  const [readError, setReadError] = useState(false),
    [busy, setBusy] = useState(false);
  const reading = useRef(false);
  const detail = useQuery({
    queryKey: [
      ...notificationKeys.owner(userId),
      'detail',
      params.source,
      params.id,
    ],
    queryFn: () => fetchNotificationDetail(params.id, params.source),
    enabled: Boolean(userId),
    refetchOnMount: 'always',
  });
  const markRead = useCallback(async () => {
    if (!detail.data || reading.current || detail.data.readAt) return;
    reading.current = true;
    setReadError(false);
    try {
      await markUserNotificationRead({ id: params.id, source: params.source });
      if (useAuthStore.getState().session?.user.id !== userId) return;
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.owner(userId),
      });
    } catch {
      if (useAuthStore.getState().session?.user.id === userId)
        setReadError(true);
    } finally {
      reading.current = false;
    }
  }, [detail.data, params.id, params.source, queryClient, userId]);
  // A successful detail commit precedes the read mutation. List exposure never reads.
  useEffect(() => {
    if (detail.isSuccess && !readError) markRead();
  }, [detail.isSuccess, markRead, readError]);
  const onAction = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const item = await fetchNotificationDetail(params.id, params.source);
      if (useAuthStore.getState().session?.user.id !== userId) return;
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
      switch (target.kind) {
        case 'community_comment':
          navigation.navigate('CommunityComments', {
            postId: target.postId,
            commentId: target.commentId,
          });
          break;
        case 'community_post':
          navigation.navigate('CommunityDetail', { postId: target.postId });
          break;
        case 'schedule':
          navigation.navigate('ScheduleDetail', {
            scheduleId: target.scheduleId,
            petId: target.petId,
          });
          break;
        case 'record':
          navigation.navigate('AppTabs', {
            screen: 'TimelineTab',
            params: {
              screen: 'RecordDetail',
              params: { petId: target.petId, memoryId: target.memoryId },
            },
          });
          break;
        case 'title':
          navigation.navigate('PetActivityAchievements', {
            focusTitleId: target.titleId,
            focusPetId: target.petId,
          });
          break;
        case 'activity':
          navigation.navigate('PetActivityAchievements', {
            initialTab: 'summary',
          });
          break;
        case 'timeline_period': {
          const petId = target.petId ?? selectedPetId ?? pets[0]?.id;
          if (!petId) throw new Error('NURI_NOTIFICATION_PET_UNAVAILABLE');
          navigation.navigate('AppTabs', {
            screen: 'TimelineTab',
            params: {
              screen: 'TimelineMain',
              params: {
                petId,
                ymFilter: null,
                notificationEntryId: params.id,
                notificationPeriod: {
                  startDate: target.startDate,
                  endDate: target.endDate,
                },
              },
            },
          });
          break;
        }
        case 'pet_anniversary':
          navigation.navigate('AppTabs', {
            screen: 'TimelineTab',
            params: {
              screen: 'TimelineMain',
              params: { petId: target.petId, ymFilter: null, notificationPeriod:undefined,notificationEntryId:undefined },
            },
          });
          break;
        case 'notification_detail': {
          const month = item.payload?.month;
          if (
            item.payload?.layout === 'monthly_news' &&
            typeof month === 'string' &&
            /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
          ) {
            const petId = selectedPetId ?? pets[0]?.id;
            if (!petId) throw new Error('NURI_NOTIFICATION_PET_UNAVAILABLE');
            navigation.navigate('AppTabs', {
              screen: 'TimelineTab',
              params: {
                screen: 'TimelineMain',
                params: {
                  petId,
                  ymFilter: month,
                  notificationEntryId: params.id,
                  notificationPeriod: undefined,
                },
              },
            });
          } else navigation.goBack();
          break;
        }
      }
    } catch {
      showToast({
        tone: 'error',
        title: '관련 내용을 열지 못했어요',
        message: '연결 상태와 아이 정보를 확인한 뒤 다시 시도해주세요.',
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <NotificationCanvas top={insets.top}>
      <NotificationHeader title="알림 상세" onBack={navigation.goBack} />
      {detail.isPending ? (
        <NotificationState loading message="알림을 확인하고 있어요" />
      ) : detail.data ? (
        <NotificationDetailDesign
          item={detail.data}
          bottom={insets.bottom}
          onAction={() => {
            onAction();
          }}
          busy={busy}
          readError={readError}
          onRetryRead={() => {
            markRead();
          }}
        />
      ) : (
        <NotificationState
          message="삭제되었거나 확인할 수 없는 알림이에요"
          retry={() => {
            detail.refetch().catch(() => {});
          }}
        />
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
