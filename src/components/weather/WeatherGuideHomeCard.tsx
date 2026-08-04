// 파일: src/components/weather/WeatherGuideHomeCard.tsx
// 역할:
// - 홈 화면의 날씨 요약을 낮/밤 프리미엄 카드로 렌더링한다.
// - 날씨 번들의 안전 문구와 선택 펫 이름을 표시 계층에서 개인화한다.

import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

import {
  formatWeatherPetText,
  getWeatherEmoji,
  type WeatherGuideBundle,
} from '../../services/weather/guide';

type Props = {
  weather: WeatherGuideBundle;
  locationLabel?: string;
  petName?: string | null;
  accentColor?: string;
  onPress: () => void;
};

type Notice = {
  label: string;
  message: string;
  detail: string;
};

export const WEATHER_DAY_BORDER_COLORS = [
  '#8ED7FF',
  '#C1B7FF',
  '#F6B9E9',
  '#F2D66A',
];

// Weekly summary metrics derive their scale from the same temperature number.
// Keep this source value beside the weather card so the two visual hierarchies
// cannot drift independently.
export const WEATHER_TEMPERATURE_FONT_SIZE = 38;

const NIGHT_BORDER_COLORS = [
  'rgba(155,174,255,0.72)',
  'rgba(157,126,255,0.86)',
  'rgba(99,132,224,0.72)',
] as const;

