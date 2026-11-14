const compactAppearance = { faceInset: 6, iconSize: 18 } as const;
const appearances = {
  timeline: { regular: { faceInset: 5, iconSize: 19 }, wide: { faceInset: 2, iconSize: 21 } },
  community: { regular: { faceInset: 3, iconSize: 21 }, wide: { faceInset: 1, iconSize: 22 } },
  health: { regular: { faceInset: 4, iconSize: 20 }, wide: { faceInset: 2, iconSize: 21 } },
  schedule: { regular: { faceInset: 5, iconSize: 19 }, wide: { faceInset: 3, iconSize: 21 } },
} as const;

// Keep the 48 dp touch target and its position stable; only the painted face grows.
export function resolveFloatingCreateAppearance(width: number, surface: keyof typeof appearances) {
  if (width <= 320) return compactAppearance;
  return appearances[surface][width >= 412 ? 'wide' : 'regular'];
}
