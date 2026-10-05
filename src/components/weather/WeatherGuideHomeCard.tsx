// 파일: src/components/weather/WeatherGuideHomeCard.tsx
// 역할:
// - 홈 화면의 날씨 요약을 낮/밤 프리미엄 카드로 렌더링한다.
// - 날씨 번들의 안전 문구와 선택 펫 이름을 표시 계층에서 개인화한다.

import React, { type PropsWithChildren } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

import { HomeFrostedGlass } from '../home/HomeFrostedGlass';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import { resolveWeatherMetricLayout } from './weatherMetricLayout';

import {
  formatWeatherPetText,
  getWeatherEmoji,
  type WeatherGuideBundle,
} from '../../services/weather/guide';
import type { SeasonalWeatherCardVisualTheme } from '../../theme/seasonal/weather';

type Props = {
  weather: WeatherGuideBundle;
  locationLabel?: string;
  petName?: string | null;
  accentColor?: string;
  visualTheme?: SeasonalWeatherCardVisualTheme | null;
  hideSeasonalBackgroundImage?: boolean;
  onPress: () => void;
};

type Notice = {
  label: string;
  message: string;
  detail: string;
};

function WeatherMaterialFrame({ children, colors, style, frosted }: PropsWithChildren<{
  colors: string[];
  style: StyleProp<ViewStyle>;
  frosted: boolean;
}>) {
  const season = useEffectiveSeason();
  return frosted ? (
    <HomeFrostedGlass season={season} borderRadius={27} style={[{ marginTop: 0 }, style]}>
      {children}
    </HomeFrostedGlass>
  ) : (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>
      {children}
    </LinearGradient>
  );
}

export const WEATHER_DAY_BORDER_COLORS = [
  '#8ED7FF',
  '#C1B7FF',
  '#F6B9E9',
  '#F2D66A',
];

const NIGHT_BORDER_COLORS = [
  'rgba(155,174,255,0.72)',
  'rgba(157,126,255,0.86)',
  'rgba(99,132,224,0.72)',
] as const;

// Weekly summary metrics derive their scale from the same temperature number.
// Keep this source value beside the weather card so the two visual hierarchies
// cannot drift independently.
export const WEATHER_TEMPERATURE_FONT_SIZE = 38;
const SEASONAL_CARD_ASPECT_RATIO = 1665 / 945;
const HOME_HORIZONTAL_GUTTER = 16;

function getNotice(
  weather: WeatherGuideBundle,
  petName?: string | null,
): Notice {
  const safety = weather.precipitationSafety ?? weather.temperatureSafety;

  if (!safety) {
    return {
      label: '오늘의 날씨 안내',
      message: '실시간 날씨를 확인해 주세요',
      detail: '연결이 완료되면 산책 전 필요한 안내를 보여드려요.',
    };
  }

  return {
    label: safety.label,
    message: formatWeatherPetText(safety.message, petName),
    detail: formatWeatherPetText(safety.detail, petName),
  };
}

function getWeatherDateLabel() {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    timeZone: 'Asia/Seoul',
  }).formatToParts(new Date());

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? '';
  const month = getPart('month').replace(/^0/, '');
  const day = getPart('day').replace(/^0/, '');

  return `${month}월 ${day}일 (${getPart('weekday')})`;
}

function renderAccentText(text: string, accentColor: string) {
  const segments = text.split(/(좋은|주의|더위|폭염|산책)/g);

  return segments.map((segment, index) => {
    const highlighted = /^(좋은|주의|더위|폭염|산책)$/.test(segment);
    return (
      <Text
        key={`${segment}-${index}`}
        style={highlighted ? { color: accentColor, fontWeight: '800' } : null}
      >
        {segment}
      </Text>
    );
  });
}

function getNightWeatherEmoji(weather: WeatherGuideBundle) {
  return getWeatherEmoji(weather.weatherIcon);
}

function getUvLabel(uvIndex: number) {
  if (uvIndex >= 8) return '매우 높음';
  if (uvIndex >= 6) return '높음';
  if (uvIndex >= 3) return '보통';
  if (uvIndex >= 1) return '낮음';
  return '확인 필요';
}

