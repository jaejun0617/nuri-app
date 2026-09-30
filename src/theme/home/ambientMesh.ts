export type HomeAmbientMeshField = {
  top: `${number}%`;
  centerXRatio: number;
  widthRatio: number;
  heightRatio: number;
  colors: readonly [string, string, string];
  opacity: number;
};

export type HomeAmbientBubbleKind = 'large' | 'medium' | 'small';

export type HomeAmbientBubbleZone =
  | 'weather'
  | 'frequent'
  | 'summary'
  | 'recent'
  | 'photo'
  | 'community'
  | 'recommendation'
  | 'schedule'
  | 'health'
  | 'today-tip'
  | 'diary';

export type HomeAmbientBubble = {
  kind: HomeAmbientBubbleKind;
  centerXRatio: number;
  sizeRatio: number;
  minimumSize: number;
  maximumSize: number;
  opacity: number;
  rotation: `${number}deg`;
};

export type HomeAmbientHeroBubble = HomeAmbientBubble & {
  /** Fraction of the existing Hero height, not a device pixel position. */
  topRatio: number;
};

export type HomeAmbientScrollBubble = HomeAmbientBubble & {
  zone: HomeAmbientBubbleZone;
  /** Relative to its measured section; Weather uses the lower canvas bounds. */
  top: `${number}%`;
};

export type HomeAmbientSectionLayout = { y: number; height: number };
export type HomeAmbientSectionLayouts = Partial<
  Record<HomeAmbientBubbleZone, HomeAmbientSectionLayout>
>;

export const HOME_AMBIENT_SECTION_ZONES: readonly HomeAmbientBubbleZone[] = [
  'frequent',
  'summary',
  'recent',
  'photo',
  'community',
  'recommendation',
  'schedule',
  'health',
  'today-tip',
  'diary',
];

export function updateHomeAmbientSectionLayout(
  layouts: HomeAmbientSectionLayouts,
  zone: HomeAmbientBubbleZone,
  layout: HomeAmbientSectionLayout,
): HomeAmbientSectionLayouts {
  if (
    !Number.isFinite(layout.y) ||
    !Number.isFinite(layout.height) ||
    layout.height <= 0
  ) {
    return layouts;
  }
  const next = {
    y: Math.round(layout.y * 2) / 2,
    height: Math.round(layout.height * 2) / 2,
  };
  const previous = layouts[zone];
  if (previous?.y === next.y && previous.height === next.height) return layouts;
  return { ...layouts, [zone]: next };
}

export type HomeAmbientLight = {
  centerXRatio: number;
  size: number;
  opacity: number;
};

export const HOME_AMBIENT_MESH_BASE_COLOR = '#FFF9F0';

export const HOME_AMBIENT_BASE_GRADIENT = [
  '#FFF9F0',
  '#FFF6ED',
  '#FFFAF4',
  '#FCF5EE',
  '#FFF9F0',
] as const;

const FIELD_COLORS = {
  peach: [
    'rgba(249, 220, 203, 0)',
    'rgba(249, 220, 203, 0.62)',
    'rgba(249, 220, 203, 0)',
  ],
  apricot: [
    'rgba(254, 212, 190, 0)',
    'rgba(254, 212, 190, 0.64)',
    'rgba(254, 212, 190, 0)',
  ],
  blush: [
    'rgba(253, 223, 214, 0)',
    'rgba(253, 223, 214, 0.54)',
    'rgba(253, 223, 214, 0)',
  ],
  cool: [
    'rgba(234, 242, 248, 0)',
    'rgba(234, 242, 248, 0.40)',
    'rgba(234, 242, 248, 0)',
  ],
  lilac: [
    'rgba(241, 236, 247, 0)',
    'rgba(241, 236, 247, 0.46)',
    'rgba(241, 236, 247, 0)',
  ],
} as const;

