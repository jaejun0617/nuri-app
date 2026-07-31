import AppText from './AppText';
import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { styles } from './SectionHeaderAction.styles';

type Props = {
  label?: string;
  color: string;
  onPress: () => void;
  accessibilityLabel: string;
};

function SectionHeaderActionBase({
  label = '전체 보기',
  color,
  onPress,
  accessibilityLabel,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { borderColor: `${color}26` },
        pressed ? styles.pressed : null,
      ]}
    >
      <AppText preset="unifiedLabel" style={[styles.text, { color }]}>{label}</AppText>
      <View style={styles.iconSlot}>
        <Feather name="chevron-right" size={14} color={color} />
      </View>
    </Pressable>
  );
}

export const SectionHeaderAction = memo(SectionHeaderActionBase);
