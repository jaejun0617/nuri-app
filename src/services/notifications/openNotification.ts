import type { NavigatorScreenParams } from '@react-navigation/native';
import type { TimelineStackParamList } from '../../navigation/TimelineStackNavigator';
import type { UserNotificationItem, UserNotificationSource } from './userNotifications';

export type NotificationOpenReceipt = {
  id: string;
  source: UserNotificationSource;
  ownerId: string;
  requestId: string;
};

export type NotificationDestination =
  | { name: 'NotificationDetail'; params: { id: string; source: UserNotificationSource; notificationOpen: NotificationOpenReceipt } }
  | { name: 'CommunityComments'; params: { postId: string; commentId: string; notificationOpen: NotificationOpenReceipt } }
  | { name: 'CommunityDetail'; params: { postId: string; notificationOpen: NotificationOpenReceipt } }
  | { name: 'ScheduleDetail'; params: { petId: string; scheduleId: string; notificationOpen: NotificationOpenReceipt } }
  | { name: 'PetActivityAchievements'; params: { focusTitleId?: string; focusPetId?: string | null; initialTab?: 'summary' | 'vault'; notificationOpen: NotificationOpenReceipt } }
  | { name: 'NotificationTimeline'; params: NavigatorScreenParams<TimelineStackParamList> & { notificationOpen: NotificationOpenReceipt } };

export type NotificationStartup = {
  initialChecked: boolean;
  pending: boolean;
  destination: NotificationDestination | null;
  onConsumed: () => void;
};

// A network deadline, not a guessed transition/ready delay.
export const NOTIFICATION_LOOKUP_TIMEOUT_MS = 6_000;

let sequence = 0;
export function createNotificationOpenReceipt(input: { id: string; source: UserNotificationSource; ownerId: string }): NotificationOpenReceipt {
  sequence += 1;
  return { id: input.id, source: input.source, ownerId: input.ownerId, requestId: `${Date.now().toString(36)}-${sequence}` };
}

/** Only server-validated targets become internal routes. Unavailable/news retain
 * their readable detail; there is never an arbitrary route string or Home fallback. */
export function resolveNotificationDestination(item: UserNotificationItem, receipt: NotificationOpenReceipt, selectedPetId: string | null): NotificationDestination {
  const target = item.actionTarget;
  switch (target?.kind) {
    case 'community_comment': return { name: 'CommunityComments', params: { postId: target.postId, commentId: target.commentId, notificationOpen: receipt } };
    case 'community_post': return { name: 'CommunityDetail', params: { postId: target.postId, notificationOpen: receipt } };
    case 'schedule': return { name: 'ScheduleDetail', params: { petId: target.petId, scheduleId: target.scheduleId, notificationOpen: receipt } };
    case 'record': return { name: 'NotificationTimeline', params: { screen: 'RecordDetail', params: { petId: target.petId, memoryId: target.memoryId, notificationOpen: receipt }, notificationOpen: receipt } };
    case 'title': return { name: 'PetActivityAchievements', params: { focusTitleId: target.titleId, focusPetId: target.petId, notificationOpen: receipt } };
    case 'activity': return { name: 'PetActivityAchievements', params: { initialTab: 'summary', notificationOpen: receipt } };
    case 'timeline_period': {
      const petId = target.petId ?? selectedPetId;
      if (petId) return { name: 'NotificationTimeline', params: { screen: 'TimelineMain', params: { petId, notificationEntryId: receipt.id, notificationPeriod: { startDate: target.startDate, endDate: target.endDate }, ymFilter: null, notificationOpen: receipt }, notificationOpen: receipt } };
      break;
    }
    case 'pet_anniversary': return { name: 'NotificationTimeline', params: { screen: 'TimelineMain', params: { petId: target.petId, ymFilter: null, notificationOpen: receipt }, notificationOpen: receipt } };
  }
  return { name: 'NotificationDetail', params: { id: item.id, source: item.source, notificationOpen: receipt } };
}
