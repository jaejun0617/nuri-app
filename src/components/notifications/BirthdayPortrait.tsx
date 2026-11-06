import React, { memo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppText from '../../app/ui/AppText';
import { ACTIVITY_READING_TYPE as TYPE } from '../../theme/activityTypography';

const HEADER_OFFSET = 24;
const decorations = [
  { key: 'garland', source: require('../../assets/notifications/birthday-party/garland.png'), box: [52, 323, 258, 191] },
  { key: 'balloons', source: require('../../assets/notifications/birthday-party/balloons.png'), box: [576, 467, 186, 403] },
  { key: 'cake', source: require('../../assets/notifications/birthday-party/cake.png'), box: [84, 725, 234, 278] },
  { key: 'gifts', source: require('../../assets/notifications/birthday-party/gifts.png'), box: [524, 765, 242, 243] },
  { key: 'ribbon', source: require('../../assets/notifications/birthday-party/ribbon.png'), box: [266, 914, 284, 90] },
  { key: 'confetti-purple', source: require('../../assets/notifications/birthday-party/confetti-purple.png'), box: [197, 532, 42, 40] },
  { key: 'confetti-yellow-left', source: require('../../assets/notifications/birthday-party/confetti-yellow-left.png'), box: [141, 600, 49, 44] },
  { key: 'confetti-pink-left', source: require('../../assets/notifications/birthday-party/confetti-pink-left.png'), box: [99, 670, 44, 42] },
  { key: 'confetti-yellow-right', source: require('../../assets/notifications/birthday-party/confetti-yellow-right.png'), box: [691, 709, 47, 44] },
  { key: 'confetti-pink-right', source: require('../../assets/notifications/birthday-party/confetti-pink-right.png'), box: [714, 940, 52, 47] },
  { key: 'spark-left', source: require('../../assets/notifications/birthday-party/spark-left.png'), box: [271, 440, 38, 44] },
  { key: 'spark-right', source: require('../../assets/notifications/birthday-party/spark-right.png'), box: [545, 435, 38, 43] },
] as const;

/** A photo identity owns its load state, including late Image callbacks. */
const BirthdayPhoto = memo(function BirthdayPhotoView({ uri, name }: { uri: string | null; name: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>(uri ? 'loading' : 'failed');
  return <>
    {uri ? <Image testID="birthday-pet-photo" source={{ uri }} resizeMode="cover" fadeDuration={0}
      accessibilityLabel={`${name} 프로필 사진`} style={[s.photo, { opacity: status === 'loaded' ? 1 : 0 }]}
      onLoad={() => setStatus('loaded')} onError={() => setStatus('failed')} /> : null}
    {status === 'loading' ? <ActivityIndicator testID="birthday-photo-loading" color="#926DAE" size="small" /> : null}
    {status === 'failed' ? <AppText styleOverridesPreset style={s.photoFallback}>{uri ? '사진을 불러오지 못했어요' : '등록된 사진이 없어요'}</AppText> : null}
  </>;
});

export default memo(function BirthdayPortrait({ petId, name, uri, today, scale }: {
  petId: string; name: string; uri: string | null; today: boolean; scale: number;
}) {
  return <View testID="birthday-art-stage" style={{ width: 745 * scale, height: 700 * scale }}>
    <View testID="birthday-photo-frame" style={[s.frame, { left: 185 * scale, top: 241 * scale, width: 362 * scale, height: 355 * scale, borderRadius: 68 * scale, padding: 3 * scale }]}>
      <LinearGradient colors={['#D5B6FA', '#BC98F0']} style={[StyleSheet.absoluteFill, { borderRadius: 68 * scale }]} pointerEvents="none" />
      <View style={[s.photoClip, { borderRadius: 65 * scale }]}>
        <BirthdayPhoto key={`${petId}:${uri ?? ''}`} uri={uri} name={name} />
      </View>
    </View>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      {decorations.map(({ key, source, box }) => <Image key={key} testID={`birthday-decoration-${key}`} source={source} resizeMode="contain" accessible={false}
        style={{ position: 'absolute', left: (box[0] - 54) * scale, top: (box[1] - 324 + (key.startsWith('spark-') ? HEADER_OFFSET : 0)) * scale, width: box[2] * scale, height: box[3] * scale }} />)}
    </View>
    <AppText testID="birthday-eyebrow" preset="unifiedLabel" styleOverridesPreset style={[s.eyebrow, { top: (118 + HEADER_OFFSET) * scale, left: 140 * scale, width: 465 * scale }]}>
      {today ? '오늘의 주인공' : '소중한 생일의 주인공'}
    </AppText>
  </View>;
});

const s = StyleSheet.create({
  frame: { position: 'absolute', borderWidth: 1, borderColor: '#FEFDFF', shadowColor: '#8253C7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: .25, shadowRadius: 6 },
  photoClip: { flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photo: { position: 'absolute', width: '100%', height: '100%' },
  photoFallback: { ...TYPE.body, color: '#6653A8', textAlign: 'center', paddingHorizontal: 8 },
  eyebrow: { ...TYPE.label, position: 'absolute', color: '#3C086A', textAlign: 'center', letterSpacing: 0 },
});