function field(
  top: `${number}%`,
  centerXRatio: number,
  widthRatio: number,
  palette: keyof typeof FIELD_COLORS,
  opacity: number,
): HomeAmbientMeshField {
  return {
    top,
    centerXRatio,
    widthRatio,
    heightRatio: 1.18,
    colors: FIELD_COLORS[palette],
    opacity,
  };
}

/** Both axes fade to transparent; no clipped pale circle or backing rectangle. */
export const HOME_AMBIENT_MESH_FIELDS: readonly HomeAmbientMeshField[] = [
  field('-3%', -0.08, 1.3, 'peach', 0.78),
  field('0%', 1.02, 1.4, 'apricot', 0.76),
  field('7%', 1.0, 1.28, 'blush', 0.74),
  field('15%', -0.1, 1.32, 'cool', 0.7),
  field('24%', 1.05, 1.4, 'peach', 0.76),
  field('34%', -0.04, 1.36, 'blush', 0.74),
  field('44%', 1.08, 1.3, 'lilac', 0.72),
  field('55%', -0.1, 1.42, 'apricot', 0.72),
  field('65%', 1.06, 1.36, 'peach', 0.76),
  field('75%', -0.08, 1.34, 'cool', 0.68),
  field('84%', 1.04, 1.4, 'blush', 0.74),
  field('94%', -0.06, 1.38, 'apricot', 0.7),
];

const SIZE_CONTRACT = {
  large: { minimumSize: 180, maximumSize: 290 },
  medium: { minimumSize: 44, maximumSize: 66 },
  small: { minimumSize: 10, maximumSize: 42 },
} as const;

function heroBubble(
  kind: HomeAmbientBubbleKind,
  topRatio: number,
  centerXRatio: number,
  sizeRatio: number,
  opacity: number,
  rotation: `${number}deg`,
): HomeAmbientHeroBubble {
  return {
    kind,
    topRatio,
    centerXRatio,
    sizeRatio,
    ...SIZE_CONTRACT[kind],
    opacity,
    rotation,
  };
}

/** Two cropped spheres match the mockup; the pet/photo corridor stays clear. */
export const HOME_AMBIENT_HERO_BUBBLES: readonly HomeAmbientHeroBubble[] = [
  heroBubble('large', 0.225, -0.02, 0.51, 1, '-18deg'),
  heroBubble('large', 0.598, 1.08, 0.64, 0.96, '24deg'),
  heroBubble('small', 0.015, 0.333, 0.085, 0.78, '8deg'),
  heroBubble('small', 0.304, 0.226, 0.075, 0.86, '-12deg'),
  heroBubble('small', 0.35, 0.88, 0.09, 0.88, '28deg'),
  heroBubble('small', 0.51, 0.102, 0.08, 0.82, '-25deg'),
  heroBubble('medium', 0.525, 0.904, 0.135, 0.9, '12deg'),
  heroBubble('small', 0.665, 0.8, 0.07, 0.84, '-8deg'),
];

function scrollBubble(
  zone: HomeAmbientBubbleZone,
  top: `${number}%`,
  centerXRatio: number,
  sizeRatio: number,
  opacity: number,
  rotation: `${number}deg`,
  kind: HomeAmbientBubbleKind = 'small',
): HomeAmbientScrollBubble {
  return {
    zone,
    top,
    kind,
    centerXRatio,
    sizeRatio,
    ...(kind === 'large'
      ? { minimumSize: 96, maximumSize: 150 }
      : kind === 'medium'
      ? { minimumSize: 44, maximumSize: 64 }
      : { minimumSize: 18, maximumSize: 42 }),
    opacity,
    rotation,
  };
}

