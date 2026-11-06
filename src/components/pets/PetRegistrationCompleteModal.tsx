import React, { memo, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, findNodeHandle, Image, Modal,
  ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../app/ui/AppText';
import type { Pet } from '../../store/petStore';
import { formatPetCalendarAgeLabel } from '../../services/pets/age';
import { formatPetCopy } from '../../utils/petDisplayName';
import { ACTIVITY_READING_TYPE } from '../../theme/activityTypography';
import { LAVENDER_CTA } from '../../app/theme/tokens/productAccent';

const ornaments = [
  { source: require('../../assets/onboarding/profile-completion/album.png'), x: 24, y: 27, w: 208, h: 176 },
  { source: require('../../assets/onboarding/profile-completion/fabric-toy.png'), x: 28, y: 193, w: 150, h: 118 },
  { source: require('../../assets/onboarding/profile-completion/ball.png'), x: 171, y: 238, w: 85, h: 88 },
  { source: require('../../assets/onboarding/profile-completion/ribbon.png'), x: 496, y: 32, w: 162, h: 164 },
  { source: require('../../assets/onboarding/profile-completion/glass-bead.png'), x: 647, y: 147, w: 41, h: 45 },
  { source: require('../../assets/onboarding/profile-completion/prints.png'), x: 486, y: 192, w: 217, h: 157 },
] as const;

export type PetRegistrationCompleteModalProps = {
  visible: boolean;
  pet: Pet | null;
  onStart: () => void;
};

/** A photo identity owns its load state, so late events cannot affect a new pet. */
const RegisteredPetPhoto = memo(function RegisteredPetPhotoView({ uri, name }: { uri: string | null; name: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  return (
    <>
      {uri && status !== 'failed' ? (
        <Image testID="registered-pet-photo" source={{ uri }} resizeMode="cover" fadeDuration={0}
          accessibilityLabel={`${name} 프로필 사진`} style={[styles.photo, { opacity: status === 'loaded' ? 1 : 0 }]}
          onLoad={() => setStatus('loaded')} onError={() => setStatus('failed')} />
      ) : (
        <AppText style={styles.photoFallback}>{uri ? '사진을 불러오지 못했어요' : '등록된 사진이 없어요'}</AppText>
      )}
      {uri && status === 'loading' ? <ActivityIndicator style={StyleSheet.absoluteFill} color="#6653A8" accessibilityLabel="프로필 사진 불러오는 중" /> : null}
    </>
  );
});

/** Saved-profile receipt only; never reads the globally selected pet. */
function PetRegistrationCompleteModal({ visible, pet, onStart }: PetRegistrationCompleteModalProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const panelWidth = Math.min(width * (728 / 852), 430);
  const scale = panelWidth / 728;
  const maxHeight = height - insets.top - insets.bottom - 24;
  const [panelHeight, setPanelHeight] = useState(875 * scale);
  const headingRef = useRef<React.ElementRef<typeof View>>(null);
  const startedRef = useRef(false);
  const uri = pet?.avatarUrl?.trim() || null;
  useEffect(() => { if (visible) startedRef.current = false; }, [visible, pet?.id]);
  const startOnce = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    onStart();
  };
  const top = Math.max(insets.top + 12, Math.min((height - panelHeight) / 2, height - insets.bottom - panelHeight - 12));
  const info = [
    ['품종', pet?.speciesDisplayName?.trim() || pet?.breed?.trim() || '미입력'],
    ['나이', formatPetCalendarAgeLabel(pet?.birthDate) || '미입력'],
    ['성별', pet?.gender === 'male' ? '남아' : pet?.gender === 'female' ? '여아' : '미입력'],
  ];
  return (
    <Modal transparent visible={visible && pet !== null} animationType="fade" statusBarTranslucent navigationBarTranslucent
      onRequestClose={startOnce}
      onShow={() => { const node = findNodeHandle(headingRef.current); if (node) AccessibilityInfo.setAccessibilityFocus(node); }}>
      <View style={styles.backdrop} accessibilityViewIsModal>
        <View testID="pet-registration-complete-panel" style={[styles.panel, { width: panelWidth, maxHeight, top, borderRadius: 52 * scale }]}
          onLayout={event => setPanelHeight(event.nativeEvent.layout.height)}>
          <LinearGradient colors={['#E6DCFD', '#EAE2FD', '#E7DDFC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill} pointerEvents="none" />
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 47 * scale }}>
            <View testID="registration-photo-area" style={{ height: 349 * scale, width: panelWidth }}>
              <View style={[styles.frameShadow, { left: 236 * scale, top: 49 * scale, width: 255 * scale, height: 243 * scale, borderRadius: 47 * scale }]}>
                <LinearGradient colors={['#C6A6FC', '#B88CF3']} style={[styles.frame, { borderRadius: 47 * scale }]}>
                  <View style={[styles.photoClip, { borderRadius: Math.max(0, 47 * scale - 3) }]}>
                    <RegisteredPetPhoto key={`${pet?.id}:${uri}`} uri={uri} name={pet?.name ?? ''} />
                  </View>
                </LinearGradient>
              </View>
              <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {ornaments.map((item, index) => <Image key={index} source={item.source} resizeMode="contain" fadeDuration={0}
                  style={{ position: 'absolute', left: item.x * scale, top: item.y * scale, width: item.w * scale, height: item.h * scale }} />)}
              </View>
            </View>
            <View style={{ paddingHorizontal: 48 * scale }}>
              <View style={[styles.info, { minHeight: 110 * scale, borderRadius: 38 * scale }]}>
                <View ref={headingRef} accessible accessibilityRole="header" accessibilityLabel={pet?.name}>
                  <AppText testID="registered-pet-name" style={styles.name}>{pet?.name}</AppText>
                </View>
                <View testID="registered-pet-breed-row" style={styles.breedRow}>
                  <AppText style={styles.label}>{info[0][0]}</AppText>
                  <AppText testID="registered-pet-0" style={styles.value}>{info[0][1]}</AppText>
                </View>
                <View testID="registered-pet-demographics-row" style={styles.demographicsRow}>
                  {info.slice(1).map(([label, value], index) => (
                    <View key={label} style={[styles.infoColumn, index > 0 && styles.infoDivider]}>
                      <AppText style={styles.label}>{label}</AppText>
                      <AppText testID={`registered-pet-${index + 1}`} style={styles.value}>{value}</AppText>
                    </View>
                  ))}
                </View>
              </View>
              <AppText accessibilityRole="header" style={[styles.title, { marginTop: 26 * scale }]}>등록이 완료되었어요!</AppText>
              <AppText style={[styles.body, { marginTop: 18 * scale }]}>
                {formatPetCopy('우리 아이와 함께할 소중한 추억들을', pet?.name)}{'\n'}차곡차곡 쌓아보세요.
              </AppText>
              <TouchableOpacity testID="pet-registration-start" accessibilityRole="button" accessibilityLabel="시작하기" activeOpacity={0.9}
                onPress={startOnce} style={[styles.button, { marginTop: 30 * scale, minHeight: 112 * scale, borderRadius: 36 * scale }]}>
                <LinearGradient colors={[...LAVENDER_CTA.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.buttonFill, { borderRadius: 36 * scale }]}>
                  <AppText style={styles.buttonText}>시작하기</AppText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(53,35,103,0.32)' },
  panel: { alignSelf: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#FEFDFF', shadowColor: '#3A2177', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 9 },
  frameShadow: { position: 'absolute', shadowColor: '#7146DA', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  frame: { flex: 1, overflow: 'hidden', borderWidth: 1, borderColor: '#FEFDFF', padding: 2 },
  photoClip: { flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: '100%' },
  photoFallback: { fontSize: 11, lineHeight: 17, textAlign: 'center', color: '#6653A8', paddingHorizontal: 8 },
  name: { ...ACTIVITY_READING_TYPE.title, color: '#370F81', textAlign: 'center', includeFontPadding: false },
  info: { alignItems: 'stretch', paddingVertical: 12, paddingHorizontal: 12, gap: 10, backgroundColor: 'rgba(204,182,250,0.26)' },
  breedRow: { alignItems: 'center', gap: 3 },
  demographicsRow: { flexDirection: 'row', alignItems: 'stretch' },
  infoColumn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, gap: 3 },
  infoDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#BDA0F3' },
  label: { ...ACTIVITY_READING_TYPE.body, color: '#61439A', textAlign: 'center', includeFontPadding: false },
  value: { ...ACTIVITY_READING_TYPE.label, fontWeight: '700', color: '#370F81', textAlign: 'center', includeFontPadding: false },
  title: { ...ACTIVITY_READING_TYPE.title, color: '#370F81', textAlign: 'center', includeFontPadding: false },
  body: { ...ACTIVITY_READING_TYPE.body, fontWeight: '400', color: '#6653A8', textAlign: 'center', includeFontPadding: false },
  button: { shadowColor: '#7948DF', shadowOpacity: 0.24, shadowRadius: 5, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  buttonFill: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  buttonText: { ...ACTIVITY_READING_TYPE.title, color: LAVENDER_CTA.text, textAlign: 'center', includeFontPadding: false },
});

export default memo(PetRegistrationCompleteModal);
