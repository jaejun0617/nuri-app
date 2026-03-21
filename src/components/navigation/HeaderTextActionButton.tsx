import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import AppText from '../../app/ui/AppText';

type Props = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  backgroundColor: string;
  textColor: string;
  borderColor?: string;
};

export default function HeaderTextActionButton({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
  backgroundColor,
  textColor,
  borderColor,
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor: borderColor ?? 'transparent',
        },
        disabled ? styles.disabled : null,
      ]}
    >
      <AppText preset="caption" style={[styles.text, { color: textColor }]}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 58,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  text: {
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.5,
  },
});