const Metric = React.memo(function WeatherMetric({
  icon,
  label,
  value,
  color,
  borderRightColor,
  enlarged = false,
  compact = false,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  borderRightColor?: string;
  enlarged?: boolean;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        styles.metric,
        compact ? styles.compactMetric : null,
        enlarged ? styles.enlargedMetric : null,
        borderRightColor
          ? { borderRightColor, borderRightWidth: StyleSheet.hairlineWidth }
          : null,
      ]}
    >
      <Feather name={icon} size={16} color={color} />
      <View style={styles.metricCopy}>
        <Text
          style={[styles.metricLabel, { color }]}
          numberOfLines={enlarged ? undefined : 1}
        >
          {label}
        </Text>
        <Text
          style={[styles.metricValue, { color }]}
          numberOfLines={enlarged ? undefined : 1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
});

export default React.memo(function WeatherGuideHomeCard({
  weather,
  locationLabel,
  petName,
  accentColor = '#6D6AF8',
  visualTheme = null,
  hideSeasonalBackgroundImage = false,
  onPress,
}: Props) {
  const { width, fontScale } = useWindowDimensions();
  const enlarged = fontScale > 1;
  const metricLayout = resolveWeatherMetricLayout({ width, fontScale, values: [
    `${weather.apparentTemperature}°`, `${weather.humidity}%`,
    `${weather.windSpeed}m/s`, getUvLabel(weather.uvIndex),
  ] });
  const metricsExpanded = metricLayout.columns === 2;
  // The approved aspect ratio applies only while the copy fits at default scale.
  const seasonalCardHeight = visualTheme && !enlarged && !metricsExpanded
    ? (width - HOME_HORIZONTAL_GUTTER * 2) / SEASONAL_CARD_ASPECT_RATIO
    : undefined;
  const isNightCard = !weather.isDaytime;
  const isCompact = width <= 370;
  const hasLiveData = weather.dataSource === 'live';
  const isPreview = weather.dataSource === 'preview';
  const notice = getNotice(weather, petName);
  const textPrimary =
    visualTheme?.primaryText ?? (isNightCard ? '#FFFFFF' : '#1F2940');
  const detailMetricColor =
    visualTheme?.metricText ?? (isNightCard ? '#FFFFFF' : '#111827');
  const textSecondary =
    visualTheme?.secondaryText ??
    (isNightCard ? 'rgba(241,245,255,0.76)' : '#5B647A');
  const muted =
    visualTheme?.mutedText ??
    (isNightCard ? 'rgba(221,229,249,0.72)' : '#69758B');
  const separator =
    visualTheme?.separator ??
    (isNightCard ? 'rgba(255,255,255,0.14)' : 'rgba(80,93,122,0.14)');
  const panelBackground =
    visualTheme?.guideBackground ??
    (isNightCard ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.68)');
  // Seasonal Home uses one shared glass surface; retain the legacy night fallback.
  const surfaceColors = visualTheme
    ? ['transparent', 'transparent']
    : isNightCard
    ? ['#2A2F63', '#1B214B', '#111734']
    : ['#FFFFFF', '#F8F9FD'];
  const gradientColors = visualTheme
    ? ['transparent', 'transparent']
    : isNightCard
    ? [...NIGHT_BORDER_COLORS]
    : [...WEATHER_DAY_BORDER_COLORS];
  const effectiveAccentColor = visualTheme?.accent ?? accentColor;
  const locationColor = visualTheme ? effectiveAccentColor : textPrimary;
  const temperatureColor = visualTheme ? effectiveAccentColor : textPrimary;
  const noticeArrowColor = visualTheme ? effectiveAccentColor : muted;
  const temperatureValue =
    hasLiveData || isPreview ? `${weather.currentTemperature}` : '--';

  return (
    <TouchableOpacity
      activeOpacity={0.96}
      style={[
        styles.touchable,
        visualTheme ? styles.profileEditGlassTouchable : null,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="날씨 상세 보기"
    >
      <WeatherMaterialFrame
        frosted={!!visualTheme}
        colors={gradientColors}
        style={[
          styles.outerBorder,
          visualTheme ? styles.seasonalOuterBorder : null,
          seasonalCardHeight ? { height: seasonalCardHeight } : null,
        ]}
      >
        {visualTheme && !hideSeasonalBackgroundImage ? (
          <View
            style={styles.cardImageUnderlay}
            pointerEvents="none"
            accessible={false}
          >
            <View
              style={[
                styles.cardBackgroundLayer,
                { left: visualTheme.backgroundLeftInset },
              ]}
            >
              <Image
                source={visualTheme.backgroundImage}
                resizeMode={visualTheme.backgroundResizeMode}
                style={styles.cardBackgroundImage}
                accessible={false}
              />
            </View>
          </View>
        ) : null}
        <LinearGradient
          colors={surfaceColors}
          style={[
            styles.cardSurface,
            visualTheme ? styles.seasonalCardSurface : null,
          ]}
        >
          {!visualTheme ? (
            <LinearGradient
              colors={
                isNightCard
                  ? ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']
                  : ['rgba(255,255,255,0.82)', 'rgba(255,255,255,0)']
              }
              style={styles.highlightStroke}
              pointerEvents="none"
            />
          ) : null}
          <View style={styles.metaRow}>
            <View
              style={[
                styles.locationPill,
                {
                  backgroundColor:
                    visualTheme?.locationBackground ??
                    (isNightCard
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(255,255,255,0.78)'),
                  borderWidth: visualTheme ? 0 : 1,
                  borderColor:
                    visualTheme?.locationBorder ??
                    (isNightCard
                      ? 'rgba(255,255,255,0.18)'
                      : 'rgba(121,139,182,0.15)'),
                },
              ]}
            >
              <Feather name="map-pin" size={14} color={locationColor} />
              <Text
                style={[styles.locationText, { color: locationColor }]}
                numberOfLines={1}
              >
                {locationLabel ?? weather.district}
              </Text>
            </View>
            <View style={styles.dateWrap}>
              <View
                style={[
                  styles.dateGlassSurface,
                  {
                    backgroundColor:
                      visualTheme?.locationBackground ??
                      (isNightCard
                        ? 'rgba(18, 29, 61, 0.34)'
                        : 'rgba(255, 255, 255, 0.58)'),
                    borderColor:
                      visualTheme?.copyBorder ??
                      (isNightCard
                        ? 'rgba(255, 255, 255, 0.18)'
                        : 'rgba(255, 255, 255, 0.66)'),
                  },
                ]}
              >
                <Text
                  style={[styles.dateText, { color: textPrimary }]}
                  numberOfLines={1}
                >
                  {getWeatherDateLabel()}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.mainRow,
              visualTheme ? styles.seasonalMainRow : null,
              isCompact ? styles.mainRowCompact : null,
              enlarged ? styles.enlargedMainRow : null,
            ]}
          >
            <View style={styles.weatherArt}>
              <Text
                style={[
                  styles.weatherEmoji,
                  isCompact ? styles.weatherEmojiCompact : null,
                ]}
              >
                {getNightWeatherEmoji(weather)}
              </Text>
            </View>

            <View style={styles.copyColumn}>
              <View
                style={[
                  styles.temperatureRow,
                  isCompact ? styles.temperatureCompact : null,
                ]}
              >
                <Text
                  style={[styles.temperatureValue, { color: temperatureColor }]}
                  numberOfLines={1}
                >
                  {temperatureValue}
                </Text>
                <View style={styles.temperatureUnit}>
                  <Text
                    style={[
                      styles.temperatureDegree,
                      { color: temperatureColor },
                    ]}
                  >
                    °
                  </Text>
                  <Text
                    style={[
                      styles.temperatureCelsius,
                      { color: temperatureColor },
                    ]}
                  >
                    C
                  </Text>
                </View>
              </View>
              <View style={styles.copyTextGroup}>
                {visualTheme ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.copyTextBacking,
                      {
                        backgroundColor: visualTheme.copyBackground,
                        borderColor: visualTheme.copyBorder,
                      },
                    ]}
                  />
                ) : null}
                <Text
                  style={[
                    styles.headline,
                    isCompact ? styles.headlineCompact : null,
                    { color: textPrimary },
                  ]}
                  numberOfLines={enlarged ? undefined : 2}
                >
                  {renderAccentText(
                    formatWeatherPetText(weather.homeMessage, petName),
                    effectiveAccentColor,
                  )}
                </Text>
                <Text
                  style={[
                    styles.caption,
                    isCompact ? styles.captionCompact : null,
                    { color: visualTheme ? textPrimary : textSecondary },
                  ]}
                  numberOfLines={enlarged ? undefined : 2}
                >
                  {isPreview
                    ? '최근 확인한 날씨를 잠시 보여드리고 있어요.'
                    : formatWeatherPetText(weather.homeCaption, petName)}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.noticePanel,
                isCompact ? styles.noticePanelCompact : null,
                enlarged ? styles.enlargedNoticePanel : null,
                {
                  backgroundColor: panelBackground,
                  borderWidth: visualTheme ? 0 : 1,
                  borderColor:
                    visualTheme?.guideBorder ??
                    (isNightCard
                      ? 'rgba(255,255,255,0.18)'
                      : 'rgba(160,180,255,0.30)'),
                },
              ]}
            >
              <Text
                style={[
                  styles.noticeLabel,
                  isCompact ? styles.noticeLabelCompact : null,
                  { color: effectiveAccentColor },
                ]}
                numberOfLines={enlarged ? undefined : 2}
              >
                {notice.label}
              </Text>
              <Text
                style={[
                  styles.noticeMessage,
                  isCompact ? styles.noticeMessageCompact : null,
                  { color: textPrimary },
                ]}
                numberOfLines={enlarged ? undefined : 3}
              >
                {notice.message}
              </Text>
              <Feather
                name="chevron-right"
                size={17}
                color={noticeArrowColor}
                style={styles.noticeArrow}
              />
            </View>
          </View>

          <View
            style={[
              styles.metricsBar,
              visualTheme ? styles.seasonalMetricsBar : null,
              metricsExpanded ? styles.enlargedMetricsBar : null,
              {
                backgroundColor:
                  visualTheme?.metricBackground ??
                  (isNightCard
                    ? 'rgba(7,11,30,0.24)'
                    : 'rgba(255,255,255,0.56)'),
                borderTopColor: separator,
              },
            ]}
          >
            <Metric
              icon="thermometer"
              label="체감"
              value={`${weather.apparentTemperature}°`}
              color={detailMetricColor}
              borderRightColor={separator}
              enlarged={metricsExpanded}
              compact={metricLayout.compact}
            />
            <Metric
              icon="droplet"
              label="습도"
              value={`${weather.humidity}%`}
              color={detailMetricColor}
              borderRightColor={metricsExpanded ? undefined : separator}
              enlarged={metricsExpanded}
              compact={metricLayout.compact}
            />
            <Metric
              icon="wind"
              label="바람"
              value={`${weather.windSpeed}m/s`}
              color={detailMetricColor}
              borderRightColor={separator}
              enlarged={metricsExpanded}
              compact={metricLayout.compact}
            />
            <Metric
              icon="sun"
              label="자외선"
              value={getUvLabel(weather.uvIndex)}
              color={detailMetricColor}
              enlarged={metricsExpanded}
              compact={metricLayout.compact}
            />
          </View>
        </LinearGradient>
      </WeatherMaterialFrame>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 27,
    shadowColor: '#52618F',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  profileEditGlassTouchable: {
    shadowOpacity: 0,
    elevation: 0,
  },
  outerBorder: {
    minHeight: 216,
    borderRadius: 27,
    padding: 1.25,
  },
  seasonalOuterBorder: {
    minHeight: 0,
  },
  cardSurface: {
    flex: 1,
    minHeight: 213,
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  seasonalCardSurface: {
    minHeight: 0,
    paddingVertical: 8,
  },
  // Keep the existing seasonal image geometry underneath the shared glass.
  cardImageUnderlay: {
    position: 'absolute',
    top: 1.25,
    right: 1.25,
    bottom: 1.25,
    left: 1.25,
    borderRadius: 26,
    overflow: 'hidden',
  },
  cardBackgroundLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  cardBackgroundImage: {
    width: '100%',
    height: '100%',
  },
  highlightStroke: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    height: 42,
    borderRadius: 25,
    zIndex: 1,
  },
  metaRow: {
    position: 'relative',
    zIndex: 2,
    minHeight: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  locationPill: {
    minHeight: 28,
    maxWidth: '44%',
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    flexShrink: 1,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '600',
  },
  dateWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  dateGlassSurface: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    flexShrink: 1,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  mainRow: {
    position: 'relative',
    zIndex: 2,
    minHeight: 100,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  seasonalMainRow: {
    minHeight: 0,
    flex: 1,
    marginTop: 2,
  },
  mainRowCompact: {
    gap: 5,
  },
  enlargedMainRow: {
    flex: 0,
    flexWrap: 'wrap',
    rowGap: 8,
  },
  weatherArt: {
    width: '22%',
    minWidth: 58,
    paddingTop: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherEmoji: {
    fontSize: 50,
    lineHeight: 60,
    alignSelf: 'center',
    textAlign: 'center',
  },
  weatherEmojiCompact: {
    fontSize: 42,
    lineHeight: 51,
    alignSelf: 'center',
  },
  copyColumn: {
    minWidth: 0,
    flex: 1,
    gap: 1,
  },
  copyTextGroup: {
    position: 'relative',
    gap: 1,
  },
  copyTextBacking: {
    position: 'absolute',
    top: -2,
    right: -4,
    bottom: -2,
    left: -4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  temperatureRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  temperatureCompact: {
    minHeight: 34,
  },
  temperatureValue: {
    fontSize: WEATHER_TEMPERATURE_FONT_SIZE,
    lineHeight: 40,
    fontWeight: '800',
  },
  temperatureUnit: {
    marginLeft: 3,
    marginTop: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  temperatureDegree: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  temperatureCelsius: {
    marginLeft: -1,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '700',
  },
  headline: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
  },
  headlineCompact: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
  },
  caption: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '500',
  },
  captionCompact: {
    fontSize: 8,
    lineHeight: 11,
  },
  noticePanel: {
    width: '34%',
    minHeight: 84,
    marginTop: 6,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  noticePanelCompact: {
    width: '33%',
    minHeight: 82,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  enlargedNoticePanel: {
    width: '100%',
    minHeight: 0,
    paddingBottom: 22,
  },
  noticeLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
  },
  noticeLabelCompact: {
    fontSize: 9,
    lineHeight: 13,
  },
  noticeMessage: {
    marginTop: 6,
    paddingRight: 5,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '600',
  },
  noticeMessageCompact: {
    marginTop: 4,
    fontSize: 9,
    lineHeight: 13,
  },
  noticeArrow: {
    position: 'absolute',
    right: 8,
    bottom: 8,
  },
  metricsBar: {
    position: 'relative',
    zIndex: 2,
    minHeight: 43,
    marginTop: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  seasonalMetricsBar: {
    minHeight: 38,
    marginTop: 4,
    borderRadius: 10,
  },
  enlargedMetricsBar: {
    flexWrap: 'wrap',
    rowGap: 8,
    paddingVertical: 8,
    marginTop: 10,
  },
  metric: {
    minWidth: 0,
    flex: 1,
    minHeight: 30,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  metricCopy: {
    minWidth: 0,
    flexShrink: 0,
  },
  compactMetric: {
    paddingHorizontal: 2,
    gap: 2,
  },
  enlargedMetric: {
    flex: 0,
    width: '50%',
  },
  metricLabel: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '600',
    opacity: 0.76,
  },
  metricValue: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
});
