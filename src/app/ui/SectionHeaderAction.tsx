import AppText from './AppText';
import React, { memo } from 'react';
import { Pressable, View, type StyleProp, type TextStyle } from 'react-native';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';

import type { TypographyPresetName } from '../theme/tokens/typography';
import { styles } from './SectionHeaderAction.styles';

type Props = {
  label?: string;
  color: string;
  onPress: () => void;
  accessibilityLabel: string;
  textPreset?: TypographyPresetName;
  size?: 'default' | 'compact';
  labelStyle?: StyleProp<TextStyle>;
};

function SectionHeaderActionBase({
  label = '전체 보기',
  color,
  onPress,
  accessibilityLabel,
  textPreset = 'unifiedLabel',
  size = 'default',
  labelStyle,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        size === 'compact' ? styles.compactButton : styles.button,
        pressed ? styles.pressed : null,
      ]}
    >
      <AppText
        preset={textPreset}
        styleOverridesPreset
        fitCompactReadingLine
        style={[styles.text, labelStyle, { color }]}
      >
        {label}
      </AppText>
      <View accessible={false} importantForAccessibility="no-hide-descendants">
        <NuriSemanticIcon
          family="feather"
          name="chevron-right"
          size={15}
          color={color}
          preserveOriginal
        />
      </View>
    </Pressable>
  );
}

export const SectionHeaderAction = memo(SectionHeaderActionBase);
