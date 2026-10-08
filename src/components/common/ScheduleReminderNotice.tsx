import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import AppText from '../../app/ui/AppText';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import { SeasonalFormPanel } from './SeasonalFormSurface';

export default function ScheduleReminderNotice({
  visible,
  onClose,
  embedded = false,
}: {
  visible: boolean;
  onClose: () => void;
  embedded?: boolean;
}) {
  if (!visible) return null;
  const content = (
    <View style={[styles.backdrop, embedded ? StyleSheet.absoluteFill : null]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityLabel="알림 시간 확인 닫기"
      />
      <SeasonalFormPanel style={styles.panel}>
        <AppText preset="unifiedTitle" style={styles.title}>
          알림 시간 확인
        </AppText>
        <AppText preset="unifiedBody" style={styles.body}>
          선택한 알림 시점이 이미 지났어요. 더 짧은 간격으로 바꾸거나 직접
          설정해 주세요.
        </AppText>
        <CtaButton role="primary" onPress={onClose}>
          <CtaText preset="unifiedBody">다시 설정하기</CtaText>
        </CtaButton>
      </SeasonalFormPanel>
    </View>
  );
  return embedded ? (
    content
  ) : (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {content}
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(16,32,51,0.3)',
  },
  panel: {
    maxWidth: 440,
    alignSelf: 'center',
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.76)',
  },
  title: { color: '#172334', fontWeight: '800', textAlign: 'center' },
  body: { color: '#465363', textAlign: 'center' },
});
