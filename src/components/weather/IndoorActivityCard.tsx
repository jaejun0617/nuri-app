// 파일: src/components/weather/IndoorActivityCard.tsx
// 역할:
// - 실내 놀이 추천 목록에서 활동 카드를 공통 형태로 렌더링

import { ResponsiveNativeText as Text } from '../../app/ui/ResponsiveNativeText';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import Feather from '../icons/NuriFeatherIcon';
import { MenuGlassSurface, MENU_GLASS_FRAME } from '../common/MenuGlassSurface';
import { INDOOR_ACTIVITY_ARTWORK } from './indoorActivityArtwork';

import type { IndoorActivityGuide } from '../../services/weather/guide';

type Props = {
  item: IndoorActivityGuide;
  onPress: () => void;
  accentColor?: string;
  accentTint?: string;
  chevronColor?: string;
};

export default React.memo(function IndoorActivityCard({
  item,
  onPress,
  accentTint = '#F2EAFF',
  chevronColor = '#BDC6D5',
}: Props) {
  return (
    <TouchableOpacity activeOpacity={0.92} style={styles.card} onPress={onPress}>
      <MenuGlassSurface radius={24} testID="indoor-activity-glass" />
      <View style={[styles.iconWrap, { backgroundColor: accentTint }]}>
        <Image
          testID={`indoor-thumbnail-${item.key}`}
          source={INDOOR_ACTIVITY_ARTWORK[item.key]}
          style={styles.image}
          resizeMode="cover"
          accessible={false}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {item.shortTip}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={chevronColor} />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
  card: {
    borderRadius: 24,
    ...MENU_GLASS_FRAME,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F2EAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    lineHeight: 19,
    color: '#1B2434',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8B96AA',
    fontWeight: '400',
  },
});
