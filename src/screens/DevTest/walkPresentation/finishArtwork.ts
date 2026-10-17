import type { ImageSourcePropType } from 'react-native';
import type { SeasonKey } from '../../../theme/seasonal/season';

const existing: Record<SeasonKey, ImageSourcePropType> = {
  spring: require('../../../assets/images/walk/pre-walk-spring-v1.png'),
  summer: require('../../../assets/images/walk/pre-walk-summer-v1.png'),
  autumn: require('../../../assets/images/walk/finished-local-autumn-v1.png'),
  winter: require('../../../assets/images/walk/pre-walk-winter-v1.png'),
};
// Other seasons retain their own art, never an autumn fallback.
export const finishArtwork = (
  season: SeasonKey,
  confirmation = false,
): ImageSourcePropType =>
  confirmation && season === 'autumn'
    ? require('../../../assets/images/walk/finish-confirm-autumn-v1.png')
    : existing[season];
