type OverlayHeightInput = {
  windowHeight: number;
  topInset?: number;
  bottomInset?: number;
  verticalMargin?: number;
};

type BottomSheetHeightInput = Omit<OverlayHeightInput, 'topInset'> & {
  topClearance?: number;
  maxWindowRatio?: number;
};

type PickerRowsInput = {
  availableHeight: number;
  regularRows?: number;
  compactRows?: number;
  compactHeightThreshold?: number;
};

function toNonNegativeFinite(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

/**
 * Keeps a centered overlay inside the current window and safe areas. The
 * calculation is intentionally based on the live window, not device constants,
 * so split-screen and foldable window changes use the same layout contract.
 */
export function getResponsiveOverlayMaxHeight({
  windowHeight,
  topInset = 0,
  bottomInset = 0,
  verticalMargin = 24,
}: OverlayHeightInput): number {
  const safeWindowHeight = toNonNegativeFinite(windowHeight);
  const safeMargin = toNonNegativeFinite(verticalMargin);

  return Math.max(
    0,
    safeWindowHeight -
      toNonNegativeFinite(topInset) -
      toNonNegativeFinite(bottomInset) -
      safeMargin * 2,
  );
}

/**
 * Reserves a predictable top escape area for bottom sheets while still
 * honoring the navigation inset and a ratio cap on taller displays.
 */
export function getResponsiveBottomSheetMaxHeight({
  windowHeight,
  bottomInset = 0,
  verticalMargin = 16,
  topClearance = 72,
  maxWindowRatio = 0.9,
}: BottomSheetHeightInput): number {
  const safeWindowHeight = toNonNegativeFinite(windowHeight);
  const safeRatio = Math.min(1, Math.max(0, maxWindowRatio));
  const insetLimitedHeight = Math.max(
    0,
    safeWindowHeight -
      toNonNegativeFinite(bottomInset) -
      toNonNegativeFinite(topClearance) -
      toNonNegativeFinite(verticalMargin),
  );

  return Math.min(safeWindowHeight * safeRatio, insetLimitedHeight);
}

export function getResponsivePickerVisibleRows({
  availableHeight,
  regularRows = 5,
  compactRows = 3,
  compactHeightThreshold = 560,
}: PickerRowsInput): number {
  const safeHeight = toNonNegativeFinite(availableHeight);
  const safeRegularRows = Math.max(1, Math.floor(regularRows));
  const safeCompactRows = Math.min(
    safeRegularRows,
    Math.max(1, Math.floor(compactRows)),
  );

  return safeHeight < toNonNegativeFinite(compactHeightThreshold)
    ? safeCompactRows
    : safeRegularRows;
}
