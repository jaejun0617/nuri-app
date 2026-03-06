// 파일: src/services/weather/guide.ts
// 역할:
// - 날씨 API 연결 전 단계에서 사용할 홈/상세/실내놀이 추천 mock 모델 제공
// - 위치명에 따라 날씨 시나리오를 결정하고, 화면 전반에서 같은 구조를 재사용

export type WeatherScenario = 'rain' | 'dusty' | 'fresh';
export type WeatherIconKey =
  | 'weather-pouring'
  | 'weather-cloudy'
  | 'weather-sunny'
  | 'weather-partly-cloudy'
  | 'weather-night-partly-cloudy'
  | 'weather-windy';

export type AirQualityTone = 'bad' | 'moderate' | 'good';
export type IndoorActivityKey = 'nosework' | 'tug' | 'training' | 'massage';

export type WeeklyWeatherItem = {
  key: string;
  label: string;
  icon: WeatherIconKey;
  temperature: number;
  lowTemperature: number;
};

export type AirQualityMetric = {
  key: 'pm10' | 'pm25' | 'ozone';
  label: string;
  valueLabel: string;
  tone: AirQualityTone;
  progress: number;
};

export type IndoorActivityGuide = {
  key: IndoorActivityKey;
  badge: string;
  accentLabel: string;
  title: string;
  subtitle: string;
  shortTip: string;
  heroEmoji: string;
  heroBackground: [string, string];
  heroIcon: string;
  steps: Array<{
    key: string;
    title: string;
    description: string;
    icon: string;
  }>;
  recordDraft: {
    title: string;
    notePrompt: string;
    completionTitle: string;
    completionBody: string;
    suggestedTags: string[];
    emotionOptions: Array<{
      key: 'excited' | 'happy' | 'calm';
      emoji: string;
      label: string;
    }>;
  };
};

export type WeatherGuideBundle = {
  district: string;
  scenario: WeatherScenario;
  weatherIcon: WeatherIconKey;
  currentTemperature: number;
  highTemperature: number;
  lowTemperature: number;
  homeMessage: string;
  homeCaption: string;
  detailStatus: string;
  detailHeadline: string;
  detailBadge: string;
  weekly: WeeklyWeatherItem[];
  airQualityMetrics: AirQualityMetric[];
  activityCardTitle: string;
  activityCardBody: string;
  activityButtonLabel: string;
  background: {
    top: string;
    bottom: string;
    card: string;
    cardBorder: string;
  };
  recommendedGuideKeys: IndoorActivityKey[];
};

const WEATHER_SCENARIOS: Record<
  WeatherScenario,
  Omit<
    WeatherGuideBundle,
    | 'district'
    | 'scenario'
    | 'weekly'
    | 'airQualityMetrics'
    | 'recommendedGuideKeys'
  >
> = {
  rain: {
    weatherIcon: 'weather-pouring',
    currentTemperature: 18,
    highTemperature: 21,
    lowTemperature: 15,
    homeMessage: '산책하기 딱 좋은 날씨는 아니에요',
    homeCaption: '오늘은 누리와 집 안에서 더 깊은 시간을 보내요',
    detailStatus: '비가 오고 있어요',
    detailHeadline: '산책보다 실내 놀이가 더 잘 어울리는 날이에요',
    detailBadge: 'RAINY DAY',
    activityCardTitle: '반려견 케어 가이드',
    activityCardBody:
      '비가 오는 날엔 실내 에너지를 부드럽게 풀어주는 놀이가 좋아요. 오늘은 노즈워크와 터그 놀이를 추천해요.',
    activityButtonLabel: '실내 놀이 더보기',
    background: {
      top: '#F7F8FC',
      bottom: '#F1F3F8',
      card: '#FFFFFF',
      cardBorder: 'rgba(110,117,140,0.10)',
    },
  },
  dusty: {
    weatherIcon: 'weather-cloudy',
    currentTemperature: 18,
    highTemperature: 21,
    lowTemperature: 15,
    homeMessage: '미세먼지가 높아 실내 활동이 좋아 보여요',
    homeCaption: '짧은 산책보다 아이와 집에서 차분히 놀아보는 하루를 추천해요',
    detailStatus: '미세먼지 나쁨',
    detailHeadline: '오늘은 공기보다 아이의 호흡을 먼저 생각해 주세요',
    detailBadge: 'WARNING',
    activityCardTitle: '반려견 케어 가이드',
    activityCardBody:
      '미세먼지가 높은 날엔 산책 시간을 줄이고, 실내에서 노즈워크나 터그 놀이로 에너지를 풀어주는 편이 더 좋아요.',
    activityButtonLabel: '실내 놀이 더보기',
    background: {
      top: '#F6F1E7',
      bottom: '#F1ECE1',
      card: '#FFFFFF',
      cardBorder: 'rgba(139,118,91,0.10)',
    },
  },
  fresh: {
    weatherIcon: 'weather-sunny',
    currentTemperature: 22,
    highTemperature: 24,
    lowTemperature: 17,
    homeMessage: '산책하기 딱 좋은 날씨예요',
    homeCaption: '오늘은 아이와 바깥 공기를 천천히 즐겨보세요',
    detailStatus: '미세먼지 좋음',
    detailHeadline: '공기가 아주 깨끗해요! 신나게 야외 활동을 즐겨보세요',
    detailBadge: 'FRESH',
    activityCardTitle: '반려견 케어 가이드',
    activityCardBody:
      '공기가 아주 맑아요! 오늘은 무리한 훈련보다 산책과 가벼운 놀이로 컨디션을 기분 좋게 채워주세요.',
    activityButtonLabel: '산책 기록 보러가기',
    background: {
      top: '#EAF5FF',
      bottom: '#F4FAFF',
      card: '#FFFFFF',
      cardBorder: 'rgba(85,160,220,0.10)',
    },
  },
};

