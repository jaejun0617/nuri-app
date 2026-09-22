import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

type AutumnStageProps = {
  atmosphere: ImageSourcePropType;
  atmosphereAspectRatio: number;
  children: React.ReactNode;
};

export function SeasonalHomeAutumnStage({
  atmosphere,
  atmosphereAspectRatio,
  children,
}: AutumnStageProps) {
  const { width: windowWidth } = useWindowDimensions();
  const atmosphereHeight = windowWidth / atmosphereAspectRatio;

  return (
    <View style={styles.stage}>
      <Image
        source={atmosphere}
        resizeMode="contain"
        style={[styles.atmosphere, { height: atmosphereHeight }]}
        accessible={false}
      />
      <LinearGradient
        colors={['rgba(255, 250, 244, 0)', '#FFF7ED']}
        style={[styles.imageTailWash, { top: atmosphereHeight - 100 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[
          'rgba(255, 251, 246, 0.16)',
          'rgba(255, 251, 246, 0.06)',
          'rgba(255, 251, 246, 0)',
        ]}
        locations={[0, 0.48, 1]}
        style={styles.headerSafeWash}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(255, 247, 237, 0)', '#FFFFFF']}
        style={styles.stageTailWash}
        pointerEvents="none"
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function AutumnLeafOrnament({
  source,
  variant = 'maple',
}: {
  source: ImageSourcePropType;
  variant?: 'maple' | 'singleLeaf' | 'berries' | 'ginkgo' | 'sprig';
}) {
  const variantStyle =
    variant === 'singleLeaf'
      ? styles.leafSheetSingleLeaf
      : variant === 'berries'
        ? styles.leafSheetBerries
        : variant === 'ginkgo'
          ? styles.leafSheetGinkgo
          : variant === 'sprig'
            ? styles.leafSheetSprig
            : styles.leafSheetMaple;

  return (
    <View style={styles.leafCrop} accessible={false} pointerEvents="none">
      <Image
        source={source}
        style={[styles.leafSheet, variantStyle]}
        resizeMode="stretch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    position: 'relative',
    marginHorizontal: -16,
    backgroundColor: '#FFF7ED',
    overflow: 'visible',
  },
  atmosphere: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
  },
  imageTailWash: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 140,
  },
  headerSafeWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 190,
  },
  stageTailWash: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -76,
    height: 220,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 0,
    gap: 14,
  },
  leafCrop: {
    width: 31,
    height: 32,
    overflow: 'hidden',
    flexShrink: 0,
  },
  leafSheet: {
    position: 'absolute',
    width: 146,
    height: 182,
  },
  leafSheetMaple: {
    left: -4,
    top: -4,
  },
  leafSheetSingleLeaf: {
    left: -4,
    top: -40,
  },
  leafSheetBerries: {
    left: -5,
    top: -92,
  },
  leafSheetGinkgo: {
    left: -4,
    top: -125,
  },
  leafSheetSprig: {
    left: -70,
    top: -94,
  },
});
