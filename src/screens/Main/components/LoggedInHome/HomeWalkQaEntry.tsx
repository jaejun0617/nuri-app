import React, { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import AppText from '../../../../app/ui/AppText';
import { SEASON_CTA } from '../../../../app/theme/ctaPalette';
import {
  HOME_FLOATING_WIDGET_MATERIAL,
  HomeFloatingWidgetSurface,
} from '../../../../components/home/HomeWidgetMaterial';
import { isWalkDistanceQaEnabled } from '../../../../services/walk/runtime/distanceProjection';
import type { SeasonKey } from '../../../../theme/seasonal/season';

// Match navigator getComponent: resolve the QA host only after PO opens it.
function ActualWalkQaHost({ onClose }: { onClose: () => void }) {
  const { default: WalkQaPanel }: typeof import('../../../DevTest/WalkDistanceQaPanel') =
    require('../../../DevTest/WalkDistanceQaPanel');
  return <WalkQaPanel initialMode="ACTUAL" onClose={onClose} />;
}

export default function HomeWalkQaEntry({
  available,
  season,
}: {
  available: boolean;
  season: SeasonKey;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  if (!available || !isWalkDistanceQaEnabled()) return null;
  const accent = SEASON_CTA[season].primary;
  return (
    <>
      <TouchableOpacity
        testID="home-walk-qa-entry"
        accessibilityRole="button"
        accessibilityLabel="도보 QA 열기"
        activeOpacity={0.86}
        onPress={() => setOpen(true)}
        style={styles.button}
      >
        <HomeFloatingWidgetSurface radius={12} testIDPrefix="home-walk-qa-glass" />
        <AppText
          preset="unifiedLabel"
          styleOverridesPreset
          style={[styles.label, { color: accent }]}
        >
          도보 QA 열기
        </AppText>
      </TouchableOpacity>
      {open ? <ActualWalkQaHost onClose={close} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: 48,
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...HOME_FLOATING_WIDGET_MATERIAL,
  },
  label: { fontSize: 12, lineHeight: 18, fontWeight: '600', textAlign: 'center' },
});
