import type { SeasonKey } from '../seasonal/season';
import { formatPetCopy } from '../../utils/petDisplayName';
import { HOME_SEASONAL_BACKGROUND_GRADIENTS } from './seasonalAmbient';

// PO reference: 852 x 1061 photo, one shallow ellipse with a 104 px sag.
// The actual container width owns geometry; source-image dimensions never do.
export const HOME_HERO_PHOTO_ASPECT_RATIO = 852 / 1061;
export const HOME_HERO_TOOLBAR_RADIUS = 24;
export const HOME_HERO_COLORS = {
  surface: '#F8F7FD', statusBar: '#FFFFFF', ink: '#221351',
  muted: '#8D88AA', onPhoto: '#FFFFFF',
} as const;
// PO 2026-10-21: the reference palette is fixed, independent of pet/app theme.
export const HOME_HERO_ACCENT = {
  primary: '#7D5CE4', tint: '#EEE9FC', border: '#D3C6FA', editSurface: '#F3EFFF',
} as const;
export type HomeHeroColors = Readonly<{ surface: string; statusBar: string; ink: string; muted: string; onPhoto: string }>;

function createHeroColors(season: SeasonKey): HomeHeroColors {
  const top = HOME_SEASONAL_BACKGROUND_GRADIENTS[season][0];
  return { ...HOME_HERO_COLORS, surface: top, statusBar: top };
}
const SEASONAL_HERO_COLORS: Record<SeasonKey, HomeHeroColors> = {
  spring: createHeroColors('spring'), summer: createHeroColors('summer'),
  autumn: createHeroColors('autumn'), winter: createHeroColors('winter'),
};
export function getHomeHeroColors(season?: SeasonKey): HomeHeroColors {
  // Only the explicit Home caller opts into seasonal paint; shared defaults stay fixed.
  return season ? SEASONAL_HERO_COLORS[season] : HOME_HERO_COLORS;
}

export function getHomeHeroPhotoGeometry(width: number) {
  const frameWidth = Number.isFinite(width) ? Math.max(0, width) : 0;
  const height = frameWidth / HOME_HERO_PHOTO_ASPECT_RATIO;
  const depth = frameWidth * 104 / 852;
  // A wider ellipse avoids the vertical tangent of a screen-wide semicircle.
  const radiusX = frameWidth;
  const radiusY = depth / (1 - Math.sqrt(0.75));
  return {
    width: frameWidth, height, edgeY: height - depth, depth,
    ellipseSize: frameWidth * 2, ellipseLeft: -frameWidth / 2,
    ellipseTop: height - radiusY - radiusX,
    ellipseScaleY: frameWidth > 0 ? radiusY / radiusX : 1,
  } as const;
}

export function getHomeHeroTypography(width: number, name: string) {
  const compact = width <= 360;
  // Explicit sp steps, not continuous viewport or inverse-fontScale scaling.
  const longName = Array.from(name).length > 10;
  return {
    compact, nameSize: compact || longName ? 25 : 33,
    nameLineHeight: compact || longName ? 36 : 44,
    badgeSize: compact ? 10 : 12, badgeLineHeight: 16,
    labelSize: compact ? 12 : 14, labelLineHeight: 20,
    valueSize: compact ? 21 : 25, valueLineHeight: 32,
    buttonSize: compact ? 12 : 14, buttonLineHeight: 20,
    // Equal side slots center the main CTA; the editor keeps a 16 dp right gutter.
    actionInset: 16,
    infoTop: compact ? 22 : 29,
  } as const;
}

export function getHomeHeroMinimumHeight(viewportHeight: number, toolbarHeight: number) {
  // The viewport is measured AFTER Screen's one top inset. The toolbar already
  // owns its system bottom inset; neither inset is subtracted a second time.
  // Continue the Hero surface behind the rounded toolbar corners so the lower
  // seasonal canvas cannot peek through them at the initial scroll position.
  return Math.max(0, viewportHeight - toolbarHeight) + HOME_HERO_TOOLBAR_RADIUS;
}

const SEASON_LABEL: Record<SeasonKey, string> = {
  spring: '봄', summer: '여름', autumn: '가을', winter: '겨울',
};
export function getHomeHeroSeasonCopy(name: string, season: SeasonKey) {
  return formatPetCopy(`우리 아이와 함께하는 ${SEASON_LABEL[season]}`, name);
}
