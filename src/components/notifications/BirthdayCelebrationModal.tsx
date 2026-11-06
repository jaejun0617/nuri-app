import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTheme } from 'styled-components/native';
import AppText from '../../app/ui/AppText';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import NuriSemanticIcon from '../icons/NuriSemanticIcon';
import { MenuGlassSurface } from '../common/MenuGlassSurface';
import { useOptionalSafeAreaInsets } from '../../hooks/useOptionalSafeAreaInsets';
import { getResponsiveOverlayMaxHeight } from '../../services/app/responsiveLayout';

type Props = {
  visible: boolean;
  petName: string;
  today: boolean;
  busy?: boolean;
  onClose: () => void;
  onOpen: () => void;
  onShow?: () => void;
};

export default function BirthdayCelebrationModal({ visible, petName, today, busy = false, onClose, onOpen, onShow }: Props) {
  const theme = useTheme();
  const insets = useOptionalSafeAreaInsets();
  const { height } = useWindowDimensions();
  const maxHeight = getResponsiveOverlayMaxHeight({ windowHeight: height, topInset: insets.top, bottomInset: insets.bottom, verticalMargin: 20 });
  return <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose} onShow={onShow}>
    <View style={[s.backdrop, { backgroundColor: theme.colors.overlay }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="생일 안내 닫기" />
      <View testID="birthday-celebration" accessibilityViewIsModal style={[s.panel, { maxHeight }]}>
        <MenuGlassSurface radius={28} backed />
        <Pressable accessibilityRole="button" accessibilityLabel="생일 안내 닫기" onPress={onClose} style={s.close}>
          <NuriSemanticIcon family="feather" name="x" size={22} color={theme.colors.textPrimary} preserveOriginal />
        </Pressable>
        <ScrollView style={s.scroll} contentContainerStyle={s.content} bounces={false}>
          <Image source={require('../../assets/notifications/birthday-celebration.png')} resizeMode="contain" style={s.art} accessible={false} />
          <AppText preset="unifiedLabel" style={[s.eyebrow, { color: theme.colors.textSecondary }]}>{today ? '오늘의 특별한 순간' : '기억하고 싶은 특별한 날'}</AppText>
          <AppText preset="unifiedTitle" styleOverridesPreset accessibilityRole="header" style={[s.title, { color: theme.colors.textPrimary }]}>{petName}의 생일이에요</AppText>
          <AppText preset="bodySm" style={[s.body, { color: theme.colors.textSecondary }]}>태어나줘서 고마워.{ '\n' }함께한 소중한 순간을 간직해요.</AppText>
        </ScrollView>
        <CtaButton role="primary" accessibilityLabel="함께한 추억 보기" onPress={onOpen} disabled={busy} loading={busy} style={s.button}>
          <CtaText preset="unifiedLabel">함께한 추억 보기</CtaText>
        </CtaButton>
      </View>
    </View>
  </Modal>;
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  panel: { width: '100%', maxWidth: 420, alignSelf: 'center', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.78)', padding: 22, overflow: 'hidden' },
  close: { alignSelf: 'flex-end', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { alignItems: 'center', paddingBottom: 24 },
  art: { width: '100%', maxWidth: 240, aspectRatio: 1, alignSelf: 'center', marginBottom: 18 },
  eyebrow: { textAlign: 'center', marginBottom: 10 },
  title: { fontSize: 23, lineHeight: 32, fontWeight: '700', letterSpacing: 0, textAlign: 'center', width: '100%' },
  body: { textAlign: 'center', marginTop: 14, lineHeight: 23 },
  button: { minHeight: 50, width: '100%', borderRadius: 16 },
});
