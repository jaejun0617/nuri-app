// 파일: src/components/weather/IndoorActivityCard.tsx
// 역할:
// - 실내 놀이 추천 목록에서 활동 카드를 공통 형태로 렌더링

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type { IndoorActivityGuide } from '../../services/weather/guide';

type Props = {
  item: IndoorActivityGuide;
  onPress: () => void;
};

export default React.memo(function IndoorActivityCard({ item, onPress }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.92} style={styles.card} onPress={onPress}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons
          name={item.heroIcon as never}
          size={24}
          color="#7A45F4"
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {item.shortTip}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color="#BDC6D5" />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEEF4',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#F2EAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 20,
    lineHeight: 24,
    color: '#1B2434',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#8B96AA',
    fontWeight: '400',
  },
});
