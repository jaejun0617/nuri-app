// Keep metadata out of the reading column when accessibility text needs more room.
export function resolveHomePopulatedLayout(width: number, fontScale: number) {
  const effectiveScale = Math.min(2, Math.max(1, fontScale));
  const readingWidth = Math.max(0, width - 60) / effectiveScale;
  return {
    stackedMetadata: readingWidth < 300,
    photoHeight: 250,
  };
}
