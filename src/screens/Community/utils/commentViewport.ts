export function resolveCommunityDiscussionBottomInset(
  navigationInset: number,
  animatedKeyboardHeight: number,
  focused: boolean,
): number {
  'worklet';
  // Keyboard height is negative while translating; in an edge-to-edge window
  // it already includes the system bar, so reserve only the larger inset.
  return focused ? Math.max(navigationInset, -animatedKeyboardHeight) : navigationInset;
}

export function resolveCommunityReplyRevealOffset(
  rowTop: number,
  rowHeight: number,
  viewportHeight: number,
  currentOffset: number,
): number | null {
  if (
    ![rowTop, rowHeight, viewportHeight, currentOffset].every(Number.isFinite) ||
    rowHeight <= 0 ||
    viewportHeight <= 0
  ) return null;

  const rowBottom = rowTop + rowHeight;
  const offset = rowTop < currentOffset || rowHeight >= viewportHeight
    ? rowTop
    : Math.max(currentOffset, rowBottom - viewportHeight);
  const clampedOffset = Math.max(0, offset);
  return Math.abs(clampedOffset - currentOffset) >= 2 ? clampedOffset : null;
}
