import type { ImageSourcePropType } from 'react-native';
import type { IndoorActivityKey } from '../../services/weather/guide';

// Bundled artwork keeps every guide available without an external image request.
export const INDOOR_ACTIVITY_ARTWORK: Record<
  IndoorActivityKey,
  ImageSourcePropType
> = {
  nosework: require('../../assets/indoor-activities/nosework-v1.png'),
  tug: require('../../assets/indoor-activities/tug-v1.png'),
  training: require('../../assets/indoor-activities/training-v1.png'),
  massage: require('../../assets/indoor-activities/massage-v1.png'),
  'sniff-mat': require('../../assets/indoor-activities/sniff-mat-v1.png'),
  'hide-and-seek': require('../../assets/indoor-activities/hide-and-seek-v1.png'),
  stretching: require('../../assets/indoor-activities/stretching-v1.png'),
  'balance-walk': require('../../assets/indoor-activities/balance-walk-v1.png'),
};
