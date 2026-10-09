import type { ImageSourcePropType } from 'react-native';
import type { SeasonKey } from '../seasonal/season';
import {
  HOME_AMBIENT_BASE_GRADIENT,
  HOME_AMBIENT_MESH_BASE_COLOR,
  HOME_AMBIENT_MESH_FIELDS,
  HOME_AMBIENT_SECTION_ZONES,
  type HomeAmbientBubbleZone,
  type HomeAmbientLight,
  type HomeAmbientMeshField,
} from './ambientMesh';

export type HomeAmbientAnchoredField = {
  centerXRatio: number;
  centerYRatio: number;
  widthRatio: number;
  heightRatio: number;
  color: string;
  opacity: number;
};

export type HomeAmbientSectionField = HomeAmbientAnchoredField & {
  zone: HomeAmbientBubbleZone;
};

export type HomeAmbientVisual = {
  primaryColor: string;
  baseColor: string;
  baseGradient: readonly [string, string, string, string, string];
  // Full-color canvas for Home and shared hubs; legacy reading surfaces stay unchanged.
  canvasGradient: readonly [string, string, string];
  fields: readonly HomeAmbientMeshField[];
  heroFields: readonly HomeAmbientAnchoredField[];
  sectionFields: readonly HomeAmbientSectionField[];
  lowerEdgeWash: readonly [string, string, string, string, string];
  headerWash: readonly [string, string, string];
  glassSurface: string;
  bubbleTexture: ImageSourcePropType;
  centerWashOpacity: number;
  lightHalo: string;
};

const AUTUMN = {
  apricot: '#F7C896',
} as const;
const WINTER = {
  ice: '#D4EAFE',
  lilac: '#E5E2F8',
  pearl: '#FFF9ED',
} as const;
const SPRING = {
  rose: '#FFDCE7',
  peach: '#FFF0DF',
  petal: '#F7D4E7',
} as const;
const SUMMER = {
  aqua: '#C9F2F8',
  mint: '#D4F5E2',
  ivory: '#FFFBE4',
} as const;

function field(
  centerXRatio: number,
  centerYRatio: number,
  widthRatio: number,
  heightRatio: number,
  color: string,
  opacity: number,
): HomeAmbientAnchoredField {
  return {
    centerXRatio,
    centerYRatio,
    widthRatio,
    heightRatio,
    color,
    opacity,
  };
}

/** One canvas owns these fields; measured sections are anchors, not background owners. */
function sectionFields(
  colors: readonly [string, string, string],
  opacity: readonly [number, number] = [0.66, 0.58],
): readonly HomeAmbientSectionField[] {
  return HOME_AMBIENT_SECTION_ZONES.flatMap((zone, index) => [
    {
      ...field(
        index % 2 === 0 ? 0.04 : 0.96,
        0.25,
        1.9,
        1.7,
        colors[index % 3],
        zone === 'summary' ? Math.max(0.64, opacity[0]) : opacity[0],
      ),
      zone,
    },
    {
      ...field(
        index % 2 === 0 ? 0.98 : 0.02,
        0.84,
        1.7,
        1.8,
        colors[(index + 1) % 3],
        zone === 'summary' ? Math.max(0.56, opacity[1]) : opacity[1],
      ),
      zone,
    },
  ]);
}

// Only the background selection changes. The approved Home foreground stays frozen.
export const HOME_FOREGROUND_UI_SEASON: SeasonKey = 'autumn';

export type HomeAmbientSectionLight = HomeAmbientLight & {
  zone: HomeAmbientBubbleZone;
  topRatio: number;
};

