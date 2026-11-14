import React, { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppTextInput from '../../app/ui/AppTextInput';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import { useNotificationScope } from '../../app/providers/NotificationScopeProvider';
import { useOwnerOperation } from '../../hooks/useOwnerOperation';
import { NotificationCanvas, NotificationHeader, NotificationState } from '../Notifications/NotificationDesign';
import { IsolatedNoticeClient, newNoticeKey } from './isolatedNoticeClient';

/** Only the connection is selected here. The actual Home and inbox run unchanged routes. */
export default function MixedInboxLogin({ onClose }: { onClose: () => void }) {
  const { select } = useNotificationScope();
  const captureOwner = useOwnerOperation('select-local-notification-session');
  const { top } = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const connection = useRef<IsolatedNoticeClient | null>(null);
  useEffect(() => () => connection.current?.dispose(), []);
  const signIn = async () => {
    if (!__DEV__ || connection.current || !email.trim() || !password) return;
    const isOwner = captureOwner();
    const client = new IsolatedNoticeClient();
    connection.current = client;
    setPending(true);
    setError(false);
    try {
      const userId = await client.login(email.trim(), password);
      await client.mixedNotifications.unread();
      if (!isOwner() || connection.current !== client) return;
      connection.current = null;
      select({ client, userId, key: newNoticeKey(), api: client.mixedNotifications,
        isCurrent: () => client.userId === userId });
      onClose();
    } catch {
      if (isOwner() && connection.current === client) setError(true);
    } finally {
      if (connection.current === client) {
        connection.current = null;
        client.dispose();
        if (isOwner()) setPending(false);
      }
    }
  };
  if (!__DEV__) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <NotificationCanvas top={top}>
        <NotificationHeader title="격리 알림 연결" onBack={onClose} />
        <View style={styles.fields}>
          <AppTextInput testID="isolated-email" accessibilityLabel="격리 이메일" placeholder="격리 이메일" autoCapitalize="none" value={email} onChangeText={setEmail} editable={!pending} />
          <AppTextInput testID="isolated-password" accessibilityLabel="격리 비밀번호" placeholder="격리 비밀번호" secureTextEntry value={password} onChangeText={setPassword} editable={!pending} />
          <CtaButton testID="mixed-inbox-login" role="primary" disabled={pending || !email.trim() || !password} onPress={signIn}>
            <CtaText>격리 계정 연결</CtaText>
          </CtaButton>
          {error ? <NotificationState message="격리 계정을 연결하지 못했어요" /> : null}
        </View>
      </NotificationCanvas>
    </Modal>
  );
}
const styles = StyleSheet.create({ fields: { padding: 20, gap: 16 } });
