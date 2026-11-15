/** Product chrome is fixed; a pet's saved color belongs to identity only. */
export const PRODUCT_ACCENT = {
  primary: '#7D5CE4',
  pressed: '#6345BE',
  ink: '#221351',
  muted: '#827D9F',
  tint: '#EEE9FC',
  border: '#DDD5F7',
  marker: 'rgba(125,92,228,0.18)',
} as const;

export const PRODUCT_CTA = {
  primary: PRODUCT_ACCENT.primary,
  pressed: PRODUCT_ACCENT.pressed,
  subtle: PRODUCT_ACCENT.tint,
  border: PRODUCT_ACCENT.border,
} as const;

/** Filled lavender actions use white content; glass and other accents are separate. */
export const LAVENDER_CTA = {
  gradient: ['#7C54CC', '#6943B7'],
  pressedGradient: ['#7047BD', '#5C38A6'],
  background: '#6943B7',
  pressed: '#5C38A6',
  text: '#FFFFFF',
  border: '#7C54CC',
  arrow: '#FFFFFF',
} as const;
