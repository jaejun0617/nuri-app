import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export type WinterOrnamentVariant =
  | 'snowflake'
  | 'sparkle'
  | 'berryBranch'
  | 'frostedTwig'
  | 'pineSprig'
  | 'berrySprig'
  | 'pineBerryCluster';

const WINTER_ORNAMENTS: Record<WinterOrnamentVariant, ImageSourcePropType> = {
  snowflake: require('../../../../assets/seasonal/home/winter/ornament-snowflake.png'),
  sparkle: require('../../../../assets/seasonal/home/winter/ornament-sparkle.png'),
  berryBranch: require('../../../../assets/seasonal/home/winter/ornament-berry-branch.png'),
  frostedTwig: require('../../../../assets/seasonal/home/winter/ornament-frosted-twig.png'),
  pineSprig: require('../../../../assets/seasonal/home/winter/ornament-pine-sprig.png'),
  berrySprig: require('../../../../assets/seasonal/home/winter/ornament-berry-sprig.png'),
  pineBerryCluster: require('../../../../assets/seasonal/home/winter/ornament-pine-berry-cluster.png'),
};

type WinterStageProps = {
  atmosphere: ImageSourcePropType;
  atmosphereAspectRatio: number;
  children: React.ReactNode;
};

export function SeasonalHomeWinterStage({
  atmosphere,
  atmosphereAspectRatio,
  children,
}: WinterStageProps) {
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
        colors={['rgba(244, 249, 255, 0)', '#F2F7FF']}
        style={[styles.imageTailWash, { top: atmosphereHeight - 104 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[
          'rgba(248, 251, 255, 0.14)',
          'rgba(248, 251, 255, 0.05)',
          'rgba(248, 251, 255, 0)',
        ]}
        locations={[0, 0.48, 1]}
        style={styles.headerSafeWash}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(242, 247, 255, 0)', '#FFFFFF']}
        style={styles.stageTailWash}
        pointerEvents="none"
      />

      <View
        pointerEvents="none"
        accessible={false}
        style={styles.ornamentLayer}
      >
        <WinterOrnament
          variant="sparkle"
          size={24}
          style={styles.upperSparkle}
        />
        <WinterOrnament
          variant="snowflake"
          size={30}
          style={styles.heroEdgeSnowflake}
        />
        <WinterOrnament
          variant="frostedTwig"
          size={54}
          style={styles.heroEdgeTwig}
        />
        <WinterOrnament
          variant="pineSprig"
          size={76}
          style={styles.lowerPineSprig}
        />
        <WinterOrnament
          variant="berryBranch"
          size={88}
          style={styles.lowerBerryBranch}
        />
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function WinterOrnament({
  variant,
  size,
  style,
}: {
  variant: WinterOrnamentVariant;
  size: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={WINTER_ORNAMENTS[variant]}
      resizeMode="contain"
      style={[{ width: size, height: size }, style]}
      accessible={false}
    />
  );
}

const styles = StyleSheet.create({
  stage: {
    position: 'relative',
    marginHorizontal: -16,
    backgroundColor: '#F2F7FF',
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
    height: 144,
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
  ornamentLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  upperSparkle: {
    position: 'absolute',
    top: 168,
    left: 8,
    opacity: 0.56,
    transform: [{ rotate: '-18deg' }],
  },
  heroEdgeSnowflake: {
    position: 'absolute',
    top: 316,
    right: 6,
    opacity: 0.54,
    transform: [{ rotate: '14deg' }],
  },
  heroEdgeTwig: {
    position: 'absolute',
    top: 414,
    left: 2,
    opacity: 0.42,
    transform: [{ rotate: '-24deg' }],
  },
  lowerPineSprig: {
    position: 'absolute',
    left: -4,
    bottom: 80,
    opacity: 0.46,
    transform: [{ rotate: '18deg' }],
  },
  lowerBerryBranch: {
    position: 'absolute',
    right: -32,
    bottom: 10,
    opacity: 0.48,
    transform: [{ rotate: '-12deg' }],
  },
  content: {
    position: 'relative',
    zIndex: 1,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 0,
    gap: 14,
  },
});
