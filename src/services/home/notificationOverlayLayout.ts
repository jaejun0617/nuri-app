export const HOME_NOTIFICATION_MODAL_BASE_HEIGHT = 230;
export const HOME_NOTIFICATION_MODAL_TARGET_HEIGHT =
  HOME_NOTIFICATION_MODAL_BASE_HEIGHT * 2 + 100;

const HOME_NOTIFICATION_MODAL_MIN_TOP_OFFSET = 92;
const HOME_NOTIFICATION_MODAL_HEADER_OFFSET = 78;
const HOME_NOTIFICATION_MODAL_VIEWPORT_GUTTER = 32;

type HomeNotificationModalHeightInput = {
  windowHeight: number;
  topInset: number;
  bottomInset: number;
};

export function resolveHomeNotificationModalHeight({
  windowHeight,
  topInset,
  bottomInset,
}: HomeNotificationModalHeightInput): number {
  const panelTopOffset = Math.max(
    topInset + HOME_NOTIFICATION_MODAL_HEADER_OFFSET,
    HOME_NOTIFICATION_MODAL_MIN_TOP_OFFSET,
  );
  const safeViewportHeight = Math.max(
    0,
    windowHeight -
      panelTopOffset -
      Math.max(0, bottomInset) -
      HOME_NOTIFICATION_MODAL_VIEWPORT_GUTTER,
  );

  return Math.min(HOME_NOTIFICATION_MODAL_TARGET_HEIGHT, safeViewportHeight);
}
