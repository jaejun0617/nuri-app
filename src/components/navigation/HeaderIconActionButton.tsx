import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

type Props = {
  accessibilityLabel: string;
  backgroundColor: string;
  iconColor?: string;
  iconName?: string;
  disabled?: boolean;
  onPress: () => void;
};

export default function HeaderIconActionButton({
  accessibilityLabel,
  backgroundColor,
  iconColor = '#FFFFFF',
  iconName = 'plus',
  disabled = false,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={[
        styles.button,
        { backgroundColor },
        disabled ? styles.disabled : null,
      ]}
      onPress={onPress}
    >
      <Feather name={iconName as never} size={18} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B1220',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  disabled: {
    opacity: 0.45,
  },
});
