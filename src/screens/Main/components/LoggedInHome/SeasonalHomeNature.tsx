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

// The library's bundled class declaration predates React 19's JSX constructor type.
const MaskedViewCompat = MaskedView as unknown as React.ComponentType<MaskedViewCompatProps>;

type NatureSeason = 'spring' | 'summer';

type NatureStageProps = {
  season: NatureSeason;
  atmosphere: ImageSourcePropType;
  atmosphereAspectRatio: number;
  children: React.ReactNode;
};

const CANONICAL_STAGE_ASPECT_RATIO = 941 / 1672;

const palettes: Record<
  NatureSeason,
  {
    background: string;
    focalOffsetRatio: number;
    imageTail: [string, string];
    stageTail: [string, string];
  }
> = {
  spring: {
    background: '#F8FBF3',
    focalOffsetRatio: 0.095,
    imageTail: ['rgba(248, 251, 243, 0)', '#F8FBF3'],
    stageTail: ['rgba(248, 251, 243, 0)', '#FFFFFF'],
  },
  summer: {
    background: '#F4FAEC',
    focalOffsetRatio: 0.1,
    imageTail: ['rgba(244, 250, 236, 0)', '#F4FAEC'],
    stageTail: ['rgba(244, 250, 236, 0)', '#FFFFFF'],
  },
};

export function SeasonalHomeNatureStage({
  season,
  atmosphere,
  atmosphereAspectRatio,
  children,
}: NatureStageProps) {
  const { width: windowWidth } = useWindowDimensions();
  const sourceHeight = windowWidth / atmosphereAspectRatio;
  const atmosphereHeight = windowWidth / CANONICAL_STAGE_ASPECT_RATIO;
  const palette = palettes[season];
  const focalOffset = Math.round(windowWidth * palette.focalOffsetRatio);
  const tailHeight = Math.max(
    0,
    atmosphereHeight - sourceHeight - focalOffset,
  );

  return (
    <View style={[styles.stage, { backgroundColor: palette.background }]}>
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
            {
              top: focalOffset + sourceHeight,
              height: tailHeight,
            },
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
        colors={palette.imageTail}
        style={[styles.imageTailWash, { top: atmosphereHeight - 100 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0.16)',
          'rgba(255, 255, 255, 0.06)',
          'rgba(255, 255, 255, 0)',
        ]}
        locations={[0, 0.48, 1]}
        style={styles.headerSafeWash}
        pointerEvents="none"
      />
      <LinearGradient
        colors={palette.stageTail}
        style={styles.stageTailWash}
        pointerEvents="none"
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    position: 'relative',
    marginHorizontal: -16,
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
});
