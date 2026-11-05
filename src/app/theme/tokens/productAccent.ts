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
