import React, { useCallback, useMemo } from 'react';
import {
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import Feather from 'react-native-vector-icons/Feather';

import AirQualityInsightCard from '../../components/weather/AirQualityInsightCard';
import WeatherForecastStrip from '../../components/weather/WeatherForecastStrip';
import WeatherGlassCard from '../../components/weather/WeatherGlassCard';
import { useWeatherGuide } from '../../hooks/useWeatherGuide';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  getWeatherEmoji,
  type WeatherGuideBundle,
  type WeatherScenario,
} from '../../services/weather/guide';

type Nav = NativeStackNavigationProp<RootStackParamList, 'WeatherInsight'>;

type WeatherInsightRoute = {
  key: string;
  name: 'WeatherInsight';
  params?: {
    district?: string;
    initialBundle?: WeatherGuideBundle;
  };
};

type ScenePalette = {
  background: [string, string, string];
  cardBackground: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentSoft: string;
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

function getHeroImageSlotLabel(weather: WeatherGuideBundle) {
  const phase = weather.isDaytime ? '낮' : '밤';

  switch (weather.scenario) {
    case 'rain':
      return `비 ${phase} 이미지 영역`;
    case 'snow':
      return `눈 ${phase} 이미지 영역`;
    case 'dusty':
      return `흐림 ${phase} 이미지 영역`;
    case 'fresh':
    default:
      return `맑음 ${phase} 이미지 영역`;
  }
}

function getUvLabel(uvIndex: number) {
  if (uvIndex >= 8) return '매우 높음';
  if (uvIndex >= 6) return '높음';
  if (uvIndex >= 3) return '보통';
  return '낮음';
}

function getHumidityMessage(humidity: number) {
  if (humidity >= 75)
    return '습도가 높은 편이라 털 말리기를 더 꼼꼼히 해 주세요';
  if (humidity >= 55) return '습도는 무난한 편이에요';
  return '공기가 건조해 수분 보충을 챙겨 주세요';
}

function getWindMessage(windSpeed: number) {
  if (windSpeed >= 8) return '바람이 강한 편이라 산책 시간은 짧게 가져가요';
  if (windSpeed >= 4) return '바람이 제법 느껴지는 날이에요';
  return '바람이 잔잔해서 활동하기 편안해요';
}

function getCloudLabel(cloudCover: number) {
  if (cloudCover >= 80) return '흐림';
  if (cloudCover >= 45) return '구름 많음';
  if (cloudCover >= 20) return '구름 조금';
  return '맑음';
}

function getPressureMessage(weather: WeatherGuideBundle) {
  if (weather.scenario === 'rain') {
    return '기압이 낮아져 컨디션이 예민할 수 있어요';
  }

  if (weather.scenario === 'snow') {
    return '찬 공기가 길게 머물 수 있어요';
  }

  return '기압은 비교적 안정적인 편이에요';
}

function getVisibilityMessage(weather: WeatherGuideBundle) {
  if (weather.airQualityConcern) {
    return '미세먼지 때문에 시야가 다소 탁해질 수 있어요';
  }

  if (weather.scenario === 'rain') {
    return '빗방울 때문에 시야가 짧아질 수 있어요';
  }

  return '시야가 맑아 활동 계획을 세우기 좋아요';
}

function getBackgroundMoodCopy(weather: WeatherGuideBundle) {
  if (weather.airQualityConcern && weather.scenario === 'fresh') {
    return '하늘은 맑아도 공기 질을 먼저 확인해 주세요.';
  }

  if (weather.scenario === 'rain') {
    return '차분한 실내 시간이 더 어울리는 저녁이에요.';
  }

  if (weather.scenario === 'snow') {
    return '체온과 발바닥 컨디션을 먼저 살펴봐 주세요.';
  }

  if (weather.scenario === 'dusty') {
    return '호흡이 편안한 환경을 먼저 챙겨 주세요.';
  }

  return weather.isDaytime
    ? '맑은 하늘 아래 산책 계획을 세우기 좋은 시간이에요.'
    : '고요한 밤 공기와 함께 하루를 정리해 보세요.';
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
  const route = useRoute<WeatherInsightRoute>();

  const weatherState = useWeatherGuide(
    route.params?.district ?? '현재 위치',
    route.params?.initialBundle,
  );
  const weather = weatherState.bundle;
  const hasLiveWeather = weather.dataSource === 'live';
  const hasPreviewWeather = weather.dataSource === 'preview';
  const hasRenderableWeather = weather.dataSource !== 'unavailable';
  const displayScenario = weather.scenario;
  const sceneIsDaytime = weather.isDaytime;
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
        ? getScenePalette(displayScenario, sceneIsDaytime)
        : UNAVAILABLE_PALETTE,
    [displayScenario, hasRenderableWeather, sceneIsDaytime],
  );
  const dataStatusLabel = hasLiveWeather
    ? '실시간 기준'
    : hasPreviewWeather
      ? '최근 확인 기준'
      : '연결 필요';

  const routeDistrict = route.params?.district?.trim() || null;
  const displayDistrict =
    weather.district === '현재 위치' &&
    routeDistrict &&
    routeDistrict !== '현재 위치'
      ? routeDistrict
      : weather.district;

  const metrics = useMemo(() => {
    if (!hasLiveWeather) {
      return [
        {
          key: 'feels-like',
          title: '체감 온도',
          value: hasPreviewWeather
            ? `${weather.apparentTemperature}°`
            : '정보 없음',
          description: hasPreviewWeather
            ? '최근 확인한 체감 온도예요. 실시간 응답이 도착하면 갱신됩니다'
            : '실제 위치 기반 응답이 도착하면 표시됩니다',
        },
        {
          key: 'humidity',
          title: '습도',
          value: hasPreviewWeather ? `${weather.humidity}%` : '정보 없음',
          description: hasPreviewWeather
            ? '최근 확인한 습도예요. 연결되면 실시간 정보로 바뀝니다'
            : '습도 정보도 함께 갱신됩니다',
        },
        {
          key: 'wind',
          title: '바람',
          value: hasPreviewWeather ? `${weather.windSpeed}m/s` : '정보 없음',
          description: hasPreviewWeather
            ? '최근 확인한 바람 정보예요. 현재 응답을 다시 기다리는 중입니다'
            : '바람 세기는 실시간 응답을 기다리고 있어요',
        },
        {
          key: 'uv',
          title: '자외선',
          value: hasPreviewWeather ? getUvLabel(weather.uvIndex) : '정보 없음',
          description: hasPreviewWeather
            ? `최근 확인 지수 ${weather.uvIndex} · 연결 후 다시 갱신됩니다`
            : '연결이 되면 자외선 지수도 같이 보여줘요',
        },
      ];
    }

    return [
      {
        key: 'feels-like',
        title: '체감 온도',
        value: `${weather.apparentTemperature}°`,
        description:
          weather.apparentTemperature < weather.currentTemperature
            ? '실제보다 조금 더 차갑게 느껴져요'
            : '실제보다 살짝 포근하게 느껴져요',
      },
      {
        key: 'humidity',
        title: '습도',
        value: `${weather.humidity}%`,
        description: getHumidityMessage(weather.humidity),
      },
      {
        key: 'wind',
        title: '바람',
        value: `${weather.windSpeed}m/s`,
        description: getWindMessage(weather.windSpeed),
      },
      {
        key: 'uv',
        title: '자외선',
        value: getUvLabel(weather.uvIndex),
        description: `지수 ${weather.uvIndex} · ${
          sceneIsDaytime
            ? '산책 시간대를 조절해 주세요'
            : '야간에는 영향이 적어요'
        }`,
      },
    ];
  }, [
    hasLiveWeather,
    hasPreviewWeather,
    weather.apparentTemperature,
    weather.currentTemperature,
    weather.humidity,
    sceneIsDaytime,
    weather.uvIndex,
    weather.windSpeed,
  ]);

  const atmosphericMetrics = useMemo(() => {
    if (!hasLiveWeather) {
      return [
        {
          key: 'cloud',
          title: '하늘 상태',
          value: hasPreviewWeather ? getCloudLabel(weather.cloudCover) : '정보 없음',
          description: hasPreviewWeather
            ? `최근 확인한 구름량 ${weather.cloudCover}% 기준이에요`
            : '구름량 데이터를 아직 받지 못했어요',
        },
        {
          key: 'visibility',
          title: '시야 가이드',
          value: hasPreviewWeather ? '최근 기준' : '확인 필요',
          description: hasPreviewWeather
            ? getVisibilityMessage(displayWeather)
            : '대기 질 연결 후 실제 가이드가 표시됩니다',
        },
        {
          key: 'pressure',
          title: '컨디션 힌트',
          value: hasPreviewWeather ? '최근 기준' : '확인 필요',
          description: hasPreviewWeather
            ? getPressureMessage(displayWeather)
            : '실시간 날씨 응답 전에는 판단을 보류해 주세요',
        },
        {
          key: 'day-phase',
          title: '현재 시간대',
          value: hasPreviewWeather ? (sceneIsDaytime ? '낮' : '밤') : '확인 필요',
          description: hasPreviewWeather
            ? `최근 확인 기준 · ${weather.detailStatus}`
            : weather.detailStatus,
        },
      ];
    }

    return [
      {
        key: 'cloud',
        title: '하늘 상태',
        value: getCloudLabel(weather.cloudCover),
        description: `${weather.cloudCover}% 구름량`,
      },
      {
        key: 'visibility',
        title: '시야 가이드',
        value: displayWeather.airQualityConcern ? '주의' : '좋음',
        description: getVisibilityMessage(displayWeather),
      },
      {
        key: 'pressure',
        title: '컨디션 힌트',
        value: displayWeather.scenario === 'fresh' ? '안정적' : '체크 필요',
        description: getPressureMessage(displayWeather),
      },
      {
        key: 'day-phase',
        title: '현재 시간대',
        value: sceneIsDaytime ? '낮' : '밤',
        description: `${getWeatherEmoji(displayWeather.weatherIcon)} ${
          weather.detailStatus
        }`,
      },
    ];
  }, [
    displayWeather,
    hasLiveWeather,
    hasPreviewWeather,
    sceneIsDaytime,
    weather.cloudCover,
    weather.detailStatus,
  ]);

  const heroImageSource = useMemo(() => {
    if (!hasRenderableWeather) return null;
    return getHeroImageSource(displayScenario, sceneIsDaytime);
  }, [displayScenario, hasRenderableWeather, sceneIsDaytime]);

  const heroImageTextPalette = useMemo(() => {
    return {
      primary: '#FFFFFF',
      secondary: 'rgba(255,255,255,0.88)',
      shadowColor: 'rgba(0,0,0,0.48)',
    };
  }, []);

  const forecastTextPalette = useMemo(() => {
    if (!hasLiveWeather) {
      return {
        label: '#223042',
        precipitation: 'rgba(34,48,66,0.54)',
        temperature: '#223042',
        lowTemperature: 'rgba(34,48,66,0.52)',
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
  }, [displayScenario, hasLiveWeather, sceneIsDaytime]);

  const heroBlendColors = useMemo(() => {
    if (displayScenario === 'fresh' && sceneIsDaytime) {
      return [
        'rgba(247,251,255,0)',
        'rgba(234,245,255,0.36)',
        'rgba(234,245,255,0.92)',
      ];
    }

    if (displayScenario === 'fresh' && !sceneIsDaytime) {
      return [
        'rgba(4,15,39,0)',
        'rgba(13,42,99,0.34)',
        'rgba(13,42,99,0.94)',
      ];
    }

    if (displayScenario === 'rain') {
      return sceneIsDaytime
        ? [
            'rgba(27,61,114,0)',
            'rgba(27,61,114,0.34)',
            'rgba(23,61,119,0.94)',
          ]
        : [
            'rgba(4,18,38,0)',
            'rgba(16,47,92,0.34)',
            'rgba(16,47,92,0.94)',
          ];
    }

    if (displayScenario === 'snow') {
      return sceneIsDaytime
        ? [
            'rgba(216,231,255,0)',
            'rgba(125,176,255,0.26)',
            'rgba(125,176,255,0.86)',
          ]
        : [
            'rgba(7,21,47,0)',
            'rgba(22,56,107,0.34)',
            'rgba(22,56,107,0.92)',
          ];
    }

    return [
      'rgba(255,255,255,0)',
      'rgba(255,255,255,0.12)',
      'rgba(255,255,255,0.28)',
    ];
  }, [displayScenario, sceneIsDaytime]);

  const onPressPrimary = useCallback(() => {
    try {
      if (
        hasLiveWeather &&
        displayWeather.scenario === 'fresh' &&
        !displayWeather.airQualityConcern
      ) {
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
      });
    } catch {
      // noop
    }
  }, [
    displayWeather,
    hasLiveWeather,
    navigation,
  ]);

  return (
    <LinearGradient colors={palette.background} style={styles.screen}>
      <StatusBar
        barStyle={
          hasRenderableWeather && !sceneIsDaytime ? 'light-content' : 'dark-content'
        }
        backgroundColor="transparent"
        translucent
      />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom + 32, 52) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Feather
                name="chevron-left"
                size={22}
                color={palette.textPrimary}
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>
              오늘의 날씨
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.hero}>
            {heroImageSource ? (
              <View style={styles.heroImageWrap}>
                <ImageBackground
                  resizeMode="cover"
                  source={heroImageSource}
                  style={styles.heroImageCard}
                  imageStyle={styles.heroImage}
                >
                  <View style={styles.heroImageOverlay}>
                    <View style={styles.heroTopRow}>
                      <View style={styles.locationWrap}>
                        <Feather
                          name="map-pin"
                          size={16}
                          color={heroImageTextPalette.primary}
                        />
                        <Text
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
                          style={[
                            styles.heroTemp,
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
                            ? `최고 ${displayWeather.highTemperature}° / 최저 ${displayWeather.lowTemperature}°`
                            : hasPreviewWeather
                              ? `최근 확인 최고 ${displayWeather.highTemperature}° / 최저 ${displayWeather.lowTemperature}°`
                              : '최고/최저 기온 확인 중'}
                        </Text>
                        <Text
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
                            ? `체감온도 ${displayWeather.apparentTemperature}°`
                            : hasPreviewWeather
                              ? `최근 확인 체감온도 ${displayWeather.apparentTemperature}°`
                              : '체감온도 확인 중'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <LinearGradient
                    colors={heroBlendColors}
                    style={styles.heroImageBottomBlend}
                  />
                </ImageBackground>
              </View>
            ) : (
              <WeatherGlassCard
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
                        ? `최고 ${displayWeather.highTemperature}° / 최저 ${displayWeather.lowTemperature}°`
                        : hasPreviewWeather
                          ? `최근 확인 최고 ${displayWeather.highTemperature}° / 최저 ${displayWeather.lowTemperature}°`
                          : '최고/최저 기온 확인 중'}
                    </Text>
                    <Text
                      style={[
                        styles.heroFeelsLike,
                        { color: palette.textSecondary },
                      ]}
                    >
                      {hasLiveWeather
                        ? `체감온도 ${displayWeather.apparentTemperature}°`
                        : hasPreviewWeather
                          ? `최근 확인 체감온도 ${displayWeather.apparentTemperature}°`
                          : '체감온도 확인 중'}
                    </Text>
                  </View>
                </View>

                <View style={styles.heroPlaceholder}>
                  <Text
                    style={[
                      styles.heroVisualLabel,
                      { color: palette.textSecondary },
                    ]}
                  >
                    상단 이미지 슬롯
                  </Text>
                  <Text
                    style={[
                      styles.heroVisualTitle,
                      { color: palette.textPrimary },
                    ]}
                    >
                    {hasLiveWeather
                      ? getHeroImageSlotLabel(displayWeather)
                      : '실제 날씨 연결이 필요해요'}
                  </Text>
                  <Text
                    style={[
                      styles.heroVisualBody,
                      { color: palette.textSecondary },
                    ]}
                    >
                    {hasLiveWeather
                      ? '비/눈과 낮/밤 조합 이미지를 나중에 연결하면 이 영역이 배경 비주얼로 교체됩니다.'
                      : '위치 권한과 네트워크 연결이 확인되면 실제 날씨 기반 화면으로 자동 전환됩니다.'}
                  </Text>
                </View>
              </WeatherGlassCard>
            )}

            <Text style={[styles.heroHeadline, { color: palette.textPrimary }]}>
              {displayWeather.detailHeadline}
            </Text>
            <Text
              style={[styles.heroMoodCopy, { color: palette.textSecondary }]}
            >
              {hasLiveWeather
                ? getBackgroundMoodCopy(displayWeather)
                : '현재는 실시간 날씨 연결 전 상태라 활동 전 다시 확인해 주세요.'}
            </Text>
            {weatherState.error ? (
              <Text
                style={[styles.heroError, { color: palette.textSecondary }]}
              >
                {weatherState.error}
              </Text>
            ) : null}
          </View>

          <WeatherGlassCard
            backgroundColor={palette.cardBackground}
            borderColor={palette.cardBorder}
          >
            <View style={styles.sectionHeader}>
              <Text
                style={[styles.sectionTitle, { color: palette.textPrimary }]}
              >
                주간 예보
              </Text>
              <Text
                style={[styles.sectionHint, { color: palette.textSecondary }]}
              >
                {hasPreviewWeather ? '최근 확인 기준 7일' : '오늘부터 7일'}
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
            metrics={weather.airQualityMetrics}
            headerHint={dataStatusLabel}
            titleColor={
              hasLiveWeather &&
              displayWeather.scenario === 'fresh' &&
              sceneIsDaytime
                ? '#102240'
                : undefined
            }
            hintColor={
              hasLiveWeather &&
              displayWeather.scenario === 'fresh' &&
              sceneIsDaytime
                ? 'rgba(16,34,64,0.56)'
                : undefined
            }
            metricLabelColor={
              hasLiveWeather &&
              displayWeather.scenario === 'fresh' &&
              sceneIsDaytime
                ? '#17345F'
                : undefined
            }
            valueColor={
              hasLiveWeather &&
              displayWeather.scenario === 'fresh' &&
              sceneIsDaytime
                ? '#17345F'
                : undefined
            }
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
                key={item.key}
                backgroundColor={palette.cardBackground}
                borderColor={palette.cardBorder}
                style={styles.metricCard}
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
                key={item.key}
                backgroundColor={palette.cardBackground}
                borderColor={palette.cardBorder}
                style={styles.metricCard}
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
            backgroundColor={palette.cardBackground}
            borderColor={palette.cardBorder}
          >
            <View style={styles.sectionHeader}>
              <Text
                style={[styles.sectionTitle, { color: palette.textPrimary }]}
              >
                일출과 일몰
              </Text>
              <Text
                style={[styles.sectionHint, { color: palette.textSecondary }]}
              >
                하루 리듬
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
            backgroundColor={palette.cardBackground}
            borderColor={palette.cardBorder}
          >
            <View style={styles.sectionHeader}>
              <Text
                style={[styles.sectionTitle, { color: palette.textPrimary }]}
              >
                반려견 케어 가이드
              </Text>
              <Text
                style={[styles.sectionHint, { color: palette.textSecondary }]}
              >
                오늘 컨디션에 맞춘 제안
              </Text>
            </View>
            <Text style={[styles.careTitle, { color: palette.textPrimary }]}>
              {weather.activityCardTitle}
            </Text>
            <Text style={[styles.careBody, { color: palette.textSecondary }]}>
              {weather.activityCardBody}
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
                {weather.activityButtonLabel}
              </Text>
            </TouchableOpacity>
          </WeatherGlassCard>
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
    gap: 18,
  },
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 36,
  },
  hero: {
    gap: 14,
    paddingTop: 4,
  },
  heroImageWrap: {
    marginHorizontal: -18,
  },
  heroImageCard: {
    minHeight: 372,
    // borderRadius: 30,
    overflow: 'hidden',
  },
  heroImage: {
    // borderRadius: 30,
  },
  heroImageOverlay: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 22,
    justifyContent: 'flex-start',
    gap: 14,
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
  },
  locationText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  heroImageLocationText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 14,
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
    fontSize: 76,
    lineHeight: 82,
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
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },
  heroImageSubText: {
    color: 'rgba(255,255,255,0.88)',
    textShadowColor: 'rgba(0,0,0,0.48)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
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
    marginBottom: 16,
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
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  metricCard: {
    width: '47.8%',
    minHeight: 154,
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  metricValue: {
    marginTop: 14,
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
    height: 52,
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
});