/** Original glint rhythm plus two PO-requested diary accents, in one canvas. */
export const HOME_AMBIENT_SECTION_LIGHTS: readonly HomeAmbientSectionLight[] = [
  {
    zone: 'weather',
    topRatio: 0.32,
    centerXRatio: 0.87,
    size: 17,
    opacity: 0.84,
  },
  {
    zone: 'weather',
    topRatio: 0.9,
    centerXRatio: 0.72,
    size: 14,
    opacity: 0.76,
  },
  {
    zone: 'frequent',
    topRatio: 0.54,
    centerXRatio: 0.92,
    size: 18,
    opacity: 0.82,
  },
  {
    zone: 'summary',
    topRatio: 0.82,
    centerXRatio: 0.06,
    size: 20,
    opacity: 0.84,
  },
  {
    zone: 'summary',
    topRatio: 0.09,
    centerXRatio: 0.04,
    size: 16,
    opacity: 0.84,
  },
  {
    zone: 'summary',
    topRatio: 0.47,
    centerXRatio: 0.96,
    size: 18,
    opacity: 0.86,
  },
  {
    zone: 'recent',
    topRatio: 0.1,
    centerXRatio: 0.94,
    size: 18,
    opacity: 0.84,
  },
  { zone: 'recent', topRatio: 0.4, centerXRatio: 0.06, size: 14, opacity: 0.8 },
  { zone: 'recent', topRatio: 0.88, centerXRatio: 0.92, size: 14, opacity: 0.76 },
  {
    zone: 'photo',
    topRatio: 0.96,
    centerXRatio: 0.85,
    size: 19,
    opacity: 0.84,
  },
  {
    zone: 'community',
    topRatio: -0.05,
    centerXRatio: 0.74,
    size: 18,
    opacity: 0.82,
  },
  { zone: 'community', topRatio: 0.42, centerXRatio: 0.06, size: 14, opacity: 0.8 },
  { zone: 'community', topRatio: 0.9, centerXRatio: 0.94, size: 20, opacity: 0.84 },
  {
    zone: 'recommendation',
    topRatio: -0.045,
    centerXRatio: 0.67,
    size: 20,
    opacity: 0.86,
  },
  {
    zone: 'schedule',
    topRatio: 0.8,
    centerXRatio: 0.1,
    size: 18,
    opacity: 0.84,
  },
  {
    zone: 'health',
    topRatio: 0.98,
    centerXRatio: 0.88,
    size: 17,
    opacity: 0.82,
  },
  {
    zone: 'today-tip',
    topRatio: 0.32,
    centerXRatio: 0.1,
    size: 16,
    opacity: 0.86,
  },
  { zone: 'today-tip', topRatio: 0.08, centerXRatio: 0.92, size: 13, opacity: 0.8 },
  { zone: 'today-tip', topRatio: 0.88, centerXRatio: 0.06, size: 19, opacity: 0.84 },
  {
    zone: 'diary',
    topRatio: 0.96,
    centerXRatio: 0.17,
    size: 14,
    opacity: 0.76,
  },
  {
    zone: 'diary',
    topRatio: 0.25,
    centerXRatio: 0.86,
    size: 18,
    opacity: 0.86,
  },
  {
    zone: 'diary',
    topRatio: 0.61,
    centerXRatio: 0.16,
    size: 16,
    opacity: 0.86,
  },
];