/** Irregular section-local clusters stay beside content as its height changes. */
export const HOME_AMBIENT_SCROLL_BUBBLES: readonly HomeAmbientScrollBubble[] = [
  scrollBubble('weather', '0.4%', 0.08, 0.065, 0.78, '-9deg'),
  scrollBubble('weather', '2.1%', 0.93, 0.085, 0.84, '18deg'),
  scrollBubble('weather', '4.3%', 0.03, 0.038, 0.68, '-20deg'),
  scrollBubble('weather', '5.2%', 0.87, 0.05, 0.75, '12deg'),
  scrollBubble('frequent', '2%', 0.08, 0.125, 0.86, '-14deg', 'medium'),
  scrollBubble('frequent', '21%', 0.17, 0.055, 0.8, '24deg'),
  scrollBubble('frequent', '37%', 0.94, 0.1, 0.88, '7deg'),
  scrollBubble('frequent', '67%', 0.045, 0.078, 0.82, '-28deg'),
  scrollBubble('frequent', '96%', 0.88, 0.062, 0.78, '16deg'),
  scrollBubble('summary', '12%', 1.015, 0.32, 0.82, '22deg', 'large'),
  scrollBubble('summary', '4%', 0.87, 0.07, 0.86, '-10deg'),
  scrollBubble('summary', '28%', 0.055, 0.096, 0.82, '11deg'),
  scrollBubble('summary', '47%', 0.15, 0.052, 0.78, '-24deg'),
  scrollBubble('summary', '75%', 0.95, 0.12, 0.84, '17deg', 'medium'),
  scrollBubble('summary', '98%', 0.1, 0.081, 0.82, '-13deg'),
  scrollBubble('recent', '1%', 0.9, 0.068, 0.78, '31deg'),
  scrollBubble('recent', '43%', 0.045, 0.084, 0.8, '-8deg'),
  scrollBubble('recent', '78%', 0.84, 0.052, 0.74, '14deg'),
  scrollBubble('recent', '101%', 0.13, 0.068, 0.78, '-21deg'),
  scrollBubble('photo', '8%', 0.96, 0.13, 0.88, '16deg', 'medium'),
  scrollBubble('photo', '22%', 0.87, 0.06, 0.8, '-12deg'),
  scrollBubble('photo', '71%', 0.055, 0.086, 0.86, '-27deg'),
  scrollBubble('photo', '103%', -0.015, 0.3, 0.8, '7deg', 'large'),
  scrollBubble('photo', '96%', 0.12, 0.064, 0.82, '17deg'),
  scrollBubble('community', '2%', 0.95, 0.094, 0.82, '25deg'),
  scrollBubble('community', '25%', 0.08, 0.125, 0.84, '-11deg', 'medium'),
  scrollBubble('community', '46%', 0.17, 0.054, 0.78, '18deg'),
  scrollBubble('community', '81%', 0.89, 0.097, 0.84, '-17deg'),
  scrollBubble('community', '102%', 0.95, 0.06, 0.76, '9deg'),
  scrollBubble('recommendation', '3%', 0.07, 0.07, 0.82, '-23deg'),
  scrollBubble('recommendation', '26%', 0.93, 0.13, 0.86, '14deg', 'medium'),
  scrollBubble('recommendation', '61%', 0.12, 0.093, 0.82, '-9deg'),
  scrollBubble('recommendation', '98%', 0.96, 0.064, 0.78, '21deg'),
  scrollBubble('schedule', '2%', 0.07, 0.12, 0.86, '-16deg', 'medium'),
  scrollBubble('schedule', '31%', 0.88, 0.067, 0.82, '26deg'),
  scrollBubble('schedule', '69%', 0.96, 0.088, 0.8, '-6deg'),
  scrollBubble('schedule', '102%', 0.14, 0.057, 0.76, '13deg'),
  scrollBubble('health', '4%', 0.93, 0.083, 0.8, '19deg'),
  scrollBubble('health', '35%', 0.055, 0.068, 0.78, '-18deg'),
  scrollBubble('health', '79%', 0.15, 0.052, 0.74, '10deg'),
  scrollBubble('health', '102%', 0.96, 0.093, 0.82, '-29deg'),
  scrollBubble('today-tip', '2%', 0.07, 0.09, 0.82, '-12deg'),
  scrollBubble('today-tip', '24%', 0.9, 0.13, 0.88, '23deg', 'medium'),
  scrollBubble('today-tip', '48%', 0.96, 0.061, 0.78, '-17deg'),
  scrollBubble('today-tip', '81%', 0.13, 0.08, 0.8, '8deg'),
  scrollBubble('today-tip', '103%', 0.045, 0.105, 0.84, '-24deg'),
  scrollBubble('diary', '3%', 0.93, 0.086, 0.82, '18deg'),
  scrollBubble('diary', '23%', 0.06, 0.12, 0.84, '-13deg', 'medium'),
  scrollBubble('diary', '49%', 0.16, 0.058, 0.78, '28deg'),
  scrollBubble('diary', '99%', 1.01, 0.34, 0.82, '-9deg', 'large'),
  scrollBubble('diary', '94%', 0.86, 0.07, 0.82, '17deg'),
  scrollBubble('diary', '105%', 0.08, 0.095, 0.84, '-21deg'),
];

