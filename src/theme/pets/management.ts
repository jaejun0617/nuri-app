import { getResponsiveOverlayMaxHeight } from '../../services/app/responsiveLayout';

// PO 2026-10-21: fixed reference colors, independent of pet and season themes.
export const PET_MANAGEMENT_COLORS = {
  canvas: '#F9F7FE',
  surface: '#FFFFFF',
  glass: 'rgba(255,255,255,0.65)',
  ink: '#19152F',
  muted: '#827D9F',
  accent: '#7D5CE4',
  subtle: '#EEE7FD',
  border: '#DDD5F7',
  quietBorder: '#EDE8F8',
  danger: '#B14258',
  marker: '#FBDFD4',
  dim: 'rgba(25,21,47,0.48)',
  white: '#FFFFFF',
  moreIcon: '#000000',
} as const;
export const PET_MANAGEMENT_TYPE = {
  managementTitle: { fontSize: 19, lineHeight: 26, letterSpacing: 0 },
  title: { fontSize: 22, lineHeight: 32, letterSpacing: 0 },
  count: { fontSize: 12, lineHeight: 16, letterSpacing: 0 },
  name: { fontSize: 24, lineHeight: 34, letterSpacing: 0 },
  meta: { fontSize: 11, lineHeight: 22, letterSpacing: 0 },
  label: { fontSize: 10, lineHeight: 20, letterSpacing: 0 },
  value: { fontSize: 15, lineHeight: 26, letterSpacing: 0 },
  action: { fontSize: 13, lineHeight: 22, letterSpacing: 0 },
  add: { fontSize: 16, lineHeight: 26, letterSpacing: 0 },
  warning: { fontSize: 18, lineHeight: 28, letterSpacing: 0 },
  dialogName: { fontSize: 20, lineHeight: 30, letterSpacing: 0 },
  dialogBody: { fontSize: 12, lineHeight: 22, letterSpacing: 0 },
  dialogAction: { fontSize: 14, lineHeight: 24, letterSpacing: 0 },
} as const;

/** Small-window steps affect geometry only; user font scaling stays enabled. */
export function getPetManagementLayout(width: number) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 320;
  const compact = safeWidth <= 360;
  const pageInset = compact ? 16 : 18;
  return {
    pageInset,
    compact,
    cardInset: compact ? 14 : 16,
    photoSize: Math.round(
      Math.min(138, Math.max(104, (safeWidth * 138) / 426.5)),
    ),
    photoGap: compact ? 14 : 20,
    cardGap: 14,
    cardRadius: 18,
    nameSize: compact ? 18 : 24,
    nameLineHeight: compact ? 30 : 34,
    actionSize: compact ? 11 : 13,
    metaSize: compact ? 10 : 11,
    cardWidth: safeWidth - pageInset * 2,
  } as const;
}
export function getPetDeleteLayout(
  height: number,
  topInset: number,
  bottomInset: number,
) {
  return {
    maxHeight: getResponsiveOverlayMaxHeight({
      windowHeight: height,
      topInset,
      bottomInset,
      verticalMargin: 12,
    }),
    sideInset: 20,
    radius: 25,
    contentInset: 20,
    photoSize: 68,
  } as const;
}