const HOME_AMBIENT_VISUALS: Record<SeasonKey, HomeAmbientVisual> = {
  autumn: {
    primaryColor: AUTUMN.apricot,
    baseColor: HOME_AMBIENT_MESH_BASE_COLOR,
    baseGradient: HOME_AMBIENT_BASE_GRADIENT,
    canvasGradient: ['#F7D5B1', '#F8DEC2', '#F3D0AC'],
    fields: HOME_AMBIENT_MESH_FIELDS,
    heroFields: [],
    // Keep colored variation while the edge wash covers gaps between radial fields.
    sectionFields: sectionFields(
      [AUTUMN.apricot, '#F2D6A4', '#F3B88A'],
      [0.4, 0.34],
    ),
    lowerEdgeWash: [
      'rgba(246, 191, 135, 0.46)',
      'rgba(249, 212, 162, 0.14)',
      'rgba(249, 212, 162, 0)',
      'rgba(253, 220, 163, 0.18)',
      'rgba(248, 186, 129, 0.48)',
    ],
    headerWash: [
      'rgba(255, 251, 246, 0.16)',
      'rgba(255, 251, 246, 0.06)',
      'rgba(255, 251, 246, 0)',
    ],
    glassSurface: 'rgba(255, 252, 246, 0.50)',
    bubbleTexture: require('../../assets/seasonal/home/autumn/bubbles/pearl-bubble-apricot-v3.png'),
    centerWashOpacity: 0.20,
    lightHalo: '#FFFDEB',
  },
  winter: {
    primaryColor: WINTER.ice,
    baseColor: '#F6FBFF',
    baseGradient: ['#F6FBFF', '#F3F9FF', '#F9FCFF', '#F6F8FE', '#F6FBFF'],
    canvasGradient: ['#D2E5F8', '#DEEAF8', '#DCDCF3'],
    fields: [],
    heroFields: [
      field(0.86, 0.12, 1.6, 0.85, WINTER.ice, 0.68),
      field(-0.1, 0.24, 1.75, 0.88, WINTER.ice, 0.48),
      field(0.08, 0.49, 1.4, 0.9, WINTER.lilac, 0.6),
      field(0.92, 0.6, 1.65, 0.9, WINTER.ice, 0.62),
      field(0.3, 0.83, 1.55, 0.75, WINTER.pearl, 0.6),
      field(0.95, 0.96, 1.6, 0.7, WINTER.lilac, 0.52),
    ],
    sectionFields: sectionFields([WINTER.ice, WINTER.lilac, '#DEE6F7']),
    lowerEdgeWash: [
      'rgba(204, 223, 250, 0.50)',
      'rgba(212, 234, 254, 0.16)',
      'rgba(212, 234, 254, 0)',
      'rgba(221, 216, 246, 0.18)',
      'rgba(214, 211, 243, 0.50)',
    ],
    headerWash: [
      'rgba(248, 252, 255, 0.08)',
      'rgba(248, 252, 255, 0.03)',
      'rgba(248, 252, 255, 0)',
    ],
    glassSurface: 'rgba(248, 252, 255, 0.50)',
    bubbleTexture: require('../../assets/seasonal/home/winter/bubbles/pearl-bubble-reference-v1.png'),
    centerWashOpacity: 0.12,
    lightHalo: '#F5FCFF',
  },
  spring: {
    primaryColor: SPRING.rose,
    baseColor: '#FFFCF6',
    baseGradient: ['#FFFCF6', '#FFF9F4', '#FFFCF7', '#FFFAF7', '#FFFCF6'],
    canvasGradient: ['#FAD5E2', '#FFE0E8', '#F1CFDF'],
    fields: [],
    heroFields: [
      field(1.0, 0.1, 1.6, 0.8, SPRING.petal, 0.44),
      field(0.0, 0.24, 1.55, 0.8, SPRING.rose, 0.62),
      field(0.96, 0.44, 1.55, 0.8, SPRING.rose, 0.52),
      field(0.0, 0.66, 1.6, 0.8, SPRING.petal, 0.62),
      field(0.5, 0.76, 1.4, 0.7, SPRING.peach, 0.4),
      field(0.0, 0.9, 1.65, 0.8, SPRING.rose, 0.54),
    ],
    sectionFields: sectionFields([SPRING.rose, SPRING.petal, '#F7DCE9']),
    lowerEdgeWash: [
      'rgba(250, 192, 218, 0.46)',
      'rgba(255, 220, 231, 0.16)',
      'rgba(255, 220, 231, 0)',
      'rgba(251, 203, 224, 0.18)',
      'rgba(249, 191, 218, 0.48)',
    ],
    headerWash: [
      'rgba(255, 252, 246, 0.08)',
      'rgba(255, 252, 246, 0.03)',
      'rgba(255, 252, 246, 0)',
    ],
    glassSurface: 'rgba(255, 249, 251, 0.50)',
    bubbleTexture: require('../../assets/seasonal/home/spring/bubbles/pearl-bubble-reference-v1.png'),
    centerWashOpacity: 0.12,
    lightHalo: '#FFFDF9',
  },
  summer: {
    primaryColor: SUMMER.aqua,
    baseColor: '#F6FFF9',
    baseGradient: ['#F6FFF9', '#F2FDFC', '#FAFFF7', '#F1FCFD', '#F6FFF9'],
    canvasGradient: ['#C5EDE3', '#D2F0ED', '#C4E7F0'],
    fields: [],
    heroFields: [
      field(0.0, 0.14, 1.6, 0.8, SUMMER.mint, 0.64),
      field(0.96, 0.22, 1.6, 0.8, SUMMER.aqua, 0.6),
      field(0.0, 0.44, 1.7, 0.8, SUMMER.aqua, 0.64),
      field(0.96, 0.59, 1.8, 0.8, SUMMER.mint, 0.58),
      field(0.5, 0.79, 1.6, 0.7, SUMMER.ivory, 0.6),
      field(0.0, 0.85, 1.6, 0.8, SUMMER.aqua, 0.5),
      field(0.96, 0.94, 1.7, 0.7, SUMMER.aqua, 0.6),
    ],
    sectionFields: sectionFields([SUMMER.aqua, SUMMER.mint, '#D9F2E8']),
    lowerEdgeWash: [
      'rgba(174, 233, 223, 0.44)',
      'rgba(201, 242, 248, 0.16)',
      'rgba(201, 242, 248, 0)',
      'rgba(184, 234, 244, 0.18)',
      'rgba(171, 229, 241, 0.46)',
    ],
    headerWash: [
      'rgba(248, 255, 252, 0.08)',
      'rgba(248, 255, 252, 0.03)',
      'rgba(248, 255, 252, 0)',
    ],
    glassSurface: 'rgba(248, 255, 252, 0.50)',
    bubbleTexture: require('../../assets/seasonal/home/summer/bubbles/pearl-bubble-reference-v1.png'),
    centerWashOpacity: 0.12,
    lightHalo: '#F6FFFF',
  },
};

/** Stable descriptors are allocated once, never during scrolling. */
export function getHomeAmbientVisual(season: SeasonKey): HomeAmbientVisual {
  return HOME_AMBIENT_VISUALS[season];
}
