export function replyIntersectsViewport(top: number, height: number, viewportTop: number, viewportHeight: number) {
  if (height <= 0 || viewportHeight <= 0) return false;
  const visible = Math.min(top + height, viewportTop + viewportHeight) - Math.max(top, viewportTop);
  return visible > 0 && visible + 0.5 >= Math.min(height, viewportHeight * 0.7);
}
