import React, { memo, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';
import { createIconSet } from 'react-native-vector-icons';

import glyphs from '../../assets/icons/nuri-icons.glyphs.json';
import palettes from '../../assets/icons/nuri-icons.palette.json';

export type NuriIconName = keyof typeof glyphs;
export type NuriIconVariant = 'outline' | 'glass';

type Props = {
  name: NuriIconName;
  size: number;
  color?: string;
  colorMode?: 'original' | 'theme';
  variant?: NuriIconVariant;
  testID?: string;
  style?: StyleProp<TextStyle>;
};

const glyphMap = Object.fromEntries(
  Object.entries(glyphs).flatMap(([name, layers]) =>
    Object.entries(layers).map(([layer, value]) => [`${name}.${layer}`, value]),
  ),
);
const Glyph = createIconSet(glyphMap, 'NuriIcons', 'NuriIcons.ttf');
type MaskProps = React.ComponentProps<typeof View> & {
  maskElement: React.ReactElement;
  androidRenderingMode?: 'software' | 'hardware';
};
// The package's NativeMethods intersection predates RN 0.87's generated types.
const NativeMask = MaskedView as unknown as React.ComponentType<MaskProps>;

/** Fixed optical bounds keep theme/font changes from changing button geometry. */
function NuriIconBase({
  name,
  size,
  color,
  colorMode = 'original',
  variant = 'glass',
  testID,
  style,
}: Props) {
  const geometry = useMemo(
    () => ({ width: size, height: size, lineHeight: size, fontSize: size }),
    [size],
  );
  const palette = palettes[name];
  const themed = colorMode === 'theme';
  const activeLayers: ReadonlyArray<string> = palette.layers;
  const primary = themed ? color ?? palette.primary : palette.primary;
  // Colored jelly surfaces stay visible on glass; navigation keeps its approved tint.
  const colors = useMemo(
    () => [themed ? '#FFFFFF' : palette.surface, primary, primary],
    [themed, palette.surface, primary],
  );
  const glyph = (layer: keyof (typeof glyphs)[NuriIconName], tint: string) => (
    <Glyph
      name={`${name}.${layer}`}
      size={size}
      color={tint}
      allowFontScaling={false}
      style={[styles.glyph, geometry]}
    />
  );
  const detail = themed ? '#FFFFFF' : palette.detail;

  return (
    <View
      testID={testID}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[style, geometry]}
    >
      {!themed || variant === 'glass' ? (
        <>
          <NativeMask
            key={name}
            style={styles.layer}
            androidRenderingMode="hardware"
            maskElement={glyph('fill', '#FFFFFF')}
          >
            <LinearGradient
              colors={colors}
              locations={[0, 0.55, 1]}
              start={{ x: 0.25, y: 0 }}
              end={{ x: 0.7, y: 1 }}
              style={styles.layer}
            />
          </NativeMask>
          <View style={[styles.layer, styles.edge]}>
            {glyph('outline', primary)}
          </View>
          {!themed ? (
            <>
              {activeLayers.includes('accent') ? (
                <View style={styles.layer}>
                  {glyph('accent', palette.accent)}
                </View>
              ) : null}
              {activeLayers.includes('secondary') ? (
                <View style={styles.layer}>
                  {glyph('secondary', palette.secondary)}
                </View>
              ) : null}
            </>
          ) : null}
          {activeLayers.includes('detail') ? (
            <View style={styles.layer}>{glyph('detail', detail)}</View>
          ) : null}
          {!themed && activeLayers.includes('detailAccent') ? (
            <View style={styles.layer}>
              {glyph('detailAccent', palette.detailAccent)}
            </View>
          ) : null}
          {activeLayers.includes('highlight') ? (
            <View style={[styles.layer, styles.sheen]}>
              {glyph('highlight', '#FFFFFF')}
            </View>
          ) : null}
        </>
      ) : (
        <>
          {glyph('outline', primary)}
          {glyph('detail', primary)}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  glyph: {
    position: 'absolute',
    left: 0,
    top: 0,
    includeFontPadding: false,
    textAlign: 'left',
  },
  edge: { opacity: 0.55 },
  sheen: { opacity: 0.75 },
});

export default memo(NuriIconBase);
