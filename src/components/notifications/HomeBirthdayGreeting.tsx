import React, { useEffect, useRef, useState } from 'react';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useOwnerOperation } from '../../hooks/useOwnerOperation';
import { fetchHomeBirthday, claimHomeBirthday, isBirthdayToday } from '../../services/notifications/birthdayCelebration';
import type { UserNotificationItem } from '../../services/notifications/userNotifications';
import { createNotificationOpenReceipt } from '../../services/notifications/openNotification';
import BirthdayCelebrationModal from './BirthdayCelebrationModal';

/** Mount with an owner/pet key. A delayed fetch or storage result cannot reopen
 * a greeting after leaving Home or switching account/selected pet. */
export default function HomeBirthdayGreeting({ owner, petId, petName, petAvatarUrl, enabled }: {
  owner: string; petId: string; petName: string; petAvatarUrl?: string | null; enabled: boolean;
}) {
  const focused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const capture = useOwnerOperation(`${owner}:${petId}`);
  const [shown, setShown] = useState<UserNotificationItem | null>(null);
  const opening = useRef(false);
  const query = useQuery({
    queryKey: ['notifications-v3', owner, 'home-birthday', petId],
    enabled: enabled && focused,
    staleTime: 30_000,
    queryFn: async () => {
      const current = capture();
      if (!current()) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
      const item = await fetchHomeBirthday(owner, petId);
      if (!current()) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
      return item;
    },
  });
  useEffect(() => {
    const item = query.data;
    if (!enabled || !focused || !query.isSuccess || query.isFetching || !item || !isBirthdayToday(item)) return;
    let active = true;
    const current = capture();
    claimHomeBirthday(owner, petId, item).then(claimed => {
      if (claimed && active && current()) setShown(item);
    }).catch(() => { /* Storage failure must not create an endless greeting. Inbox remains available. */ });
    return () => { active = false; };
  }, [capture, enabled, focused, owner, petId, query.data, query.isFetching, query.isSuccess]);
  return <BirthdayCelebrationModal visible={Boolean(enabled && focused && shown)} petId={petId} petName={petName} petAvatarUrl={petAvatarUrl} today
    onClose={() => setShown(null)} onOpen={() => {
      if (!shown || opening.current || !capture()()) return;
      opening.current = true;
      const receipt = createNotificationOpenReceipt({ id: shown.id, source: shown.source, ownerId: owner });
      setShown(null);
      navigation.navigate('NotificationTimeline', { screen: 'TimelineMain', params: { petId, ymFilter: null, notificationOpen: receipt }, notificationOpen: receipt });
    }} />;
}
