import React, { useCallback, useState } from 'react';
import { StyleSheet, View, type TextProps } from 'react-native';
import AppText from '../../app/ui/AppText';
import {
  PET_MANAGEMENT_COLORS as colors,
  PET_MANAGEMENT_TYPE as type,
} from '../../theme/pets/management';

type Line = { x: number; y: number; width: number; height: number };

/** Native line measurements keep the full-height hand-drawn marker behind this phrase only. */
export default function PetDeletionRecoveryMarker() {
  const [lines, setLines] = useState<Line[]>([]);
  const measure = useCallback<NonNullable<TextProps['onTextLayout']>>(event => {
    const next = event.nativeEvent.lines.map(({ x, y, width, height }) => ({
      x,
      y,
      width,
      height,
    }));
    setLines(previous =>
      previous.length === next.length &&
      previous.every(
        (line, i) =>
          line.x === next[i].x &&
          line.y === next[i].y &&
          line.width === next[i].width &&
          line.height === next[i].height,
      )
        ? previous
        : next,
    );
  }, []);
  return (
    <View style={styles.wrap}>
      {lines.map((line, index) => (
        <View
          key={index}
          testID="pet-delete-marker-line"
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.stroke,
            {
              left: line.x - 2,
              top: line.y + line.height * 0.1,
              width: line.width + 4,
              height: line.height * 0.82,
              borderRadius: line.height * 0.34,
            },
          ]}
        >
          <View
            testID="pet-delete-marker-start"
            style={[
              styles.start,
              { height: line.height * 0.66, borderRadius: line.height * 0.33 },
            ]}
          />
          <View
            testID="pet-delete-marker-end"
            style={[
              styles.end,
              { height: line.height * 0.52, borderRadius: line.height * 0.26 },
            ]}
          />
          <View style={styles.lowerStroke} />
        </View>
      ))}
      <AppText
        testID="pet-delete-recovery-copy"
        preset="titleMd"
        style={styles.text}
        onTextLayout={measure}
      >
        복구할 수 없어요.
      </AppText>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { flexShrink: 1, minWidth: 0 },
  text: { ...type.warning, color: colors.ink },
  stroke: {
    position: 'absolute',
    backgroundColor: colors.marker,
    transform: [{ rotate: '-0.25deg' }],
  },
  start: {
    position: 'absolute',
    left: -1.5,
    top: 2,
    width: 8,
    backgroundColor: colors.marker,
  },
  end: {
    position: 'absolute',
    right: -2,
    bottom: 1,
    width: 8,
    backgroundColor: colors.marker,
  },
  lowerStroke: {
    position: 'absolute',
    left: 12,
    right: 8,
    bottom: 0,
    height: 3,
    borderRadius: 3,
    backgroundColor: colors.marker,
  },
});