const SCENARIO_WEEKLY: Record<WeatherScenario, WeeklyWeatherItem[]> = {
  rain: [
    { key: 'today', label: '오늘', icon: 'weather-pouring', temperature: 18, lowTemperature: 15 },
    { key: 'tomorrow', label: '내일', icon: 'weather-cloudy', temperature: 20, lowTemperature: 16 },
    { key: 'wed', label: '수', icon: 'weather-sunny', temperature: 22, lowTemperature: 17 },
    { key: 'thu', label: '목', icon: 'weather-sunny', temperature: 24, lowTemperature: 18 },
  ],
  dusty: [
    { key: 'today', label: '오늘', icon: 'weather-cloudy', temperature: 18, lowTemperature: 15 },
    { key: 'tomorrow', label: '내일', icon: 'weather-partly-cloudy', temperature: 20, lowTemperature: 16 },
    { key: 'wed', label: '수', icon: 'weather-sunny', temperature: 22, lowTemperature: 17 },
    { key: 'thu', label: '목', icon: 'weather-sunny', temperature: 24, lowTemperature: 18 },
  ],
  fresh: [
    { key: 'today', label: '오늘', icon: 'weather-sunny', temperature: 22, lowTemperature: 17 },
    { key: 'tomorrow', label: '내일', icon: 'weather-sunny', temperature: 23, lowTemperature: 18 },
    { key: 'wed', label: '수', icon: 'weather-sunny', temperature: 24, lowTemperature: 18 },
    { key: 'thu', label: '목', icon: 'weather-partly-cloudy', temperature: 21, lowTemperature: 16 },
  ],
};

const SCENARIO_AIR: Record<WeatherScenario, AirQualityMetric[]> = {
  rain: [
    {
      key: 'pm10',
      label: '미세먼지',
      valueLabel: '나쁨 (82ug/m³)',
      tone: 'bad',
      progress: 0.82,
    },
    {
      key: 'pm25',
      label: '초미세먼지',
      valueLabel: '보통',
      tone: 'moderate',
      progress: 0.46,
    },
    {
      key: 'ozone',
      label: '오존',
      valueLabel: '좋음',
      tone: 'good',
      progress: 0.28,
    },
  ],
  dusty: [
    {
      key: 'pm10',
      label: '미세먼지',
      valueLabel: '나쁨 (82ug/m³)',
      tone: 'bad',
      progress: 0.82,
    },
    {
      key: 'pm25',
      label: '초미세먼지',
      valueLabel: '보통',
      tone: 'moderate',
      progress: 0.52,
    },
    {
      key: 'ozone',
      label: '오존',
      valueLabel: '좋음',
      tone: 'good',
      progress: 0.24,
    },
  ],
  fresh: [
    {
      key: 'pm10',
      label: '미세먼지',
      valueLabel: '좋음 (15ug/m³)',
      tone: 'good',
      progress: 0.16,
    },
    {
      key: 'pm25',
      label: '초미세먼지',
      valueLabel: '좋음',
      tone: 'good',
      progress: 0.18,
    },
    {
      key: 'ozone',
      label: '오존',
      valueLabel: '좋음',
      tone: 'good',
      progress: 0.22,
    },
  ],
};

