import {
  getNotificationCardGestureIntent,
  shouldCaptureNotificationCardGesture,
} from '../src/services/notifications/gesturePolicy';

describe('notification card gesture policy', () => {
  it('captures horizontal dismiss gestures without treating vertical movement as dismiss', () => {
    expect(shouldCaptureNotificationCardGesture({ dx: 18, dy: 4 })).toBe(true);
    expect(
      getNotificationCardGestureIntent({
        dx: 96,
        dy: 12,
        expanded: false,
      }),
    ).toBe('dismiss');

    expect(
      getNotificationCardGestureIntent({
        dx: 28,
        dy: 48,
        expanded: false,
      }),
    ).not.toBe('dismiss');
  });

  it('expands collapsed cards with a dominant downward swipe', () => {
    expect(shouldCaptureNotificationCardGesture({ dx: 6, dy: 38 })).toBe(true);
    expect(
      getNotificationCardGestureIntent({
        dx: 8,
        dy: 44,
        expanded: false,
      }),
    ).toBe('expand');
  });

  it('collapses expanded cards with a dominant upward swipe', () => {
    expect(
      getNotificationCardGestureIntent({
        dx: 8,
        dy: -44,
        expanded: true,
      }),
    ).toBe('collapse');
  });

  it('ignores undersized or directionally ambiguous gestures', () => {
    expect(shouldCaptureNotificationCardGesture({ dx: 10, dy: 8 })).toBe(false);
    expect(
      getNotificationCardGestureIntent({
        dx: 34,
        dy: 31,
        expanded: false,
      }),
    ).toBe('none');
    expect(
      getNotificationCardGestureIntent({
        dx: 4,
        dy: -48,
        expanded: false,
      }),
    ).toBe('none');
  });
});
