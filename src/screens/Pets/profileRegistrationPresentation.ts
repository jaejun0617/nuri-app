import { buildStickyActionPadding } from './profileEditPresentation';

export type RegistrationActionLayout = {
  closedBottom: number;
  openBottom: number;
  focusedInputBottomOffset: number;
};

export type RegistrationScrollMetrics = {
  contentHeight: number;
  offsetY: number;
  viewportHeight: number;
};

/**
 * Keeps keyboard movement and action-zone insets under separate owners while
 * deriving focused-input clearance from the action zone's measured height.
 */
export function buildRegistrationActionLayout(input: {
  safeAreaBottom: number;
  actionZonePadding: number;
  measuredActionZoneHeight: number;
}): RegistrationActionLayout {
  const actionPadding = buildStickyActionPadding({
    safeAreaBottom: input.safeAreaBottom,
    actionZonePadding: input.actionZonePadding,
  });
  const measuredActionZoneHeight = Number.isFinite(
    input.measuredActionZoneHeight,
  )
    ? Math.max(0, input.measuredActionZoneHeight)
    : 0;

  return {
    ...actionPadding,
    focusedInputBottomOffset:
      measuredActionZoneHeight +
      actionPadding.openBottom +
      input.actionZonePadding,
  };
}

/**
 * Removes the temporary keyboard-expanded scroll range after the IME closes.
 * This keeps the last form section adjacent to the shared action zone instead
 * of preserving a phantom blank area below the natural content bounds.
 */
export function clampRegistrationScrollOffset(
  metrics: RegistrationScrollMetrics,
): number {
  const contentHeight = Number.isFinite(metrics.contentHeight)
    ? Math.max(0, metrics.contentHeight)
    : 0;
  const viewportHeight = Number.isFinite(metrics.viewportHeight)
    ? Math.max(0, metrics.viewportHeight)
    : 0;
  const offsetY = Number.isFinite(metrics.offsetY)
    ? Math.max(0, metrics.offsetY)
    : 0;

  return Math.min(offsetY, Math.max(0, contentHeight - viewportHeight));
}
