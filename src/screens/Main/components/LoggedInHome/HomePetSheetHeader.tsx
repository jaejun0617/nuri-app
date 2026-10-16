import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import AppText from '../../../../app/ui/AppText';
import NuriSemanticIcon from '../../../../components/icons/NuriSemanticIcon';
import { NEUTRAL_UI_PALETTE } from '../../../../services/pets/themePalette';

type Props = {
  title: string;
  titleColor?: string;
  closeLabel: string;
  onClose: () => void;
};

/** Selection and introduction share compact, independently accessible controls. */
export function HomePetSheetHeader({
  title,
  titleColor = NEUTRAL_UI_PALETTE.deep,
  closeLabel,
  onClose,
}: Props) {
  return (
    <View style={styles.header}>
      <AppText
        preset="unifiedTitle"
        styleOverridesPreset
        accessibilityRole="header"
        style={[styles.title, { color: titleColor }]}
      >
        {title}
      </AppText>
      <View style={styles.actions}>
        <TouchableOpacity
          testID="home-pet-sheet-close"
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          activeOpacity={0.85}
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.close}
        >
          <NuriSemanticIcon
            family="feather"
            preserveOriginal
            name="x"
            size={19}
            color="#000000"
            accessible={false}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: { flex: 1, minWidth: 0, flexShrink: 1, fontSize: 16, lineHeight: 22 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
  },
  close: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
