export const tutorialMotion = { intervalMs: 800, durationMs: 600, scrollOffsetDp: 10, minVisibleDp: 1 } as const;
export type BlockBounds = { y: number; height: number };
export function tutorialBlockVisible(block: BlockBounds, scroll: number, viewport: number) {
  return viewport > 0 && block.height > 0 &&
    Math.min(block.y + block.height, scroll + viewport) - Math.max(block.y, scroll) >= tutorialMotion.minVisibleDp;
}
