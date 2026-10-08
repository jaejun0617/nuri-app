import AppText from './AppText';
import React, { memo } from 'react';
import { Pressable, useWindowDimensions } from 'react-native';

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
  const { width, fontScale } = useWindowDimensions();
  const enlarged = fontScale > 1;
  const baseWidth = size === 'compact' ? 80 : 88;
  const baseHeight = size === 'compact' ? 28 : 34;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        size === 'compact' ? styles.compactButton : styles.button,
        enlarged
          ? {
              width: Math.min(
                Math.max(44, width - 32),
                Math.ceil(baseWidth * fontScale),
              ),
              minHeight: Math.ceil(baseHeight * fontScale),
              paddingVertical: 4,
            }
          : null,
        { borderColor: `${color}26` },
        pressed ? styles.pressed : null,
      ]}
    >
      <AppText preset={textPreset} style={[styles.text, { color }]}>
        {label}
      </AppText>
    </Pressable>
  );
}

export const SectionHeaderAction = memo(SectionHeaderActionBase);
