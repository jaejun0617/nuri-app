/** Weight/insight graph-only tokens; no global typography or surface rollout. */
export const healthGraphTypography = {
  caption: { fontSize: 14, lineHeight: 20, letterSpacing: 0 },
} as const;

export const healthGraphForeground = {
  light: { secondary: '#435061', meta: '#4D5A6C', grid: '#8794A4' },
  dark: { secondary: '#D5DEEA', meta: '#BAC6D6', grid: '#768AA2' },
} as const;
