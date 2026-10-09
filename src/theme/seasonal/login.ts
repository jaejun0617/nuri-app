import type { ImageSourcePropType } from 'react-native';
import type { SeasonKey } from './season';

export type SeasonalLoginVisual = {
  season: SeasonKey;
  source: ImageSourcePropType;
  accessibilityLabel: string;
};

const LOGIN_VISUALS: Record<SeasonKey, SeasonalLoginVisual> = {
  spring: {
    season: 'spring',
    source: require('../../assets/seasonal/login/social/spring-aligned.png'),
    accessibilityLabel: '누리. 함께한 순간을, 오래도록. 봄 로그인 배경',
  },
  summer: {
    season: 'summer',
    source: require('../../assets/seasonal/login/social/summer-aligned.png'),
    accessibilityLabel: '누리. 함께한 순간을, 오래도록. 여름 로그인 배경',
  },
  autumn: {
    season: 'autumn',
    source: require('../../assets/seasonal/login/social/autumn.png'),
    accessibilityLabel: '누리. 함께한 순간을, 오래도록. 가을 로그인 배경',
  },
  winter: {
    season: 'winter',
    source: require('../../assets/seasonal/login/social/winter.png'),
    accessibilityLabel: '누리. 함께한 순간을, 오래도록. 겨울 로그인 배경',
  },
};

export function getSeasonalLoginVisual(
  season: SeasonKey,
  override: 'auto' | SeasonKey = 'auto',
): SeasonalLoginVisual {
  return LOGIN_VISUALS[override === 'auto' ? season : override];
}

// All four 836x1881 assets share the same artwork boundary. Clip only the trailing
// white space so season changes cannot move the CTA or distort the illustration.
export function getSocialLoginLayout(width: number, height: number) {
  const imageHeight = width * (1881 / 836);
  const heroHeight = width * (1350 / 836);
  return {
    heroHeight,
    imageHeight,
    imageWidth: width,
    actionsMinHeight: Math.max(0, height - heroHeight),
  };
}
