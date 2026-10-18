import type { ImageSourcePropType } from 'react-native';
import type { SeasonKey } from '../../../theme/seasonal/season';

const existing: Record<SeasonKey, ImageSourcePropType> = {
  spring: require('../../../assets/images/walk/finished-local-spring-v1.png'),
  summer: require('../../../assets/images/walk/finished-local-summer-v1.png'),
  autumn: require('../../../assets/images/walk/finished-local-autumn-v1.png'),
  winter: require('../../../assets/images/walk/finished-local-winter-v1.png'),
};
const confirmationArtwork: Record<SeasonKey, ImageSourcePropType> = {
  spring: require('../../../assets/images/walk/finish-confirm-spring-v1.png'),
  summer: require('../../../assets/images/walk/finish-confirm-summer-v1.png'),
  autumn: require('../../../assets/images/walk/finish-confirm-autumn-v1.png'),
  winter: require('../../../assets/images/walk/finish-confirm-winter-v1.png'),
};
export const finishArtwork = (
  season: SeasonKey,
  confirmation = false,
): ImageSourcePropType =>
  confirmation ? confirmationArtwork[season] : existing[season];
