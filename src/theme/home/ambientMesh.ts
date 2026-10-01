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
  /** Relative to its measured section; Weather uses the measured handoff interval. */
  top: `${number}%`;
  /** Section-local whitespace offset, independent of changing content height. */
  offsetY?: number;
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

/** A 48dp sphere fits inside the existing 52dp panel gap without sitting under a tile. */
function gapBubble(
  zone: HomeAmbientBubbleZone,
  centerXRatio: number,
  sizeRatio: number,
  opacity: number,
  rotation: `${number}deg`,
): HomeAmbientScrollBubble {
  return {
    ...scrollBubble(
      zone,
      '0%',
      centerXRatio,
      sizeRatio,
      opacity,
      rotation,
      'medium',
    ),
    maximumSize: 48,
    offsetY: -14,
  };
}

/** Approved rhythm plus Summary concept accents, painted by the same canvas. */
export const HOME_AMBIENT_SCROLL_BUBBLES: readonly HomeAmbientScrollBubble[] = [
  scrollBubble('weather', '22%', -0.012, 0.26, 0.8, '-16deg', 'large'),
  scrollBubble('weather', '78%', 1.012, 0.29, 0.82, '21deg', 'large'),
  scrollBubble('weather', '8%', 0.16, 0.12, 0.88, '-9deg', 'medium'),
  scrollBubble('weather', '94%', 0.84, 0.14, 0.9, '18deg', 'medium'),
  gapBubble('frequent', 0.14, 0.125, 0.9, '-14deg'),
  scrollBubble('frequent', '59%', -0.012, 0.27, 0.8, '-28deg', 'large'),
  scrollBubble('summary', '12%', 1.015, 0.32, 0.82, '22deg', 'large'),
  gapBubble('summary', 0.78, 0.115, 0.88, '-10deg'),
  scrollBubble('summary', '40%', -0.012, 0.29, 0.82, '-18deg', 'large'),
  scrollBubble('summary', '86%', 1.015, 0.30, 0.80, '14deg', 'large'),
  scrollBubble('summary', '30%', 0.60, 0.052, 0.86, '-12deg'),
  scrollBubble('summary', '54%', 0.89, 0.062, 0.88, '18deg'),
  gapBubble('recent', 0.2, 0.12, 0.9, '-21deg'),
  scrollBubble('recent', '73%', -0.008, 0.25, 0.78, '-8deg', 'large'),
  gapBubble('photo', 0.82, 0.125, 0.9, '16deg'),
  scrollBubble('photo', '103%', -0.015, 0.3, 0.8, '7deg', 'large'),
  gapBubble('community', 0.18, 0.12, 0.9, '-11deg'),
  scrollBubble('community', '44%', 1.01, 0.28, 0.8, '-17deg', 'large'),
  {
    ...scrollBubble(
      'recommendation',
      '0%',
      0.83,
      0.14,
      0.92,
      '14deg',
      'medium',
    ),
    maximumSize: 60,
    offsetY: 98,
  },
  scrollBubble('recommendation', '67%', -0.012, 0.29, 0.8, '-9deg', 'large'),
  gapBubble('schedule', 0.84, 0.115, 0.9, '-16deg'),
  scrollBubble('schedule', '48%', 1.015, 0.26, 0.78, '26deg', 'large'),
  gapBubble('health', 0.16, 0.125, 0.88, '19deg'),
  scrollBubble('health', '80%', -0.012, 0.27, 0.78, '-18deg', 'large'),
  {
    ...scrollBubble('today-tip', '0%', 0.84, 0.13, 0.9, '23deg', 'medium'),
    maximumSize: 56,
    offsetY: 50,
  },
  scrollBubble('today-tip', '98%', 1.01, 0.28, 0.8, '-17deg', 'large'),
  gapBubble('diary', 0.22, 0.12, 0.9, '-13deg'),
  scrollBubble('diary', '99%', 1.01, 0.34, 0.82, '-9deg', 'large'),
  // Small diary details stay in the illustration's side whitespace.
  scrollBubble('diary', '42%', 0.13, 0.064, 0.82, '14deg'),
  scrollBubble('diary', '58%', 0.87, 0.052, 0.78, '-18deg'),
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
