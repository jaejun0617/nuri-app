import React, { useEffect, useRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppText from '../../app/ui/AppText';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import NuriSemanticIcon from '../icons/NuriSemanticIcon';
import BirthdayPortrait from './BirthdayPortrait';
import { useOptionalSafeAreaInsets } from '../../hooks/useOptionalSafeAreaInsets';
import { getResponsiveOverlayMaxHeight } from '../../services/app/responsiveLayout';
import { ACTIVITY_READING_TYPE as TYPE } from '../../theme/activityTypography';
import { appendKoreanParticle } from '../../utils/koreanParticle';
import { getPetDisplayName } from '../../utils/petDisplayName';

type Props = {
  visible: boolean;
  petId: string;
  petName: string;
  petAvatarUrl?: string | null;
  today: boolean;
  busy?: boolean;
  onClose: () => void;
  onOpen: () => void | Promise<void>;
  onShow?: () => void;
};

export default function BirthdayCelebrationModal({ visible, petId, petName, petAvatarUrl, today, busy = false, onClose, onOpen, onShow }: Props) {
  const insets = useOptionalSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const opening = useRef(false);
  useEffect(() => { opening.current = false; }, [visible, petId]);
  const maxHeight = getResponsiveOverlayMaxHeight({ windowHeight: height, topInset: insets.top, bottomInset: insets.bottom, verticalMargin: 16 });
  const panelWidth = Math.min(width * 745 / 852, 440);
  const scale = Math.min(panelWidth / 745, maxHeight / 1210);
  const name = getPetDisplayName(petName);
  const greeting = petName.trim() ? `${appendKoreanParticle(name, '야', '아')},\n생일을 축하해!` : '생일을 축하해!';
  const open = async () => {
    if (opening.current || busy || !visible) return;
    opening.current = true;
    try { await onOpen(); } finally { opening.current = false; }
  };
  return <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose} onShow={onShow}>
    <View style={[s.backdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
      <View testID="birthday-celebration" accessibilityViewIsModal style={[s.panel, { width: panelWidth, maxHeight, borderRadius: 64 * scale }]}>
        <LinearGradient colors={['#EFE5FD', '#EEE3FD', '#ECE0FD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <ScrollView style={s.scroll} contentContainerStyle={s.content} bounces={false}>
          <BirthdayPortrait petId={petId} name={name} uri={petAvatarUrl?.trim() || null} today={today} scale={scale} />
          <View style={[s.textArea, { paddingHorizontal: 47 * scale, paddingTop: 16 * scale, paddingBottom: 47 * scale, width: '100%' }]}>
            <View style={{ width: '100%' }}>
              <AppText testID="birthday-greeting" preset="unifiedTitle" styleOverridesPreset accessibilityRole="header" style={s.title}>{greeting}</AppText>
            </View>
            <View style={{ marginTop: 8, width: '100%' }}>
              <AppText testID="birthday-message" preset="bodySm" styleOverridesPreset style={s.body}>태어나줘서 고마워.{ '\n' }사랑과 행복이 가득한 하루 보내!</AppText>
            </View>
            <CtaButton role="primary" accessibilityLabel="함께한 추억 보기" onPress={open} disabled={busy} loading={busy}
              style={[s.button, { minHeight: Math.max(48, 105 * scale), borderRadius: 42 * scale, marginTop: 30 * scale }]}>
              <CtaText preset="unifiedLabel" styleOverridesPreset style={s.buttonText}>함께한 추억 보기</CtaText>
            </CtaButton>
          </View>
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} style={[s.close, { top: 26 * scale, right: 22 * scale }]}>
          <NuriSemanticIcon family="feather" name="x" size={22} color="#000000" preserveOriginal />
        </Pressable>
      </View>
    </View>
  </Modal>;
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(41,32,63,0.40)' },
  panel: { alignSelf: 'center', borderWidth: 1, borderColor: '#FEFDFF', backgroundColor: '#EEE3FD', overflow: 'hidden', shadowColor: '#3C2661', shadowOpacity: .19, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 9 },
  close: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { alignItems: 'center' },
  textArea: { alignItems: 'center' },
  title: { ...TYPE.title, color: '#3C086A', textAlign: 'center', width: '100%', letterSpacing: 0 },
  body: { ...TYPE.body, color: '#926DAE', textAlign: 'center', width: '100%', letterSpacing: 0 },
  buttonText: { ...TYPE.label, fontWeight: '700', textAlign: 'center', letterSpacing: 0 },
  button: { width: '100%' },
});
