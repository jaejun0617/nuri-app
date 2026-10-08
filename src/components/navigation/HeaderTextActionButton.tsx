import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import AppText from '../../app/ui/AppText';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import type { CtaRole } from '../../app/theme/ctaPalette';

type Props = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderRadius?: number;
  compact?: boolean;
  role?: CtaRole;
  loading?: boolean;
  fontSize?: number;
};

export default function HeaderTextActionButton({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
  backgroundColor,
  textColor,
  borderColor,
  borderRadius,
  compact = false,
  role,
  loading = false,
  fontSize,
}: Props) {
  if (role) {
    return (
      <CtaButton
        role={role}
        compact
        loading={loading}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={[
          styles.button,
          compact ? styles.compactButton : null,
          { borderRadius: borderRadius ?? 999 },
        ]}
      >
        <CtaText
          typographyRole="utility"
          preset="tab"
          maxFontSizeMultiplier={1.5}
          styleOverridesPreset={fontSize !== undefined}
          style={[
            styles.text,
            fontSize !== undefined
              ? { fontSize, lineHeight: fontSize + 6 }
              : null,
          ]}
        >
          {label}
        </CtaText>
      </CtaButton>
    );
  }
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={compact ? { top: 4, bottom: 4, left: 4, right: 4 } : undefined}
      onPress={onPress}
      style={[
        styles.button,
        compact ? styles.compactButton : null,
        {
          backgroundColor,
          borderColor: borderColor ?? 'transparent',
          borderRadius: borderRadius ?? 999,
        },
        disabled ? styles.disabled : null,
      ]}
    >
      <AppText
        typographyRole="utility"
        preset="tab"
        maxFontSizeMultiplier={1.5}
        styleOverridesPreset={fontSize !== undefined}
        style={[
          styles.text,
          { color: textColor },
          fontSize !== undefined
            ? { fontSize, lineHeight: fontSize + 6 }
            : null,
        ]}
      >
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 58,
    minHeight: 44,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  compactButton: {
    minWidth: 50,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.5,
  },
});