export const HOME_AMBIENT_HERO_LIGHTS: readonly (HomeAmbientLight & {
  topRatio: number;
})[] = [
  { topRatio: 0.14, centerXRatio: 0.98, size: 15, opacity: 0.78 },
  { topRatio: 0.21, centerXRatio: 0.9, size: 11, opacity: 0.72 },
  { topRatio: 0.3, centerXRatio: 0.75, size: 9, opacity: 0.66 },
  { topRatio: 0.32, centerXRatio: 0.77, size: 12, opacity: 0.7 },
  { topRatio: 0.43, centerXRatio: 0.89, size: 10, opacity: 0.72 },
  { topRatio: 0.56, centerXRatio: 0.2, size: 13, opacity: 0.7 },
  { topRatio: 0.75, centerXRatio: 0.08, size: 14, opacity: 0.68 },
  { topRatio: 0.86, centerXRatio: 0.06, size: 8, opacity: 0.62 },
  { topRatio: 0.95, centerXRatio: 0.86, size: 13, opacity: 0.7 },
];

export const HOME_AMBIENT_SCROLL_LIGHTS: readonly (HomeAmbientLight & {
  top: `${number}%`;
})[] = [
  { top: '1.4%', centerXRatio: 0.97, size: 10, opacity: 0.66 },
  { top: '6.2%', centerXRatio: 0.03, size: 12, opacity: 0.7 },
  { top: '12.2%', centerXRatio: 0.95, size: 8, opacity: 0.62 },
  { top: '18.0%', centerXRatio: 0.05, size: 11, opacity: 0.65 },
  { top: '25.6%', centerXRatio: 0.96, size: 10, opacity: 0.66 },
  { top: '32.5%', centerXRatio: 0.06, size: 8, opacity: 0.6 },
  { top: '40.9%', centerXRatio: 0.93, size: 12, opacity: 0.68 },
  { top: '47.0%', centerXRatio: 0.03, size: 9, opacity: 0.62 },
  { top: '54.5%', centerXRatio: 0.97, size: 11, opacity: 0.66 },
  { top: '61.4%', centerXRatio: 0.05, size: 8, opacity: 0.6 },
  { top: '68.0%', centerXRatio: 0.94, size: 12, opacity: 0.66 },
  { top: '74.4%', centerXRatio: 0.04, size: 9, opacity: 0.62 },
  { top: '82.3%', centerXRatio: 0.95, size: 10, opacity: 0.64 },
  { top: '89.9%', centerXRatio: 0.06, size: 12, opacity: 0.66 },
  { top: '96.7%', centerXRatio: 0.96, size: 8, opacity: 0.6 },
];

export function getHomeAmbientBubbleSize(
  bubble: HomeAmbientBubble,
  viewportWidth: number,
): number {
  return Math.round(
    Math.min(
      bubble.maximumSize,
      Math.max(bubble.minimumSize, viewportWidth * bubble.sizeRatio),
    ),
  );
}
