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
  | 'weather-windy'
  | 'weather-lightning'
  | 'weather-snowy'
  | 'weather-fog';

export type AirQualityTone = 'bad' | 'moderate' | 'good';
export type IndoorActivityKey =
  | 'nosework'
  | 'tug'
  | 'training'
  | 'massage'
  | 'sniff-mat'
  | 'hide-and-seek'
  | 'stretching'
  | 'balance-walk';
export const ALL_INDOOR_ACTIVITY_KEYS: ReadonlyArray<IndoorActivityKey> = [
  'nosework',
  'tug',
  'training',
  'massage',
  'sniff-mat',
  'hide-and-seek',
  'stretching',
  'balance-walk',
];
export type WeatherRecordEmotionKey =
  | 'excited'
  | 'happy'
  | 'calm'
  | 'neutral'
  | 'tired'
  | 'sad'
  | 'anxious'
  | 'angry';

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
      key: WeatherRecordEmotionKey;
      emoji: string;
      label: string;
    }>;
  };
};

export const WEATHER_RECORD_EMOTION_OPTIONS: ReadonlyArray<{
  key: WeatherRecordEmotionKey;
  emoji: string;
  label: string;
}> = [
  { key: 'excited', emoji: '🤩', label: '신나요' },
  { key: 'happy', emoji: '🥰', label: '행복해요' },
  { key: 'calm', emoji: '😌', label: '차분해요' },
  { key: 'neutral', emoji: '🙂', label: '편안해요' },
  { key: 'tired', emoji: '😴', label: '나른해요' },
  { key: 'sad', emoji: '🥺', label: '아쉬워요' },
  { key: 'anxious', emoji: '😥', label: '조심스러워요' },
  { key: 'angry', emoji: '😤', label: '예민해요' },
];

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
  'sniff-mat': {
    key: 'sniff-mat',
    badge: 'SNIFF PLAY',
    accentLabel: '후각 만족',
    title: '스니프 매트',
    subtitle: '매트 사이에 간식을 숨기며 천천히 몰입하는 놀이예요.',
    shortTip: '간식을 너무 깊게 숨기기보다 찾기 쉬운 곳부터 시작해 주세요.',
    heroEmoji: '🧩',
    heroBackground: ['#F8F1FF', '#F3E8FF'],
    heroIcon: 'cards-outline',
    steps: [
      {
        key: 'spread',
        title: '매트를 편안하게 펼치기',
        description: '미끄럽지 않은 바닥에 매트를 펼치고 아이가 충분히 냄새를 맡게 해 주세요.',
        icon: 'dots-grid',
      },
      {
        key: 'hide-snacks',
        title: '간식을 군데군데 숨기기',
        description: '처음에는 눈에 조금 보이게 두고, 익숙해지면 점점 안쪽으로 숨겨 주세요.',
        icon: 'cookie-outline',
      },
      {
        key: 'slow-down',
        title: '천천히 찾도록 기다리기',
        description: '보호자가 너무 빨리 도와주기보다 스스로 찾는 시간을 충분히 주세요.',
        icon: 'timer-sand',
      },
    ],
    recordDraft: {
      title: '스니프 매트로 놀았어요',
      notePrompt: '오늘 아이가 가장 집중했던 순간을 적어보세요.',
      completionTitle: '기록 완료!',
      completionBody: '천천히 몰입한 후각 놀이 시간이 추억으로 남았어요.',
      suggestedTags: ['#실내놀이', '#스니프매트', '#후각놀이'],
      emotionOptions: [
        { key: 'excited', emoji: '🧐', label: '집중해요' },
        { key: 'happy', emoji: '😋', label: '만족해요' },
        { key: 'calm', emoji: '😌', label: '차분해요' },
      ],
    },
  },
  'hide-and-seek': {
    key: 'hide-and-seek',
    badge: 'BONDING PLAY',
    accentLabel: '교감 놀이',
    title: '숨바꼭질',
    subtitle: '보호자를 찾으며 집중력과 교감을 함께 높이는 놀이예요.',
    shortTip: '짧게 숨어도 괜찮아요. 찾았을 때 크게 칭찬해 주세요.',
    heroEmoji: '🙈',
    heroBackground: ['#FFF7ED', '#FFEDD5'],
    heroIcon: 'account-search-outline',
    steps: [
      {
        key: 'cue',
        title: '이름을 먼저 불러주기',
        description: '아이에게 놀이가 시작된다는 신호를 주고, 짧은 거리에서 시작해 주세요.',
        icon: 'bullhorn-outline',
      },
      {
        key: 'hide',
        title: '가볍게 숨기',
        description: '문 뒤나 커튼 옆처럼 안전하고 가까운 곳에 숨어 아이가 성공 경험을 얻도록 해 주세요.',
        icon: 'curtains',
      },
      {
        key: 'praise',
        title: '찾으면 크게 칭찬하기',
        description: '찾아왔을 때 간식이나 밝은 목소리로 반응하면 놀이 만족도가 높아져요.',
        icon: 'party-popper',
      },
    ],
    recordDraft: {
      title: '숨바꼭질 놀이 완료',
      notePrompt: '오늘 아이가 가장 신나 했던 순간을 남겨보세요.',
      completionTitle: '기록 완료!',
      completionBody: '보호자를 찾으며 웃었던 시간이 예쁘게 저장됐어요.',
      suggestedTags: ['#실내놀이', '#숨바꼭질', '#교감놀이'],
      emotionOptions: [
        { key: 'excited', emoji: '😆', label: '신나요' },
        { key: 'happy', emoji: '🥰', label: '가까워요' },
        { key: 'calm', emoji: '🙂', label: '안정돼요' },
      ],
    },
  },
  stretching: {
    key: 'stretching',
    badge: 'BODY CARE',
    accentLabel: '가벼운 움직임',
    title: '가벼운 스트레칭',
    subtitle: '실내에서도 몸을 부드럽게 풀어주는 짧은 움직임 루틴이에요.',
    shortTip: '억지로 자세를 만들기보다 자연스러운 움직임을 유도해 주세요.',
    heroEmoji: '🧘',
    heroBackground: ['#ECFDF5', '#D1FAE5'],
    heroIcon: 'meditation',
    steps: [
      {
        key: 'walk',
        title: '짧게 걷기',
        description: '방 안을 천천히 한 바퀴 돌며 몸을 먼저 풀어 주세요.',
        icon: 'walk',
      },
      {
        key: 'reach',
        title: '간식으로 자세 유도하기',
        description: '간식을 좌우로 천천히 움직여 목과 몸통을 부드럽게 쓰게 해 주세요.',
        icon: 'hand-front-right-outline',
      },
      {
        key: 'rest',
        title: '짧게 쉬며 마무리하기',
        description: '무리하지 않고 짧게 끝내야 아이도 편안하게 받아들여요.',
        icon: 'pause-circle-outline',
      },
    ],
    recordDraft: {
      title: '가벼운 스트레칭 시간',
      notePrompt: '오늘 아이 몸 상태가 어땠는지 적어보세요.',
      completionTitle: '기록 완료!',
      completionBody: '부드럽게 몸을 푼 시간이 추억으로 남았어요.',
      suggestedTags: ['#실내놀이', '#스트레칭', '#몸풀기'],
      emotionOptions: [
        { key: 'calm', emoji: '😌', label: '편안해요' },
        { key: 'happy', emoji: '😊', label: '개운해요' },
        { key: 'tired', emoji: '😴', label: '나른해요' },
      ],
    },
  },
  'balance-walk': {
    key: 'balance-walk',
    badge: 'FOCUS WALK',
    accentLabel: '집중 루틴',
    title: '실내 밸런스 워크',
    subtitle: '쿠션이나 매트를 이용해 천천히 중심을 잡는 놀이예요.',
    shortTip: '미끄러운 재질은 피하고, 짧은 구간으로 안전하게 시작해 주세요.',
    heroEmoji: '🚶',
    heroBackground: ['#EEF2FF', '#E0E7FF'],
    heroIcon: 'map-marker-path',
    steps: [
      {
        key: 'path',
        title: '짧은 동선 만들기',
        description: '쿠션, 매트, 접은 담요 등을 일렬로 두고 안전한 길을 만들어 주세요.',
        icon: 'map-outline',
      },
      {
        key: 'guide',
        title: '천천히 유도하기',
        description: '간식이나 손짓으로 한 걸음씩 천천히 이동하게 해 주세요.',
        icon: 'gesture-tap-hold',
      },
      {
        key: 'finish',
        title: '성공하면 쉬기',
        description: '짧게 성공하고 쉬는 방식이 아이에게 더 좋은 경험으로 남아요.',
        icon: 'flag-checkered',
      },
    ],
    recordDraft: {
      title: '실내 밸런스 워크 완료',
      notePrompt: '오늘 아이가 어느 구간에서 가장 자신 있어 했는지 적어보세요.',
      completionTitle: '기록 완료!',
      completionBody: '집 안에서도 차분히 움직인 시간이 남았어요.',
      suggestedTags: ['#실내놀이', '#밸런스워크', '#집중놀이'],
      emotionOptions: [
        { key: 'excited', emoji: '🤗', label: '도전해요' },
        { key: 'calm', emoji: '😌', label: '집중해요' },
        { key: 'happy', emoji: '😄', label: '뿌듯해요' },
      ],
    },
  },
};

export function getWeatherEmoji(icon: WeatherIconKey) {
  switch (icon) {
    case 'weather-sunny':
      return '☀️';
    case 'weather-partly-cloudy':
    case 'weather-night-partly-cloudy':
      return '⛅';
    case 'weather-cloudy':
      return '☁️';
    case 'weather-pouring':
      return '🌧️';
    case 'weather-lightning':
      return '🌩️';
    case 'weather-snowy':
      return '❄️';
    case 'weather-fog':
      return '🌫️';
    case 'weather-windy':
      return '💨';
    default:
      return '☀️';
  }
}

function pickScenarioFromDistrict(district: string): WeatherScenario {
  const raw = district.trim() || '현재 위치';
  const sum = Array.from(raw).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variants: WeatherScenario[] = ['rain', 'dusty', 'fresh'];
  return variants[sum % variants.length] ?? 'rain';
}

export function getWeatherGuideBundle(district = '현재 위치'): WeatherGuideBundle {
  const normalizedDistrict = district.trim() || '현재 위치';
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
