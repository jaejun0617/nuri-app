import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';

type Props = {
  accentColor?: string;
  accentTint?: string;
};

const PetSelectedBadge = memo(function PetSelectedBadge({
  accentColor = '#6D6AF8',
  accentTint = 'rgba(109, 106, 248, 0.12)',
}: Props) {
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: accentTint,
          borderColor: accentColor,
        },
      ]}
    >
      <View style={styles.content}>
        <Feather name="check" size={12} color={accentColor} />
        <AppText preset="caption" style={[styles.text, { color: accentColor }]}>
          보고 있어요
        </AppText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  text: {
    fontWeight: '900',
    textAlign: 'center',
  },
});

export default PetSelectedBadge;
