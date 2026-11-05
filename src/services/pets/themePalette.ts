// 파일: src/services/pets/themePalette.ts
// 역할:
// - 아이 포인트색 UI 종료: 모든 표시에는 기본 라벤더 사용
// - 저장된 legacy themeColor는 읽기/저장 호환용으로만 보존

import { PRODUCT_ACCENT } from '../../app/theme/tokens/productAccent';

const FALLBACK_THEME = PRODUCT_ACCENT.primary;

export const PET_THEME_OPTIONS = [
  PRODUCT_ACCENT.primary,
  '#6D6AF8',
  '#F97316',
  '#EC4899',
  '#14B8A6',
  '#2563EB',
  '#22C55E',
  '#F59E0B',
  '#8B5CF6',
  '#EF4444',
  '#F43F5E',
  '#06B6D4',
  '#0EA5E9',
  '#6366F1',
  '#D946EF',
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toHex(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
}

function normalizeHex(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;

  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(withHash)) return null;
  return withHash.toUpperCase();
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment >= 0 && segment < 1) {
    red = chroma;
    green = x;
  } else if (segment < 2) {
    red = x;
    green = chroma;
  } else if (segment < 3) {
    green = chroma;
    blue = x;
  } else if (segment < 4) {
    green = x;
    blue = chroma;
  } else if (segment < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const match = lightness - chroma / 2;
  return `#${toHex((red + match) * 255)}${toHex((green + match) * 255)}${toHex((blue + match) * 255)}`.toUpperCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(hex) ?? FALLBACK_THEME;
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function shiftHex(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `#${toHex(r + amount)}${toHex(g + amount)}${toHex(b + amount)}`.toUpperCase();
}

function mixHex(base: string, mix: string, ratio: number): string {
  const lhs = hexToRgb(base);
  const rhs = hexToRgb(mix);
  const safeRatio = clamp(ratio, 0, 1);
  return `#${toHex(lhs.r + (rhs.r - lhs.r) * safeRatio)}${toHex(lhs.g + (rhs.g - lhs.g) * safeRatio)}${toHex(lhs.b + (rhs.b - lhs.b) * safeRatio)}`.toUpperCase();
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map(channel => {
    const value = channel / 255;
    if (value <= 0.03928) return value / 12.92;
    return ((value + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function getReadableTextColor(hex: string): string {
  const luminance = relativeLuminance(hex);
  const dark = '#10203D';
  const darkContrast = (luminance + 0.05) / (relativeLuminance(dark) + 0.05);
  const whiteContrast = 1.05 / (luminance + 0.05);
  return darkContrast > whiteContrast ? dark : '#FFFFFF';
}

function getHueFromHex(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  if (delta === 0) return 0;

  let hue = 0;
  if (max === red) {
    hue = ((green - blue) / delta) % 6;
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }

  return Math.round(hue * 60 < 0 ? hue * 60 + 360 : hue * 60);
}

function pickHeartEmoji(primary: string): string {
  const hue = getHueFromHex(primary);

  if (hue < 30 || hue >= 330) return '🩵';
  if (hue < 70) return '🩷';
  if (hue < 170) return '🧡';
  if (hue < 250) return '💛';
  return '💚';
}

function hashText(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 4294967295;
  }
  return hash;
}

function buildSeedValue(base64: string | null | undefined, fallbackText: string): number {
  const raw = (base64 ?? '').trim();
  if (!raw) return hashText(fallbackText);

  const step = Math.max(1, Math.floor(raw.length / 48));
  let acc = 0;
  let count = 0;

  for (let i = 0; i < raw.length && count < 96; i += step) {
    acc = (acc + raw.charCodeAt(i) * (count + 3)) % 4294967295;
    count += 1;
  }

  return (acc + hashText(fallbackText) * 17) % 4294967295;
}

export function recommendPetThemeColor(input: {
  imageBase64?: string | null;
  name?: string | null;
  petId?: string | null;
}): string {
  const fallbackText = `${input.name ?? ''}|${input.petId ?? ''}`.trim() || 'nuri';
  const seed = buildSeedValue(input.imageBase64, fallbackText);
  const hue = seed % 360;
  const saturation = 58 + (seed % 18);
  const lightness = 48 + (Math.floor(seed / 8) % 10);
  return hslToHex(hue, saturation, lightness);
}

/** Display-only compatibility adapter. Never rewrites a legacy saved value. */
export function resolvePetThemeColor(
  _storedThemeColor: string | null | undefined,
  _fallback?: { name?: string | null; petId?: string | null },
): string {
  return FALLBACK_THEME;
}

/** Color math for semantic accents such as weather, not saved pet preferences. */
export function buildAccentPalette(accent: string | null | undefined) {
  const primary = normalizeHex(accent) ?? FALLBACK_THEME;
  const deep = shiftHex(primary, -26);
  const soft = mixHex(primary, '#FFFFFF', 0.84);
  const border = mixHex(primary, '#FFFFFF', 0.68);
  const tint = mixHex(primary, '#FFFFFF', 0.88);
  const glow = mixHex(primary, '#FFFFFF', 0.58);
  const onPrimary = getReadableTextColor(primary);
  const onDeep = getReadableTextColor(deep);
  const heartEmoji = pickHeartEmoji(primary);
  const muted = mixHex(primary, '#0B1220', 0.22);

  return {
    primary,
    deep,
    soft,
    border,
    tint,
    glow,
    onPrimary,
    onDeep,
    heartEmoji,
    muted,
    ringGradient: [
      mixHex(primary, '#FFFFFF', 0.18),
      mixHex(primary, '#FFFFFF', 0.56),
      mixHex(primary, '#FFFFFF', 0.18),
    ] as [string, string, string],
  };
}

/** Legacy display API: stored pet values no longer personalize any surface. */
export function buildPetThemePalette(_themeColor: string | null | undefined) {
  return buildAccentPalette(FALLBACK_THEME);
}

// Legacy callers receive the fixed product palette; no user color is applied.
export const NEUTRAL_UI_PALETTE: ReturnType<typeof buildPetThemePalette> = {
  ...buildPetThemePalette(PRODUCT_ACCENT.primary),
  deep: PRODUCT_ACCENT.ink,
  tint: PRODUCT_ACCENT.tint,
  border: PRODUCT_ACCENT.border,
};
