import type { WeatherGuideBundle, WeatherMeasurement } from './guide';
import { formatPetCopy } from '../../utils/petDisplayName';
import { formatWeatherHourRange, getUpcomingWeatherHours } from './reliability';

export function readWeatherMeasurement(
  weather: WeatherGuideBundle,
  key: WeatherMeasurement,
): number | null {
  if (
    weather.dataSource === 'unavailable' ||
    weather.missingMeasurements?.includes(key)
  )
    return null;
  const value = weather[key];
  return Number.isFinite(value) ? value : null;
}

export function formatWeatherMeasurement(
  weather: WeatherGuideBundle,
  key: WeatherMeasurement,
  unit: string,
) {
  const value = readWeatherMeasurement(weather, key);
  return value === null ? '확인 중' : `${value}${unit}`;
}

export function getUvLabel(value: number | null) {
  if (value === null || !Number.isFinite(value) || value < 0) return '확인 중';
  if (value >= 11) return '위험';
  if (value >= 8) return '매우 높음';
  if (value >= 6) return '높음';
  if (value >= 3) return '보통';
  return '낮음';
}

type WeatherAdvice = {
  headline: string;
  caption: string;
  label: string;
  message: string;
  detail: string;
  caution: boolean;
};

/** Guidance is not a warning bulletin or a species-specific exercise prescription. */
export function getWeatherAdvice(weather: WeatherGuideBundle, petName?: string | null): WeatherAdvice {
  if (weather.dataSource !== 'live') {
    return {
      headline:
        weather.dataSource === 'preview'
          ? '최근 날씨를 보여드려요'
          : '날씨를 확인해 주세요',
      caption: '외출 전 최신 날씨를 확인해 주세요.',
      label:
        weather.dataSource === 'preview' ? '최근 확인 정보' : '날씨 확인 필요',
      message: '현재 날씨와 차이가 있을 수 있어요.',
      detail: '위치 권한과 네트워크 연결을 확인한 뒤 다시 불러와 주세요.',
      caution: true,
    };
  }
  const temperature = weather.temperatureSafety;
  const precipitation = weather.precipitationSafety;
  const wind = readWeatherMeasurement(weather, 'windSpeed');
  const uv = readWeatherMeasurement(weather, 'uvIndex');
  const caution = (
    label: string,
    message: string,
    detail: string,
  ): WeatherAdvice => ({
    headline: label,
    caption: message,
    label,
    message,
    detail,
    caution: true,
  });
  if (precipitation?.kind === 'storm')
    return caution(
      '천둥·번개 예측이 있어요',
      '외출을 미루고 실내에 머물러 주세요.',
      '지역 예측 정보예요. 실제 상황과 기상특보를 확인해 주세요.',
    );
  if (
    temperature &&
    (temperature.tone === 'hot' || temperature.tone === 'cold')
  ) {
    return caution(
      temperature.tone === 'hot' ? '더위에 주의하세요' : '추위에 주의하세요',
      temperature.tone === 'hot'
        ? '한낮 외출을 피하고 시원한 곳에서 쉬어 주세요.'
        : '외출을 줄이고 실내 온도를 살펴주세요.',
      '반려동물의 종류와 건강 상태에 따라 적정 온도가 달라요. 아이의 상태를 먼저 살펴주세요.',
    );
  }
  if (wind !== null && wind >= 8)
    return caution(
      '강한 바람이 예상돼요',
      '노출된 장소를 피하고 외출을 줄여 주세요.',
      '돌풍과 주변 시설물을 살피고 기상특보를 확인해 주세요.',
    );
  if (precipitation)
    return caution(
      precipitation.kind === 'snow'
        ? '눈 예측을 확인해 주세요'
        : '비 예측을 확인해 주세요',
      '미끄러운 길을 피하고 외출 계획을 조절해 주세요.',
      precipitation.kind === 'snow'
        ? '눈에 대한 예측이며 실제 강수는 달라질 수 있어요. 노면과 결빙 상태를 확인해 주세요.'
        : '비에 대한 예측이며 실제 강수는 달라질 수 있어요. 외출 시간대의 확률과 노면을 확인해 주세요.',
    );
  if (weather.airQualityConcern || weather.scenario === 'dusty')
    return caution(
      '대기질을 확인해 주세요',
      '장시간 야외 활동을 줄여 주세요.',
      '미세먼지와 초미세먼지 수치를 함께 확인하고, 호흡이 불편하면 실내에서 쉬어 주세요.',
    );
  if (temperature?.tone === 'caution')
    return caution(
      temperature.label,
      '외출 시간을 조절하고 아이의 상태를 살펴주세요.',
      '반려동물의 종류와 건강 상태에 맞춰 온도와 외출 계획을 살펴주세요.',
    );
  if (uv !== null && uv >= 6 && weather.isDaytime)
    return caution(
      '강한 햇볕에 대비하세요',
      '한낮을 피해 그늘에서 쉬어 주세요.',
      '오늘 최대 자외선 지수 기준입니다. 외출 시간대의 햇볕도 확인해 주세요.',
    );
  const upcoming = getUpcomingWeatherHours(weather).slice(0, 3);
  const peak = upcoming.find(
    item => item.precipitationChance !== null && item.precipitationChance >= 60,
  );
  if (peak)
    return caution(
      '강수 가능성을 확인해 주세요',
      `${formatWeatherHourRange(peak)} 강수 확률 ${peak.precipitationChance}%`,
      '비나 눈이 내릴 가능성에 대한 예측이에요. 실제 강수 여부와 시각은 달라질 수 있어요.',
    );
  if (wind !== null && wind >= 4)
    return caution(
      '바람이 다소 불어요',
      '외출 시간과 장소를 조절해 주세요.',
      '바람을 피할 수 있는 길을 고르고 주변 상황을 살펴주세요.',
    );
  return {
    headline: '외출 전 날씨를 살펴보세요',
    caption: '기온과 대기질을 함께 살펴주세요.',
    label: '외출 전 체크',
    message: formatPetCopy('우리 아이의 컨디션에 맞춰 외출을 준비해 주세요.', petName),
    detail:
      '날씨가 무난해도 모든 반려동물에게 야외 활동이 적합한 것은 아니에요.',
    caution: false,
  };
}

export function getWeatherUpdatedLabel(weather: WeatherGuideBundle) {
  const parsed = weather.fetchedAt ? new Date(weather.fetchedAt) : null;
  if (!parsed || Number.isNaN(parsed.getTime()))
    return weather.dataSource === 'preview'
      ? '최근 확인 정보'
      : '확인 시각 없음';
  const time = new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  }).format(parsed);
  return `${time} 조회 · 한국시간`;
}

export function getWeatherValidTimeLabel(value: string | undefined) {
  if (!value) return '예보 기준 시각 확인 중';
  const parsed = new Date(
    /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}+09:00`,
  );
  if (!Number.isFinite(parsed.getTime())) return '예보 기준 시각 확인 중';
  return `${new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  }).format(parsed)} 기준 · 한국시간`;
}
