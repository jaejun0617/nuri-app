export const APP_FONT_MODES = ['jisu', 'pretendard'] as const;

export type AppFontMode = (typeof APP_FONT_MODES)[number];
export type AppTypographyScope = 'app-preference' | 'fixed';

export const LEGACY_APP_FONT_MODE: AppFontMode = 'pretendard';
export const FIRST_PET_PRESELECTED_FONT_MODE: AppFontMode = 'jisu';

export function isAppFontMode(value: unknown): value is AppFontMode {
  return APP_FONT_MODES.some(mode => mode === value);
}

export function getAppFontModeLabel(mode: AppFontMode): string {
  return mode === 'jisu' ? '귀염발랄체' : 'Pretendard';
}

export function resolveAppFontMode(input: {
  mode: AppFontMode;
  scope: AppTypographyScope;
  override?: AppFontMode;
}): AppFontMode | null {
  if (input.override) return input.override;
  return input.scope === 'app-preference' ? input.mode : null;
}
