import React, { useCallback, useState } from 'react';
import { View, type TextProps } from 'react-native';
import AppText from './AppText';
import { useEffectiveSeason } from '../providers/SeasonPreferenceProvider';
import { SEASON_CTA } from '../theme/ctaPalette';

type Line = { x: number; y: number; width: number; height: number };

/** Measure native text lines so the marker follows wrapping and the user's font. */
export default function MarkerText({
  markerColor,
  variant = 'underline',
  onTextLayout: onLayout,
  ...props
}: React.ComponentProps<typeof AppText> & {
  markerColor?: string;
  variant?: 'underline' | 'wash';
}) {
  const season = useEffectiveSeason();
  const resolvedMarkerColor = markerColor ?? SEASON_CTA[season].border;
  const [lines, setLines] = useState<Line[]>([]);
  const onTextLayout = useCallback<NonNullable<TextProps['onTextLayout']>>(
    event => {
      onLayout?.(event);
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
    },
    [onLayout],
  );
  return (
    <View>
      {lines.map((line, index) => (
        <View
          key={index}
          testID="marker-text-line"
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            left: line.x,
            top: line.y + line.height * (variant === 'wash' ? 0.16 : 0.73),
            width: line.width,
            height: Math.max(
              3,
              line.height * (variant === 'wash' ? 0.74 : 0.2),
            ),
            borderRadius: variant === 'wash' ? line.height * 0.18 : 0,
            backgroundColor: resolvedMarkerColor,
          }}
        />
      ))}
      <AppText {...props} onTextLayout={onTextLayout} />
    </View>
  );
}