function getNotice(weather: WeatherGuideBundle, petName?: string | null): Notice {
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

const Metric = React.memo(function Metric({
  icon,
  label,
  value,
  color,
  borderRightColor,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  borderRightColor?: string;
}) {
  return (
    <View
      style={[
        styles.metric,
        borderRightColor
          ? { borderRightColor, borderRightWidth: StyleSheet.hairlineWidth }
          : null,
      ]}
    >
      <Feather name={icon} size={16} color={color} />
      <View style={styles.metricCopy}>
        <Text style={[styles.metricLabel, { color }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.metricValue, { color }]} numberOfLines={1}>
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
  onPress,
}: Props) {
  const { width } = useWindowDimensions();
  const isNightCard = !weather.isDaytime;
  const isCompact = width <= 370;
  const hasLiveData = weather.dataSource === 'live';
  const isPreview = weather.dataSource === 'preview';
  const notice = getNotice(weather, petName);
  const textPrimary = isNightCard ? '#FFFFFF' : '#1F2940';
  const detailMetricColor = isNightCard ? '#FFFFFF' : '#111827';
  const textSecondary = isNightCard
    ? 'rgba(241,245,255,0.76)'
    : '#5B647A';
  const muted = isNightCard ? 'rgba(221,229,249,0.72)' : '#69758B';
  const separator = isNightCard
    ? 'rgba(255,255,255,0.14)'
    : 'rgba(80,93,122,0.14)';
  const panelBackground = isNightCard
    ? 'rgba(255,255,255,0.07)'
    : 'rgba(255,255,255,0.68)';
  const surfaceColors = isNightCard
    ? ['#2A2F63', '#1B214B', '#111734']
    : ['#FFFFFF', '#F8F9FD'];
  const gradientColors = isNightCard
    ? [...NIGHT_BORDER_COLORS]
    : [...WEATHER_DAY_BORDER_COLORS];
  const temperatureValue = hasLiveData || isPreview
    ? `${weather.currentTemperature}`
    : '--';

  return (
    <TouchableOpacity
      activeOpacity={0.96}
      style={styles.touchable}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="날씨 상세 보기"
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.outerBorder}
      >
        <LinearGradient colors={surfaceColors} style={styles.cardSurface}>
          <LinearGradient
            colors={
              isNightCard
                ? ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']
                : ['rgba(255,255,255,0.82)', 'rgba(255,255,255,0)']
            }
            style={styles.highlightStroke}
            pointerEvents="none"
          />

          <View style={styles.metaRow}>
            <View
              style={[
                styles.locationPill,
                {
                  backgroundColor: isNightCard
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(255,255,255,0.78)',
                  borderColor: isNightCard
                    ? 'rgba(255,255,255,0.18)'
                    : 'rgba(121,139,182,0.15)',
                },
              ]}
            >
              <Feather name="map-pin" size={14} color={textPrimary} />
              <Text style={[styles.locationText, { color: textPrimary }]} numberOfLines={1}>
                {locationLabel ?? weather.district}
              </Text>
            </View>
            <View style={styles.dateWrap}>
              <Text style={[styles.dateText, { color: textPrimary }]} numberOfLines={1}>
                {getWeatherDateLabel()}
              </Text>
            </View>
          </View>

          <View style={[styles.mainRow, isCompact ? styles.mainRowCompact : null]}>
            <View style={styles.weatherArt}>
              <Text style={[styles.weatherEmoji, isCompact ? styles.weatherEmojiCompact : null]}>
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
                <Text style={[styles.temperatureValue, { color: textPrimary }]} numberOfLines={1}>
                  {temperatureValue}
                </Text>
                <View style={styles.temperatureUnit}>
                  <Text style={[styles.temperatureDegree, { color: textPrimary }]}>°</Text>
                  <Text style={[styles.temperatureCelsius, { color: textPrimary }]}>C</Text>
                </View>
              </View>
              <Text style={[styles.headline, isCompact ? styles.headlineCompact : null, { color: textPrimary }]} numberOfLines={2}>
                {renderAccentText(formatWeatherPetText(weather.homeMessage, petName), accentColor)}
              </Text>
              <Text style={[styles.caption, isCompact ? styles.captionCompact : null, { color: textSecondary }]} numberOfLines={2}>
                {isPreview
                  ? '최근 확인한 날씨를 잠시 보여드리고 있어요.'
                  : formatWeatherPetText(weather.homeCaption, petName)}
              </Text>
            </View>

            <View
              style={[
                styles.noticePanel,
                isCompact ? styles.noticePanelCompact : null,
                {
                  backgroundColor: panelBackground,
                  borderColor: isNightCard
                    ? 'rgba(255,255,255,0.18)'
                    : 'rgba(160,180,255,0.30)',
                },
              ]}
            >
              <Text style={[styles.noticeLabel, isCompact ? styles.noticeLabelCompact : null, { color: accentColor }]} numberOfLines={2}>
                {notice.label}
              </Text>
              <Text style={[styles.noticeMessage, isCompact ? styles.noticeMessageCompact : null, { color: textPrimary }]} numberOfLines={3}>
                {notice.message}
              </Text>
              <Feather name="chevron-right" size={17} color={muted} style={styles.noticeArrow} />
            </View>
          </View>

          <View style={[styles.metricsBar, { backgroundColor: isNightCard ? 'rgba(7,11,30,0.24)' : 'rgba(255,255,255,0.56)', borderTopColor: separator }]}>
            <Metric icon="thermometer" label="체감" value={`${weather.apparentTemperature}°`} color={detailMetricColor} borderRightColor={separator} />
            <Metric icon="droplet" label="습도" value={`${weather.humidity}%`} color={detailMetricColor} borderRightColor={separator} />
            <Metric icon="wind" label="바람" value={`${weather.windSpeed}m/s`} color={detailMetricColor} borderRightColor={separator} />
            <Metric icon="sun" label="자외선" value={getUvLabel(weather.uvIndex)} color={detailMetricColor} />
          </View>
        </LinearGradient>
      </LinearGradient>
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
  outerBorder: {
    minHeight: 216,
    borderRadius: 27,
    padding: 1.25,
  },
  cardSurface: {
    flex: 1,
    minHeight: 213,
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  highlightStroke: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    height: 42,
    borderRadius: 25,
  },
  metaRow: {
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
  dateText: {
    flexShrink: 1,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  mainRow: {
    minHeight: 100,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  mainRowCompact: {
    gap: 5,
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
    minHeight: 43,
    marginTop: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
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
    flexShrink: 1,
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