export const INDOOR_ACTIVITY_GUIDES: Record<IndoorActivityKey, IndoorActivityGuide> = {
  nosework: {
    key: 'nosework',
    badge: "TODAY'S GUIDE",
    accentLabel: '집중 놀이',
    title: '노즈워크 놀이',
    subtitle: '후각을 자극하며 차분하게 에너지를 풀어주는 놀이예요.',
    shortTip: '간식을 너무 어렵지 않은 위치에서 시작해 주는 편이 좋아요.',
    heroEmoji: '🐶',
    heroBackground: ['#EAF2FF', '#F8FBFF'],
    heroIcon: 'food-drumstick-outline',
    steps: [
      {
        key: 'snack',
        title: '간식 준비하기',
        description: '작고 향이 진한 간식을 준비해 아이의 집중을 끌어주세요.',
        icon: 'cookie',
      },
      {
        key: 'hide',
        title: '담요나 장난감에 숨기기',
        description: '너무 깊지 않은 위치부터 시작해 성공 경험을 먼저 주세요.',
        icon: 'layers-outline',
      },
      {
        key: 'find',
        title: '자유롭게 찾게 하기',
        description: '천천히 찾아낼 수 있도록 기다리며 충분히 칭찬해 주세요.',
        icon: 'paw',
      },
    ],
    recordDraft: {
      title: '즐거운 노즈워크 타임',
      notePrompt: '오늘 아이가 얼마나 즐거워했나요?',
      completionTitle: '기록 완료!',
      completionBody: '아이와의 차분한 놀이 시간이 소중한 추억으로 남았어요.',
      suggestedTags: ['#실내놀이', '#노즈워크', '#스트레스해소'],
      emotionOptions: [
        { key: 'excited', emoji: '🥰', label: '신나요' },
        { key: 'happy', emoji: '😍', label: '행복해요' },
        { key: 'calm', emoji: '😌', label: '차분해요' },
      ],
    },
  },
  tug: {
    key: 'tug',
    badge: 'PLAY GUIDE',
    accentLabel: '에너지 발산',
    title: '터그 놀이',
    subtitle: '짧고 즐겁게 에너지를 풀며 교감을 깊게 만드는 놀이예요.',
    shortTip: '너무 높게 들지 말고, 좌우로 부드럽게 흔들어주는 방식이 좋아요.',
    heroEmoji: '🎾',
    heroBackground: ['#FFF3EA', '#FFF9F4'],
    heroIcon: 'tennis-ball',
    steps: [
      {
        key: 'toy',
        title: '적당한 장난감 선택',
        description: '아이의 입 크기에 맞고 미끄럽지 않은 장난감을 준비해 주세요.',
        icon: 'toy-brick-outline',
      },
      {
        key: 'swing',
        title: '낮게 잡고 좌우로 흔들기',
        description: '목에 무리가 가지 않도록 낮은 위치에서 리듬감 있게 놀아주세요.',
        icon: 'swap-horizontal',
      },
      {
        key: 'release',
        title: '놓아 훈련과 함께 마무리',
        description: '짧은 성공 경험과 칭찬으로 놀이를 기분 좋게 끝내주세요.',
        icon: 'check-circle-outline',
      },
    ],
    recordDraft: {
      title: '신나는 터그 놀이',
      notePrompt: '오늘 아이의 에너지는 얼마나 시원하게 풀렸나요?',
      completionTitle: '기록 완료!',
      completionBody: '신나는 놀이 시간이 안전하게 저장되었어요.',
      suggestedTags: ['#실내놀이', '#터그놀이', '#에너지발산'],
      emotionOptions: [
        { key: 'excited', emoji: '🤩', label: '들떴어요' },
        { key: 'happy', emoji: '🥳', label: '즐거워요' },
        { key: 'calm', emoji: '😌', label: '만족해요' },
      ],
    },
  },
  training: {
    key: 'training',
    badge: 'MENTAL TRAINING',
    accentLabel: '집중 훈련',
    title: '개인기 연습',
    subtitle: '짧은 훈련과 보상으로 두뇌를 자극하는 시간이에요.',
    shortTip: '짧고 자주, 그리고 성공 즉시 보상을 주는 편이 가장 효과적이에요.',
    heroEmoji: '🧠',
    heroBackground: ['#FFF4E8', '#FFFBF6'],
    heroIcon: 'school-outline',
    steps: [
      {
        key: 'focus',
        title: '짧고 굵게 집중하기',
        description: '5~10분 안쪽으로 짧게 진행해야 아이가 끝까지 즐거워해요.',
        icon: 'timer-sand',
      },
      {
        key: 'reward',
        title: '즉시 보상 준비',
        description: '작은 간식과 밝은 칭찬을 바로 연결해 좋은 기억을 만들어주세요.',
        icon: 'star-circle-outline',
      },
      {
        key: 'repeat',
        title: '한 번 더 천천히 반복하기',
        description: '무리하지 않고 쉬운 단계부터 한 번 더 성공시켜 주세요.',
        icon: 'repeat',
      },
    ],
    recordDraft: {
      title: '똑똑해지는 개인기 연습',
      notePrompt: '오늘 아이가 어떤 순간에 가장 반짝였나요?',
      completionTitle: '기록 완료!',
      completionBody: '집중과 교감이 담긴 순간을 안전하게 남겼어요.',
      suggestedTags: ['#실내놀이', '#개인기연습', '#교감훈련'],
      emotionOptions: [
        { key: 'excited', emoji: '🤓', label: '집중했어요' },
        { key: 'happy', emoji: '🥰', label: '뿌듯해요' },
        { key: 'calm', emoji: '🙂', label: '차분해요' },
      ],
    },
  },
  massage: {
    key: 'massage',
    badge: 'HOME CARE',
    accentLabel: '편안한 휴식',
    title: '홈 마사지',
    subtitle: '부드러운 터치로 안정감과 정서적 유대감을 높여주는 시간이에요.',
    shortTip: '아이가 편안히 눕거나 기대는 자세에서 천천히 시작해 주세요.',
    heroEmoji: '🌿',
    heroBackground: ['#F6F0E6', '#FBF8F2'],
    heroIcon: 'leaf',
    steps: [
      {
        key: 'mood',
        title: '편안한 분위기 조성',
        description: '조명을 조금 낮추고 차분한 음악이나 담요를 준비해 주세요.',
        icon: 'weather-night',
      },
      {
        key: 'head',
        title: '머리부터 등까지 부드럽게',
        description: '힘을 주기보다 천천히 쓰다듬는 정도의 압력으로 충분해요.',
        icon: 'hand-heart-outline',
      },
      {
        key: 'rest',
        title: '짧게 마무리하고 쉬기',
        description: '짧아도 괜찮아요. 아이가 좋아하는 선에서 끝내는 것이 가장 중요해요.',
        icon: 'power-sleep',
      },
    ],
    recordDraft: {
      title: '편안한 홈 마사지 시간',
      notePrompt: '오늘 아이가 가장 편안해 보였던 순간을 적어보세요.',
      completionTitle: '기록 완료!',
      completionBody: '조용하고 따뜻한 교감의 순간이 추억으로 남았어요.',
      suggestedTags: ['#실내놀이', '#홈마사지', '#정서교감'],
      emotionOptions: [
        { key: 'excited', emoji: '🥹', label: '포근해요' },
        { key: 'happy', emoji: '😊', label: '편안해요' },
        { key: 'calm', emoji: '😴', label: '나른해요' },
      ],
    },
  },
};

export function getWeatherIconName(icon: WeatherIconKey) {
  return icon;
}

function pickScenarioFromDistrict(district: string): WeatherScenario {
  const raw = district.trim() || '일산동';
  const sum = Array.from(raw).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variants: WeatherScenario[] = ['rain', 'dusty', 'fresh'];
  return variants[sum % variants.length] ?? 'rain';
}

export function getWeatherGuideBundle(district = '일산동'): WeatherGuideBundle {
  const normalizedDistrict = district.trim() || '일산동';
  const scenario = pickScenarioFromDistrict(normalizedDistrict);
  const base = WEATHER_SCENARIOS[scenario];

  return {
    district: normalizedDistrict,
    scenario,
    ...base,
    weekly: SCENARIO_WEEKLY[scenario],
    airQualityMetrics: SCENARIO_AIR[scenario],
    recommendedGuideKeys:
      scenario === 'fresh'
        ? ['training', 'massage']
        : ['nosework', 'tug', 'training', 'massage'],
  };
}

export function getIndoorActivityGuide(key: IndoorActivityKey) {
  return INDOOR_ACTIVITY_GUIDES[key];
}
