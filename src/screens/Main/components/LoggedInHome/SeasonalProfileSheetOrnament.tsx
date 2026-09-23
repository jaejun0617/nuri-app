import React from 'react';
import {
  Image,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

export type SeasonalProfileSheetOrnamentSeason = 'spring' | 'summer';
export type SeasonalProfileSheetOrnamentVariant =
  | 'sparkle'
  | 'primary'
  | 'secondary'
  | 'branch';

type OrnamentAsset = {
  source: ImageSourcePropType;
  aspectRatio: number;
};

const SPRING_ORNAMENTS: Record<
  SeasonalProfileSheetOrnamentVariant,
  OrnamentAsset
> = {
  sparkle: {
    source: require('../../../../assets/seasonal/home/spring/profile-sheet-ornament-sparkle.png'),
    aspectRatio: 105 / 116,
  },
  primary: {
    source: require('../../../../assets/seasonal/home/spring/profile-sheet-ornament-blossom.png'),
    aspectRatio: 188 / 184,
  },
  secondary: {
    source: require('../../../../assets/seasonal/home/spring/profile-sheet-ornament-petal.png'),
    aspectRatio: 74 / 83,
  },
  branch: {
    source: require('../../../../assets/seasonal/home/spring/profile-sheet-ornament-branch.png'),
    aspectRatio: 233 / 187,
  },
};

const SUMMER_ORNAMENTS: Record<
  SeasonalProfileSheetOrnamentVariant,
  OrnamentAsset
> = {
  sparkle: {
    source: require('../../../../assets/seasonal/home/summer/profile-sheet-ornament-sun.png'),
    aspectRatio: 183 / 179,
  },
  primary: {
    source: require('../../../../assets/seasonal/home/summer/profile-sheet-ornament-hydrangea.png'),
    aspectRatio: 209 / 186,
  },
  secondary: {
    source: require('../../../../assets/seasonal/home/summer/profile-sheet-ornament-leaf-sprig.png'),
    aspectRatio: 212 / 164,
  },
  branch: {
    source: require('../../../../assets/seasonal/home/summer/profile-sheet-ornament-daisy.png'),
    aspectRatio: 119 / 162,
  },
};

export function SeasonalProfileSheetOrnament({
  season,
  variant,
  size,
  style,
}: {
  season: SeasonalProfileSheetOrnamentSeason;
  variant: SeasonalProfileSheetOrnamentVariant;
  size: number;
  style?: StyleProp<ImageStyle>;
}) {
  const asset =
    season === 'spring'
      ? SPRING_ORNAMENTS[variant]
      : SUMMER_ORNAMENTS[variant];

  return (
    <Image
      source={asset.source}
      resizeMode="contain"
      style={[
        { width: size, height: size / asset.aspectRatio },
        style,
      ]}
      accessible={false}
    />
  );
}
