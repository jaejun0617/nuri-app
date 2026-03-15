import type { PetCareGuide } from './types';

export function isLocalGuideSeedGuide(guide: PetCareGuide): boolean {
  return guide.id.startsWith('guide-');
}
