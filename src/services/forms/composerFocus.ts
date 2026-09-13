export type ComposerFocusTarget = 'title' | 'body';

const DEFAULT_COMPOSER_FOCUS_TOP_INSET = 16;

export function resolveComposerFocusOffset(
  fieldTop: number,
  topInset = DEFAULT_COMPOSER_FOCUS_TOP_INSET,
) {
  if (!Number.isFinite(fieldTop) || !Number.isFinite(topInset)) return 0;
  return Math.max(0, fieldTop - Math.max(0, topInset));
}
