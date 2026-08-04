import AppText from './AppText';
import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import type { TypographyPresetName } from '../theme/tokens/typography';
import { styles } from './SectionHeaderAction.styles';

type Props = {
  label?: string;
  color: string;
  onPress: () => void;
  accessibilityLabel: string;
  textPreset?: TypographyPresetName;
  size?: 'default' | 'compact';
};

function SectionHeaderActionBase({
  label = '전체 보기',
  color,
  onPress,
  accessibilityLabel,
  textPreset = 'unifiedLabel',
  size = 'default',
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        size === 'compact' ? styles.compactButton : styles.button,
        { borderColor: `${color}26` },
        pressed ? styles.pressed : null,
      ]}
    >
      <AppText preset={textPreset} style={[styles.text, { color }]}>{label}</AppText>
      <View style={size === 'compact' ? styles.compactIconSlot : styles.iconSlot}>
        <Feather name="chevron-right" size={size === 'compact' ? 12 : 14} color={color} />
      </View>
    </Pressable>
  );
}

export const SectionHeaderAction = memo(SectionHeaderActionBase);
