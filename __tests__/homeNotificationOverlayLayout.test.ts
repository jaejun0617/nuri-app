import {
  HOME_NOTIFICATION_MODAL_BASE_HEIGHT,
  HOME_NOTIFICATION_MODAL_TARGET_HEIGHT,
  resolveHomeNotificationModalHeight,
} from '../src/services/home/notificationOverlayLayout';

describe('home notification overlay layout', () => {
  it('adds 100dp to the approved doubled height when the viewport allows it', () => {
    expect(HOME_NOTIFICATION_MODAL_TARGET_HEIGHT).toBe(
      HOME_NOTIFICATION_MODAL_BASE_HEIGHT * 2 + 100,
    );
    expect(
      resolveHomeNotificationModalHeight({
        windowHeight: 832,
        topInset: 24,
        bottomInset: 24,
      }),
    ).toBe(560);
  });

  it('caps the panel below the safe viewport on short screens', () => {
    expect(
      resolveHomeNotificationModalHeight({
        windowHeight: 520,
        topInset: 24,
        bottomInset: 24,
      }),
    ).toBe(362);
  });
});
