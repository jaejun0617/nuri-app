import React from 'react';
import MaskedView from '@react-native-masked-view/masked-view';
import {
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

type MaskedViewCompatProps = React.ComponentProps<typeof View> & {
  maskElement: React.ReactElement;
};

const MaskedViewCompat =
  MaskedView as unknown as React.ComponentType<MaskedViewCompatProps>;

type AutumnStageProps = {
  atmosphere: ImageSourcePropType;
  atmosphereAspectRatio: number;
  minHeight?: number;
  children: React.ReactNode;
};

const CANONICAL_STAGE_ASPECT_RATIO = 941 / 1672;
const ATMOSPHERE_FOCAL_OFFSET_RATIO = 0.1;

export function SeasonalHomeAutumnStage({
  atmosphere,
  atmosphereAspectRatio,
  minHeight,
  children,
}: AutumnStageProps) {
  const { width: windowWidth } = useWindowDimensions();
  const sourceHeight = windowWidth / atmosphereAspectRatio;
  const atmosphereHeight = windowWidth / CANONICAL_STAGE_ASPECT_RATIO;
  const focalOffset = Math.round(windowWidth * ATMOSPHERE_FOCAL_OFFSET_RATIO);
  const tailHeight = Math.max(0, atmosphereHeight - sourceHeight - focalOffset);

  return (
    <View style={[styles.stage, minHeight ? { minHeight } : null]}>
      <Image
        source={atmosphere}
        resizeMode="contain"
        style={[styles.atmosphere, { top: 0, height: sourceHeight }]}
        accessible={false}
      />
      <MaskedViewCompat
        style={[
          styles.shiftedAtmosphereMask,
          { height: focalOffset + sourceHeight },
        ]}
        maskElement={
          <LinearGradient
            colors={['transparent', 'transparent', '#000000']}
            locations={[0, 0.26, 0.39]}
            style={styles.maskFill}
          />
        }
        pointerEvents="none"
      >
        <Image
          source={atmosphere}
          resizeMode="contain"
          style={[
            styles.atmosphere,
            { top: focalOffset, height: sourceHeight },
          ]}
          accessible={false}
        />
      </MaskedViewCompat>
      {tailHeight > 0 ? (
        <View
          style={[
            styles.atmosphereTailClip,
            { top: focalOffset + sourceHeight, height: tailHeight },
          ]}
          pointerEvents="none"
        >
          <Image
            source={atmosphere}
            resizeMode="contain"
            style={[
              styles.atmosphereTail,
              { height: sourceHeight, transform: [{ scaleY: -1 }] },
            ]}
            accessible={false}
          />
        </View>
      ) : null}
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
    left: 0,
    width: '100%',
  },
  shiftedAtmosphereMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  maskFill: {
    flex: 1,
  },
  atmosphereTailClip: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  atmosphereTail: {
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
