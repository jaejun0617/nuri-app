export function resolveCommunityKeyboardOffset(
  windowHeight: number,
  viewportHeight: number | null,
  reservedBottomInset = 0,
): number {
  if (
    !Number.isFinite(windowHeight) ||
    viewportHeight === null ||
    !Number.isFinite(viewportHeight) ||
    windowHeight <= 0 ||
    viewportHeight <= 0
  ) {
    return 0;
  }

  // The native stack header is outside this viewport; keyboard coordinates
  // include it. Derive the difference instead of hardcoding a header height.
  return Math.max(windowHeight - viewportHeight - reservedBottomInset, 0);
}
