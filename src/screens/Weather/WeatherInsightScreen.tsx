// 파일: src/screens/Weather/WeatherInsightScreen.tsx
// 파일 목적:
// - 현재 위치 기준 날씨/대기질/활동 인사이트를 사용자에게 상세하게 보여주는 대표 화면이다.
// 어디서 쓰이는지:
// - RootNavigator의 `WeatherInsight` 라우트에서 사용되며, 홈의 날씨 카드에서 진입한다.
// 핵심 역할:
// - `useWeatherGuide`가 만든 bundle을 바탕으로 현재 날씨, 예보, 대기질, 실내 놀이 진입 CTA를 렌더링한다.
// - 날씨 시나리오별 배경/팔레트를 적용해 정보와 분위기를 함께 전달한다.
// 데이터·상태 흐름:
// - initial bundle/coordinates가 있으면 이를 우선 사용하고, 이후 hook이 실제 위치와 최신 데이터를 이어받아 갱신한다.
// - 화면 자체는 표시 계층이고, 위치/날씨 조회 정책은 hook과 service 계층에 위임한다.
// 수정 시 주의:
// - 시각 표현을 바꿀 때도 unavailable/preview 상태를 숨기면 안 된다.
// - 배경 이미지나 레이아웃 변경보다 우선해야 하는 것은 위치 실패/권한 거부 시 정보 전달의 명확성이다.
import React, { useCallback, useMemo } from 'react';
import {
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import Feather from '../../components/icons/NuriFeatherIcon';

import AirQualityInsightCard from '../../components/weather/AirQualityInsightCard';
import WeatherForecastStrip from '../../components/weather/WeatherForecastStrip';
import WeatherHourlyPrecipitation from '../../components/weather/WeatherHourlyPrecipitation';
import WeatherGlassCard from '../../components/weather/WeatherGlassCard';
import { useWeatherGuide } from '../../hooks/useWeatherGuide';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { DeviceCoordinates } from '../../services/location/currentPosition';
import {
  formatWeatherPetText,
  type WeatherGuideBundle,
  type WeatherScenario,
} from '../../services/weather/guide';
import { usePetStore } from '../../store/petStore';
import {
  formatWeatherMeasurement,
  getUvLabel,
  getWeatherAdvice,
  readWeatherMeasurement,
} from '../../services/weather/presentation';
import { getUpcomingWeatherHours } from '../../services/weather/reliability';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import {
  getSeasonalWeatherHeroVisual,
  getWeatherHeroTextPalette,
  type WeatherScenePalette as ScenePalette,
} from '../../theme/seasonal/weatherHero';

type Nav = NativeStackNavigationProp<RootStackParamList, 'WeatherInsight'>;

type WeatherInsightRoute = {
  key: string;
  name: 'WeatherInsight';
  params?: {
    district?: string;
    initialBundle?: WeatherGuideBundle;
    initialCoordinates?: DeviceCoordinates;
  };
};

const CLEAR_DAY_IMAGE = require('../../assets/weather/clear-day.png');
const CLEAR_NIGHT_IMAGE = require('../../assets/weather/clear-night.png');
const DUSTY_IMAGE = require('../../assets/weather/dusty.png');
const RAIN_IMAGE = require('../../assets/weather/rain.png');
const SNOW_IMAGE = require('../../assets/weather/snow.png');
const UNAVAILABLE_PALETTE: ScenePalette = {
  background: ['#EEF2F7', '#E6ECF4', '#D8E0EA'],
  cardBackground: 'rgba(255,255,255,0.78)',
  cardBorder: 'rgba(132,147,168,0.18)',
  textPrimary: '#223042',
  textSecondary: 'rgba(34,48,66,0.68)',
  accent: '#6E8FB8',
  accentSoft: 'rgba(110,143,184,0.18)',
};

function getScenePalette(
  scenario: WeatherScenario,
  isDaytime: boolean,
): ScenePalette {
  if (scenario === 'snow') {
    return isDaytime
      ? {
          background: ['#D8E7FF', '#7DB0FF', '#2C63D9'],
          cardBackground: 'rgba(255,255,255,0.18)',
          cardBorder: 'rgba(255,255,255,0.22)',
          textPrimary: '#F8FBFF',
          textSecondary: 'rgba(233,241,255,0.86)',
          accent: '#F7FDFF',
          accentSoft: 'rgba(247,253,255,0.22)',
        }
      : {
          background: ['#07152F', '#16386B', '#2A5AAC'],
          cardBackground: 'rgba(6,31,76,0.32)',
          cardBorder: 'rgba(255,255,255,0.14)',
          textPrimary: '#F8FBFF',
          textSecondary: 'rgba(225,235,248,0.82)',
          accent: '#DDF5FF',
          accentSoft: 'rgba(221,245,255,0.18)',
        };
  }

  if (scenario === 'rain') {
    return isDaytime
      ? {
          background: ['#6B7FA6', '#3A67A8', '#173D77'],
          cardBackground: 'rgba(20,38,87,0.24)',
          cardBorder: 'rgba(255,255,255,0.14)',
          textPrimary: '#F8FBFF',
          textSecondary: 'rgba(227,236,248,0.82)',
          accent: '#D6ECFF',
          accentSoft: 'rgba(214,236,255,0.18)',
        }
      : {
          background: ['#041226', '#102F5C', '#17447F'],
          cardBackground: 'rgba(7,24,56,0.34)',
          cardBorder: 'rgba(255,255,255,0.14)',
          textPrimary: '#F8FBFF',
          textSecondary: 'rgba(227,236,248,0.82)',
          accent: '#D6ECFF',
          accentSoft: 'rgba(214,236,255,0.18)',
        };
  }

  if (scenario === 'dusty') {
    return isDaytime
      ? {
          background: ['#A7907C', '#746A63', '#564F4B'],
          cardBackground: 'rgba(255,250,244,0.12)',
          cardBorder: 'rgba(255,245,236,0.14)',
          textPrimary: '#FFF8F0',
          textSecondary: 'rgba(250,238,227,0.8)',
          accent: '#FFE3A7',
          accentSoft: 'rgba(255,227,167,0.18)',
        }
      : {
          background: ['#1A202A', '#383A45', '#4B454D'],
          cardBackground: 'rgba(255,248,240,0.10)',
          cardBorder: 'rgba(255,245,236,0.12)',
          textPrimary: '#FFF8F0',
          textSecondary: 'rgba(250,238,227,0.8)',
          accent: '#FFD59A',
          accentSoft: 'rgba(255,213,154,0.16)',
        };
  }

  return isDaytime
    ? {
        background: ['#F7FBFF', '#EAF5FF', '#DCEFFF'],
        cardBackground: 'rgba(255,255,255,0.74)',
        cardBorder: 'rgba(255,255,255,0.44)',
        textPrimary: '#17345F',
        textSecondary: 'rgba(41,78,125,0.72)',
        accent: '#FFE06B',
        accentSoft: 'rgba(255,224,107,0.22)',
      }
    : {
        background: ['#040F27', '#0D2A63', '#1149A8'],
        cardBackground: 'rgba(7,24,67,0.34)',
        cardBorder: 'rgba(255,255,255,0.14)',
        textPrimary: '#F8FBFF',
        textSecondary: 'rgba(225,236,252,0.82)',
        accent: '#FFE06B',
        accentSoft: 'rgba(255,224,107,0.16)',
      };
}

function getHumidityMessage(humidity: number) {
  if (humidity >= 75)
    return '습도가 높아요. 실내 환기와 적정 습도를 살펴주세요.';
  if (humidity >= 40)
    return '현재 상대 습도예요. 생활 공간의 습도는 별도로 확인해 주세요.';
  return '공기가 건조한 편이에요. 수분과 생활 공간의 습도를 챙겨주세요.';
}

function getWindMessage(windSpeed: number) {
  if (windSpeed >= 8)
    return '바람이 강해요. 노출된 장소를 피하고 기상특보를 확인해 주세요.';
  if (windSpeed >= 4)
    return '바람이 다소 불어요. 외출 장소와 시간을 조절해 주세요.';
  return '바람이 약한 편이에요.';
}

function getCloudLabel(cloudCover: number) {
  if (cloudCover >= 80) return '흐림';
  if (cloudCover >= 45) return '구름 많음';
  if (cloudCover >= 20) return '구름 조금';
  return '맑음';
}

function getHeroImageSource(scenario: WeatherScenario, isDaytime: boolean) {
  if (scenario === 'dusty') {
    return DUSTY_IMAGE;
  }

  if (scenario === 'fresh') {
    return isDaytime ? CLEAR_DAY_IMAGE : CLEAR_NIGHT_IMAGE;
  }

  if (scenario === 'rain') {
    return RAIN_IMAGE;
  }

  if (scenario === 'snow') {
    return SNOW_IMAGE;
  }

  return null;
}

export default function WeatherInsightScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const season = useEffectiveSeason();
  const singleColumnMetrics = width < 360 || fontScale > 1.2;
  const route = useRoute<WeatherInsightRoute>();
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const selectedPet = useMemo(
    () =>
      pets.find(candidate => candidate.id === selectedPetId) ?? pets[0] ?? null,
    [pets, selectedPetId],
  );
  const selectedPetName = selectedPet?.name ?? null;

  const weatherState = useWeatherGuide(
    route.params?.district ?? '현재 위치',
    route.params?.initialBundle,
    {
      initialCoordinates: route.params?.initialCoordinates,
      autoRefreshOnMount: true,
      autoRefreshOnFocus: true,
      autoRefreshOnActive: true,
    },
  );
  const weather = weatherState.bundle;
  const hasLiveWeather = weather.dataSource === 'live';
  const hasPreviewWeather = weather.dataSource === 'preview';
  const hasRenderableWeather = weather.dataSource !== 'unavailable';
  const displayScenario = weather.scenario;
  const sceneIsDaytime = weather.isDaytime;
  const seasonalHero = useMemo(
    () =>
      hasRenderableWeather
        ? getSeasonalWeatherHeroVisual(season, displayScenario, sceneIsDaytime)
        : null,
    [displayScenario, hasRenderableWeather, sceneIsDaytime, season],
  );
  const displayWeather = useMemo(
    () => ({
      ...weather,
      scenario: displayScenario,
      isDaytime: sceneIsDaytime,
    }),
    [displayScenario, sceneIsDaytime, weather],
  );

  const palette = useMemo(
    () =>
      hasRenderableWeather
        ? seasonalHero?.palette ??
          getScenePalette(displayScenario, sceneIsDaytime)
        : UNAVAILABLE_PALETTE,
    [seasonalHero, displayScenario, hasRenderableWeather, sceneIsDaytime],
  );
  const advice = getWeatherAdvice(weather, selectedPetName);
  const needsRefresh = !hasLiveWeather || !!weatherState.error;
  const attributionLabel = weather.attribution?.label?.trim() || 'Open-Meteo';

  const routeDistrict = route.params?.district?.trim() || null;
  const displayDistrict =
    weather.district === '현재 위치' &&
    routeDistrict &&
    routeDistrict !== '현재 위치'
      ? routeDistrict
      : weather.district;

  const metrics = useMemo(() => {
    const feelsLike = readWeatherMeasurement(weather, 'apparentTemperature');
    const temperature = readWeatherMeasurement(weather, 'currentTemperature');
    const humidity = readWeatherMeasurement(weather, 'humidity');
    const wind = readWeatherMeasurement(weather, 'windSpeed');
    const uv = readWeatherMeasurement(weather, 'uvIndex');
    const unavailableCopy = '이 항목의 정보를 확인하지 못했어요.';
    const items = [
      {
        key: 'feels-like',
        title: '체감 온도',
        value: formatWeatherMeasurement(weather, 'apparentTemperature', '°C'),
        description:
          feelsLike === null || temperature === null
            ? unavailableCopy
            : feelsLike === temperature
            ? '현재 기온과 비슷하게 느껴져요.'
            : feelsLike < temperature
            ? `기온보다 ${temperature - feelsLike}° 낮게 느껴져요.`
            : `기온보다 ${feelsLike - temperature}° 높게 느껴져요.`,
      },
      {
        key: 'humidity',
        title: '습도',
        value: formatWeatherMeasurement(weather, 'humidity', '%'),
        description:
          humidity === null ? unavailableCopy : getHumidityMessage(humidity),
      },
      {
        key: 'wind',
        title: '바람',
        value: formatWeatherMeasurement(weather, 'windSpeed', 'm/s'),
        description: wind === null ? unavailableCopy : getWindMessage(wind),
      },
      {
        key: 'uv',
        title: '오늘 최대 자외선',
        value: getUvLabel(uv),
        description: uv === null ? unavailableCopy : `최대 지수 ${uv}`,
      },
    ];
    return hasPreviewWeather
      ? items.map(item => ({
          ...item,
          description: `최근 확인 정보 · ${item.description}`,
        }))
      : items;
  }, [weather, hasPreviewWeather]);

  const atmosphericMetrics = useMemo(() => {
    const cloud = readWeatherMeasurement(weather, 'cloudCover');
    const chance = weather.weekly.find(
      item => item.label === '오늘',
    )?.precipitationChance;
    return [
      {
        key: 'cloud',
        title: '하늘 상태',
        value: cloud === null ? '확인 중' : getCloudLabel(cloud),
        description:
          cloud === null
            ? '구름량 정보를 확인하지 못했어요.'
            : `전체 구름량 ${cloud}%`,
      },
      {
        key: 'precipitation',
        title: '오늘 최대 강수 확률',
        value: chance === undefined ? '확인 중' : `${chance}%`,
        description: '외출 시간대의 확률도 함께 살펴주세요.',
      },
    ];
  }, [weather]);

  const heroImageSource = useMemo(() => {
    if (!hasRenderableWeather) return null;
    return (
      seasonalHero?.image ?? getHeroImageSource(displayScenario, sceneIsDaytime)
    );
  }, [seasonalHero, displayScenario, hasRenderableWeather, sceneIsDaytime]);

  const heroImageTextPalette = useMemo(
    () => getWeatherHeroTextPalette(season, sceneIsDaytime),
    [season, sceneIsDaytime],
  );

  const forecastTextPalette = useMemo(() => {
    if (!hasRenderableWeather) {
      return {
        label: '#223042',
        precipitation: 'rgba(34,48,66,0.54)',
        temperature: '#223042',
        lowTemperature: 'rgba(34,48,66,0.52)',
      };
    }

    if (seasonalHero && sceneIsDaytime) {
      return {
        label: palette.textPrimary,
        precipitation: palette.textSecondary,
        temperature: palette.textPrimary,
        lowTemperature: palette.textSecondary,
      };
    }

    if (displayScenario === 'fresh' && sceneIsDaytime) {
      return {
        label: '#18345F',
        precipitation: 'rgba(24,52,95,0.64)',
        temperature: '#102240',
        lowTemperature: 'rgba(16,34,64,0.54)',
      };
    }

    return {
      label: '#F8FBFF',
      precipitation: 'rgba(234,242,255,0.76)',
      temperature: '#FFFFFF',
      lowTemperature: 'rgba(226,236,248,0.74)',
    };
  }, [
    seasonalHero,
    displayScenario,
    hasRenderableWeather,
    palette,
    sceneIsDaytime,
  ]);

  const heroBlendColors = useMemo(() => {
    if (seasonalHero) return seasonalHero.blendColors;
    if (displayScenario === 'fresh' && sceneIsDaytime) {
      return [
        'rgba(247,251,255,0)',
        'rgba(234,245,255,0.36)',
        'rgba(234,245,255,0.92)',
      ];
    }

    if (displayScenario === 'fresh' && !sceneIsDaytime) {
      return ['rgba(4,15,39,0)', 'rgba(13,42,99,0.34)', 'rgba(13,42,99,0.94)'];
    }

    if (displayScenario === 'rain') {
      return sceneIsDaytime
        ? ['rgba(27,61,114,0)', 'rgba(27,61,114,0.34)', 'rgba(23,61,119,0.94)']
        : ['rgba(4,18,38,0)', 'rgba(16,47,92,0.34)', 'rgba(16,47,92,0.94)'];
    }

    if (displayScenario === 'snow') {
      return sceneIsDaytime
        ? [
            'rgba(216,231,255,0)',
            'rgba(125,176,255,0.26)',
            'rgba(125,176,255,0.86)',
          ]
        : ['rgba(7,21,47,0)', 'rgba(22,56,107,0.34)', 'rgba(22,56,107,0.92)'];
    }

    return [
      'rgba(255,255,255,0)',
      'rgba(255,255,255,0.12)',
      'rgba(255,255,255,0.28)',
    ];
  }, [seasonalHero, displayScenario, sceneIsDaytime]);

  const onPressPrimary = useCallback(() => {
    try {
      if (hasLiveWeather && !advice.caution) {
        navigation.navigate('AppTabs', {
          screen: 'TimelineTab',
          params: {
            screen: 'TimelineMain',
            params: { mainCategory: 'walk' },
          },
        });
        return;
      }

      navigation.navigate('IndoorActivityRecommendations', {
        district: displayWeather.district,
        initialBundle: displayWeather,
        initialCoordinates:
          weatherState.coordinates ?? route.params?.initialCoordinates,
      });
    } catch {
      // noop
    }
  }, [
    displayWeather,
    advice.caution,
    hasLiveWeather,
    navigation,
    route.params?.initialCoordinates,
    weatherState.coordinates,
  ]);

  return (
    <LinearGradient colors={palette.background} style={styles.screen}>
      <StatusBar
        barStyle={
          hasRenderableWeather && !sceneIsDaytime
            ? 'light-content'
            : 'dark-content'
        }
      />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 12 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View testID="weather-header-surface" style={styles.headerSurface}>
            <View style={styles.header}>
              <View style={styles.headerSideSlot}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="뒤로 가기"
                  activeOpacity={0.88}
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Feather
                    name="arrow-left"
                    size={20}
                    color={palette.textPrimary}
                  />
                </TouchableOpacity>
              </View>
              <Text
                style={[styles.headerTitle, { color: palette.textPrimary }]}
              >
                오늘의 날씨
              </Text>
              <View
                style={[styles.headerSideSlot, styles.headerSideSlotRight]}
              />
            </View>
          </View>

          <View style={styles.hero}>
            {heroImageSource ? (
              <View style={styles.heroImageWrap}>
                <ImageBackground
                  resizeMode="cover"
                  source={heroImageSource}
                  style={[
                    styles.heroImageCard,
                    seasonalHero && {
                      minHeight: width - insets.left - insets.right,
                    },
                  ]}
                  imageStyle={styles.heroImage}
                >
                  <View
                    testID="weather-hero-information"
                    style={styles.heroImageOverlay}
                  >
                    <View style={styles.heroTopRow}>
                      <View style={styles.locationWrap}>
                        <Feather
                          name="map-pin"
                          size={16}
                          color={heroImageTextPalette.locationIcon}
                        />
                        <Text
                          testID="weather-hero-district"
                          style={[
                            styles.heroImageLocationText,
                            {
                              color: heroImageTextPalette.primary,
                              textShadowColor: heroImageTextPalette.shadowColor,
                            },
                          ]}
                        >
                          {displayDistrict}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.heroMain}>
                      <View style={styles.heroCopy}>
                        <Text
                          testID="weather-hero-temperature"
                          style={[
                            hasPreviewWeather
                              ? styles.heroRecentTemp
                              : styles.heroTemp,
                            styles.heroImageText,
                            {
                              color: heroImageTextPalette.primary,
                              textShadowColor: heroImageTextPalette.shadowColor,
                            },
                          ]}
                        >
                          {hasLiveWeather
                            ? `${displayWeather.currentTemperature}°`
                            : hasPreviewWeather
                            ? `최근 확인 ${displayWeather.currentTemperature}°`
                            : '정보 없음'}
                        </Text>
                        <Text
                          testID="weather-hero-condition"
                          style={[
                            styles.heroStatus,
                            styles.heroImageText,
                            {
                              color: heroImageTextPalette.primary,
                              textShadowColor: heroImageTextPalette.shadowColor,
                            },
                          ]}
                        >
                          {displayWeather.detailStatus}
                        </Text>
                        <Text
                          testID="weather-hero-range"
                          style={[
                            styles.heroRange,
                            styles.heroImageSubText,
                            {
                              color: heroImageTextPalette.secondary,
                              textShadowColor: heroImageTextPalette.shadowColor,
                            },
                          ]}
                        >
                          {hasLiveWeather
                            ? `최고 ${formatWeatherMeasurement(
                                weather,
                                'highTemperature',
                                '°',
                              )} / 최저 ${formatWeatherMeasurement(
                                weather,
                                'lowTemperature',
                                '°',
                              )}`
                            : hasPreviewWeather
                            ? `최근 확인 최고 ${formatWeatherMeasurement(
                                weather,
                                'highTemperature',
                                '°',
                              )} / 최저 ${formatWeatherMeasurement(
                                weather,
                                'lowTemperature',
                                '°',
                              )}`
                            : '최고/최저 기온 확인 중'}
                        </Text>
                        <Text
                          testID="weather-hero-feels-like"
                          style={[
                            styles.heroFeelsLike,
                            styles.heroImageSubText,
                            {
                              color: heroImageTextPalette.secondary,
                              textShadowColor: heroImageTextPalette.shadowColor,
                            },
                          ]}
                        >
                          {hasLiveWeather
                            ? `체감온도 ${formatWeatherMeasurement(
                                weather,
                                'apparentTemperature',
                                '°',
                              )}`
                            : hasPreviewWeather
                            ? `최근 확인 체감온도 ${formatWeatherMeasurement(
                                weather,
                                'apparentTemperature',
                                '°',
                              )}`
                            : '체감온도 확인 중'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <LinearGradient
                    testID="weather-hero-bottom-blend"
                    pointerEvents="none"
                    colors={heroBlendColors}
                    locations={seasonalHero ? [0, 0.55, 1] : undefined}
                    style={[
                      styles.heroImageBottomBlend,
                      seasonalHero && {
                        height: (width - insets.left - insets.right) * 0.18,
                      },
                    ]}
                  />
                </ImageBackground>
              </View>
            ) : (
              <WeatherGlassCard
                frosted
                backgroundColor={palette.cardBackground}
                borderColor={palette.cardBorder}
                style={styles.heroVisualCard}
              >
                <View style={styles.heroTopRow}>
                  <View style={styles.locationWrap}>
                    <Feather
                      name="map-pin"
                      size={16}
                      color={palette.textSecondary}
                    />
                    <Text
                      style={[
                        styles.locationText,
                        { color: palette.textPrimary },
                      ]}
                    >
                      {displayDistrict}
                    </Text>
                  </View>
                </View>

                <View style={styles.heroMain}>
                  <View style={styles.heroCopy}>
                    <Text
                      style={[styles.heroTemp, { color: palette.textPrimary }]}
                    >
                      {hasLiveWeather
                        ? `${displayWeather.currentTemperature}°`
                        : hasPreviewWeather
                        ? `최근 확인 ${displayWeather.currentTemperature}°`
                        : '정보 없음'}
                    </Text>
                    <Text
                      style={[
                        styles.heroStatus,
                        { color: palette.textPrimary },
                      ]}
                    >
                      {displayWeather.detailStatus}
                    </Text>
                    <Text
                      style={[
                        styles.heroRange,
                        { color: palette.textSecondary },
                      ]}
                    >
                      {hasLiveWeather
                        ? `최고 ${formatWeatherMeasurement(
                            weather,
                            'highTemperature',
                            '°',
                          )} / 최저 ${formatWeatherMeasurement(
                            weather,
                            'lowTemperature',
                            '°',
                          )}`
                        : hasPreviewWeather
                        ? `최근 확인 최고 ${formatWeatherMeasurement(
                            weather,
                            'highTemperature',
                            '°',
                          )} / 최저 ${formatWeatherMeasurement(
                            weather,
                            'lowTemperature',
                            '°',
                          )}`
                        : '최고/최저 기온 확인 중'}
                    </Text>
                    <Text
                      style={[
                        styles.heroFeelsLike,
                        { color: palette.textSecondary },
                      ]}
                    >
                      {hasLiveWeather
                        ? `체감온도 ${formatWeatherMeasurement(
                            weather,
                            'apparentTemperature',
                            '°',
                          )}`
                        : hasPreviewWeather
                        ? `최근 확인 체감온도 ${formatWeatherMeasurement(
                            weather,
                            'apparentTemperature',
                            '°',
                          )}`
                        : '체감온도 확인 중'}
                    </Text>
                  </View>
                </View>

                <View style={styles.heroPlaceholder}>
                  <Text
                    style={[
                      styles.heroVisualTitle,
                      { color: palette.textPrimary },
                    ]}
                  >
                    날씨를 불러오지 못했어요
                  </Text>
                  <Text
                    style={[
                      styles.heroVisualBody,
                      { color: palette.textSecondary },
                    ]}
                  >
                    위치 권한과 네트워크 연결을 확인한 뒤 다시 시도해 주세요.
                  </Text>
                </View>
              </WeatherGlassCard>
            )}

            <Text style={[styles.heroHeadline, { color: palette.textPrimary }]}>
              {formatWeatherPetText(advice.headline, selectedPetName)}
            </Text>
            <Text
              style={[styles.heroMoodCopy, { color: palette.textSecondary }]}
            >
              {formatWeatherPetText(advice.caption, selectedPetName)}
            </Text>
            {needsRefresh ? (
              <View style={styles.updateRow}>
                <Text
                  style={[
                    styles.sectionHint,
                    styles.updateText,
                    { color: palette.textSecondary },
                  ]}
                >
                  {hasPreviewWeather
                    ? '최근 확인한 날씨예요'
                    : '최신 날씨를 확인하지 못했어요'}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="날씨 다시 확인"
                  onPress={weatherState.refresh}
                  disabled={weatherState.loading}
                  style={styles.refreshButton}
                >
                  <Text
                    style={[styles.sectionHint, { color: palette.textPrimary }]}
                  >
                    {weatherState.loading ? '확인 중' : '다시 확인'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <WeatherHourlyPrecipitation
            items={getUpcomingWeatherHours(weather)}
            textColor={palette.textPrimary}
            secondaryColor={palette.textSecondary}
          />

          <WeatherGlassCard
            frosted
            backgroundColor={palette.cardBackground}
            borderColor={palette.cardBorder}
          >
            <View style={styles.sectionHeader}>
              <Text
                style={[styles.sectionTitle, { color: palette.textPrimary }]}
              >
                7일 예보
              </Text>
            </View>
            <WeatherForecastStrip
              items={weather.weekly}
              accentColor={palette.accent}
              labelColor={forecastTextPalette.label}
              precipitationColor={forecastTextPalette.precipitation}
              temperatureColor={forecastTextPalette.temperature}
              lowTemperatureColor={forecastTextPalette.lowTemperature}
            />
          </WeatherGlassCard>

          <AirQualityInsightCard
            frosted
            metrics={weather.airQualityMetrics}
            titleColor={palette.textPrimary}
            hintColor={palette.textSecondary}
            metricLabelColor={palette.textPrimary}
            valueColor={palette.textPrimary}
            trackColor={
              hasLiveWeather &&
              displayWeather.scenario === 'fresh' &&
              sceneIsDaytime
                ? 'rgba(99,153,231,0.18)'
                : undefined
            }
            backgroundColor={
              hasLiveWeather &&
              displayWeather.scenario === 'fresh' &&
              sceneIsDaytime
                ? 'rgba(255,255,255,0.78)'
                : palette.cardBackground
            }
            borderColor={
              hasLiveWeather &&
              displayWeather.scenario === 'fresh' &&
              sceneIsDaytime
                ? 'rgba(255,255,255,0.46)'
                : palette.cardBorder
            }
          />

          <View style={styles.metricGrid}>
            {metrics.map(item => (
              <WeatherGlassCard
                frosted
                key={item.key}
                backgroundColor={palette.cardBackground}
                borderColor={palette.cardBorder}
                style={[
                  styles.metricCard,
                  singleColumnMetrics ? styles.metricCardFull : null,
                ]}
              >
                <Text
                  style={[styles.metricLabel, { color: palette.textSecondary }]}
                >
                  {item.title}
                </Text>
                <Text
                  style={[styles.metricValue, { color: palette.textPrimary }]}
                >
                  {item.value}
                </Text>
                <Text
                  style={[styles.metricBody, { color: palette.textSecondary }]}
                >
                  {item.description}
                </Text>
              </WeatherGlassCard>
            ))}
          </View>

          <View style={styles.metricGrid}>
            {atmosphericMetrics.map(item => (
              <WeatherGlassCard
                frosted
                key={item.key}
                backgroundColor={palette.cardBackground}
                borderColor={palette.cardBorder}
                style={[
                  styles.metricCard,
                  singleColumnMetrics ? styles.metricCardFull : null,
                ]}
              >
                <Text
                  style={[styles.metricLabel, { color: palette.textSecondary }]}
                >
                  {item.title}
                </Text>
                <Text
                  style={[styles.metricValue, { color: palette.textPrimary }]}
                >
                  {item.value}
                </Text>
                <Text
                  style={[styles.metricBody, { color: palette.textSecondary }]}
                >
                  {item.description}
                </Text>
              </WeatherGlassCard>
            ))}
          </View>

          <WeatherGlassCard
            frosted
            backgroundColor={palette.cardBackground}
            borderColor={palette.cardBorder}
          >
            <View style={styles.sectionHeader}>
              <Text
                style={[styles.sectionTitle, { color: palette.textPrimary }]}
              >
                일출과 일몰
              </Text>
            </View>

            <View style={styles.sunRow}>
              <View style={styles.sunItem}>
                <Text style={styles.sunEmoji}>🌅</Text>
                <Text
                  style={[styles.sunLabel, { color: palette.textSecondary }]}
                >
                  일출
                </Text>
                <Text style={[styles.sunValue, { color: palette.textPrimary }]}>
                  {weather.sunriseTime ?? '정보 없음'}
                </Text>
              </View>
              <View
                style={[
                  styles.sunDivider,
                  { backgroundColor: 'rgba(255,255,255,0.12)' },
                ]}
              />
              <View style={styles.sunItem}>
                <Text style={styles.sunEmoji}>🌇</Text>
                <Text
                  style={[styles.sunLabel, { color: palette.textSecondary }]}
                >
                  일몰
                </Text>
                <Text style={[styles.sunValue, { color: palette.textPrimary }]}>
                  {weather.sunsetTime ?? '정보 없음'}
                </Text>
              </View>
            </View>
          </WeatherGlassCard>

          <WeatherGlassCard
            frosted
            backgroundColor={palette.cardBackground}
            borderColor={palette.cardBorder}
          >
            <View style={styles.sectionHeader}>
              <Text
                style={[styles.sectionTitle, { color: palette.textPrimary }]}
              >
                반려동물 외출 안내
              </Text>
            </View>
            <Text style={[styles.careTitle, { color: palette.textPrimary }]}>
              {advice.label}
            </Text>
            <Text style={[styles.careBody, { color: palette.textSecondary }]}>
              {formatWeatherPetText(advice.detail, selectedPetName)}
            </Text>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.primaryButton,
                { backgroundColor: palette.accent },
              ]}
              onPress={onPressPrimary}
            >
              <Text style={styles.primaryButtonText}>
                {advice.caution ? '실내 활동 살펴보기' : '산책 기록 보기'}
              </Text>
            </TouchableOpacity>
          </WeatherGlassCard>

          {hasRenderableWeather ? (
            <Text
              style={[styles.attributionText, { color: palette.textSecondary }]}
            >
              {`날씨·대기질 예측: ${attributionLabel} · 실제 날씨와 차이가 있을 수 있어요.`}
            </Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    gap: 12,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerSurface: {
    gap: 8,
  },
  headerSideSlot: {
    width: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSideSlotRight: {
    alignItems: 'flex-end',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  hero: {
    gap: 10,
    paddingTop: 0,
  },
  heroImageWrap: {
    marginHorizontal: -18,
  },
  heroImageCard: {
    minHeight: 372,
    overflow: 'hidden',
  },
  heroImage: {},
  heroImageOverlay: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    justifyContent: 'flex-start',
    gap: 6,
  },
  heroImageBottomBlend: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 132,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  locationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  locationText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  heroImageLocationText: {
    fontSize: 14,
    lineHeight: 18,
    flexShrink: 1,
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroMain: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    gap: 2,
  },
  heroTemp: {
    fontSize: 53,
    lineHeight: 57,
    fontWeight: '800',
  },
  heroRecentTemp: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '800',
  },
  heroStatus: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  heroRange: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  heroFeelsLike: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
  },
  heroEmoji: {
    fontSize: 54,
    lineHeight: 58,
  },
  heroImageText: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.56)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroImageSubText: {
    color: 'rgba(255,255,255,0.88)',
    textShadowColor: 'rgba(0,0,0,0.48)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroVisualCard: {
    borderRadius: 28,
  },
  heroPlaceholder: {
    marginTop: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  heroVisualLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  heroVisualTitle: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  heroVisualBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  heroHeadline: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  heroMoodCopy: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  heroError: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  previewChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  previewChipActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderColor: 'rgba(255,255,255,0.28)',
  },
  previewChipText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#EAF2FF',
    fontWeight: '600',
  },
  previewChipTextActive: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  updateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  updateText: { flex: 1 },
  refreshButton: {
    minHeight: 44,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 12,
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    minHeight: 136,
  },
  metricCardFull: {
    width: '100%',
    minHeight: 0,
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  metricValue: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  metricBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  sunRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  sunItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  sunDivider: {
    width: 1,
    marginHorizontal: 12,
  },
  sunEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  sunLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  sunValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  careTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  careBody: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  primaryButton: {
    marginTop: 18,
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#102240',
    fontWeight: '700',
  },
  attributionText: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
});
