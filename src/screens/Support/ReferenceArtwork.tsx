import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from 'styled-components/native';
import { PRODUCT_CANVAS_COLOR } from '../../app/theme/tokens/colors';

const artwork = {
  help: {
    source: require('../../assets/support/help-reference.png'),
    width: 978,
    height: 1608,
    x: 575,
    y: 150,
    cropWidth: 380,
    cropHeight: 290,
  },
  notice: {
    source: require('../../assets/support/notice-reference.png'),
    width: 934,
    height: 1685,
    x: 570,
    y: 145,
    cropWidth: 345,
    cropHeight: 265,
  },
  inquiry: {
    source: require('../../assets/support/inquiry-reference.png'),
    width: 934,
    height: 1684,
    x: 710,
    y: 175,
    cropWidth: 175,
    cropHeight: 185,
  },
  receipt: {
    source: require('../../assets/support/receipt-reference.png'),
    width: 934,
    height: 1684,
    x: 650,
    y: 170,
    cropWidth: 255,
    cropHeight: 270,
  },
} as const;

/** Clip only the supplied illustration pixels, not the mockup's text or controls. */
export default function ReferenceArtwork({
  kind,
  size = 112,
}: {
  kind: keyof typeof artwork;
  size?: number;
}) {
  const item = artwork[kind];
  const theme = useTheme();
  const ratio = size / item.cropWidth;
  const canvas =
    theme.mode === 'dark' ? theme.colors.background : PRODUCT_CANVAS_COLOR;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID={`reference-art-${kind}`}
      style={{
        width: size,
        height: item.cropHeight * ratio,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <Image
        source={item.source}
        resizeMode="stretch"
        style={{
          position: 'absolute',
          width: item.width * ratio,
          height: item.height * ratio,
          left: -item.x * ratio,
          top: -item.y * ratio,
        }}
      />
      <LinearGradient colors={[canvas, 'transparent']} style={styles.top} />
      <LinearGradient colors={['transparent', canvas]} style={styles.bottom} />
      <LinearGradient
        colors={[canvas, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.left}
      />
      <LinearGradient
        colors={['transparent', canvas]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.right}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, height: 10 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 10 },
  left: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 10 },
  right: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 10 },
});
