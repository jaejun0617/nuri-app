import React, { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '../../../../app/ui/AppText';
import type { SeasonKey } from '../../../../theme/seasonal/season';

const OPTIONS: readonly { key: SeasonKey; label: string }[] = [
  { key: 'autumn', label: '가을' },
  { key: 'winter', label: '겨울' },
  { key: 'spring', label: '봄' },
  { key: 'summer', label: '여름' },
];

/** Only the temporary buttons receive touches; the shelf does not shift Home. */
export const HomeSeasonReviewControls = memo(
  function HomeSeasonReviewControlsView({
    season,
    onChange,
  }: {
    season: SeasonKey;
    onChange: (season: SeasonKey) => void;
  }) {
    const insets = useSafeAreaInsets();
    return (
      <View
        testID="home-season-review-controls"
        style={[styles.shelf, { top: insets.top }]}
        pointerEvents="box-none"
      >
        <View style={styles.segment}>
          {OPTIONS.map(option => (
            <TouchableOpacity
              key={option.key}
              testID={`home-review-season-${option.key}`}
              accessibilityRole="button"
              accessibilityLabel={`${option.label} 디자인 확인`}
              accessibilityState={{ selected: season === option.key }}
              activeOpacity={0.85}
              onPress={() => onChange(option.key)}
              style={[
                styles.option,
                season === option.key ? styles.selected : null,
              ]}
            >
              <AppText
                preset="unifiedLabel"
                numberOfLines={1}
                maxFontSizeMultiplier={1.4}
                styleOverridesPreset
                style={[
                  styles.label,
                  season === option.key ? styles.selectedLabel : null,
                ]}
              >
                {option.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  },
);

export const styles = StyleSheet.create({
  shelf: {
    position: 'absolute',
    top: 0,
    left: 104,
    right: 56,
    zIndex: 20,
  },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEE3EA',
    backgroundColor: '#FFFFFF',
  },
  option: {
    flex: 1,
    minWidth: 0,
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  selected: { backgroundColor: '#E7EEFF' },
  label: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0,
  },
  selectedLabel: { color: '#174BA8', fontWeight: '600' },
});
