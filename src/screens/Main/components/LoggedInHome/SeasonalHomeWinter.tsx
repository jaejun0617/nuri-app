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
  minHeight?: number;
  children: React.ReactNode;
};

export function SeasonalHomeWinterStage({
  atmosphere,
  atmosphereAspectRatio,
  minHeight,
  children,
}: WinterStageProps) {
  const { width: windowWidth } = useWindowDimensions();
  const sourceHeight = windowWidth / atmosphereAspectRatio;

  return (
    <View style={[styles.stage, minHeight ? { minHeight } : null]}>
      <Image
        source={atmosphere}
        resizeMode="contain"
        style={[styles.atmosphere, { top: 0, height: sourceHeight }]}
        accessible={false}
      />
      <LinearGradient
        colors={[
          'rgba(248, 251, 255, 0.12)',
          'rgba(248, 251, 255, 0.04)',
          'rgba(248, 251, 255, 0)',
        ]}
        locations={[0, 0.48, 1]}
        style={styles.headerSafeWash}
        pointerEvents="none"
      />
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
    left: 0,
    width: '100%',
  },
  headerSafeWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 190,
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
