import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';

/** Compatibility for a pre-existing route; new Home entries open the inbox directly. */
export default function HomeQuickNotificationsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const redirected = useRef(false);
  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;
    navigation.replace('UserNotifications', { entrySource: 'home' });
  }, [navigation]);
  return null;
}
