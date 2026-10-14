import React, { memo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import AppText from '../../app/ui/AppText';
import Feather from '../icons/NuriFeatherIcon';
import type { SeasonKey } from '../../theme/seasonal/season';

const OPTIONS: readonly SeasonKey[] = ['autumn', 'winter', 'spring', 'summer'];
const LABELS: Record<SeasonKey, string> = {
  autumn: '가을',
  winter: '겨울',
  spring: '봄',
  summer: '여름',
};

/** Temporary season review stays in menu flow, separate from product content. */
export const SeasonReviewControls = memo(
  function SeasonReviewControlsView({
    season,
    onChange,
  }: {
    season: SeasonKey;
    onChange: (season: SeasonKey) => void;
  }) {
    const [expanded, setExpanded] = useState(false);
    return (
      <View
        testID="home-season-review-controls"
        style={styles.shelf}
        pointerEvents="box-none"
      >
        <View style={styles.segment}>
          <TouchableOpacity
            testID="home-review-season-toggle"
            accessibilityRole="button"
            accessibilityLabel={`계절 선택 ${expanded ? '접기' : '펼치기'}, 현재 ${LABELS[season]}`}
            accessibilityState={{ expanded }}
            activeOpacity={0.85}
            onPress={() => setExpanded(previous => !previous)}
            style={styles.toggle}
          >
            <AppText
              preset="unifiedLabel"
              numberOfLines={1}
              maxFontSizeMultiplier={1.4}
              styleOverridesPreset
              style={[styles.label, styles.toggleLabel, styles.selectedLabel]}
            >
              계절 · {LABELS[season]}
            </AppText>
            <Feather
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={styles.selectedLabel.color}
              accessible={false}
            />
          </TouchableOpacity>
          {expanded ? (
            <View style={styles.options}>
              {OPTIONS.map(option => (
                <TouchableOpacity
                  key={option}
                  testID={`home-review-season-${option}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${LABELS[option]} 디자인 확인`}
                  accessibilityState={{ selected: season === option }}
                  activeOpacity={0.85}
                  onPress={() => onChange(option)}
                  style={[
                    styles.option,
                    season === option ? styles.selected : null,
                  ]}
                >
                  <AppText
                    preset="unifiedLabel"
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.4}
                    styleOverridesPreset
                    style={[
                      styles.label,
                      season === option ? styles.selectedLabel : null,
                    ]}
                  >
                    {LABELS[option]}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  },
);

export const styles = StyleSheet.create({
  shelf: {
    width: '100%',
  },
  segment: {
    flexDirection: 'column',
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEE3EA',
    backgroundColor: '#FFFFFF',
  },
  toggle: {
    minHeight: 44,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    borderRadius: 6,
  },
  toggleLabel: { flex: 1, textAlign: 'left' },
  options: { flexDirection: 'row', marginTop: 3 },
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
