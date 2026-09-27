import type { Pet } from '../../store/petStore';

const STORY_FIELD_MIN_HEIGHT = 58;
const STORY_FIELD_MAX_HEIGHT = 108;

function formatWeightKg(weightKg: number | null | undefined): string | null {
  if (
    typeof weightKg !== 'number' ||
    !Number.isFinite(weightKg) ||
    weightKg <= 0
  ) {
    return null;
  }

  return `${Number(weightKg.toFixed(2))}kg`;
}

function formatSex(gender: Pet['gender']): string | null {
  if (gender === 'male') return '남아';
  if (gender === 'female') return '여아';
  return null;
}

export function buildProfileEditMetadata(input: {
  speciesLabel?: string | null;
  ageLabel?: string | null;
  weightKg?: number | null;
  gender?: Pet['gender'];
}): string | null {
  const parts = [
    input.speciesLabel?.trim() || null,
    input.ageLabel?.trim() || null,
    formatWeightKg(input.weightKg),
    formatSex(input.gender),
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(' · ') : null;
}

export function clampStoryFieldHeight(contentHeight: number): number {
  if (!Number.isFinite(contentHeight)) return STORY_FIELD_MIN_HEIGHT;
  return Math.min(
    STORY_FIELD_MAX_HEIGHT,
    Math.max(STORY_FIELD_MIN_HEIGHT, Math.ceil(contentHeight + 22)),
  );
}

export function buildStickyActionPadding(input: {
  safeAreaBottom: number;
  actionZonePadding: number;
}): { closedBottom: number; openBottom: number } {
  const safeAreaBottom = Number.isFinite(input.safeAreaBottom)
    ? Math.max(0, input.safeAreaBottom)
    : 0;
  const actionZonePadding = Number.isFinite(input.actionZonePadding)
    ? Math.max(0, input.actionZonePadding)
    : 0;

  return {
    closedBottom: Math.max(safeAreaBottom, actionZonePadding),
    openBottom: actionZonePadding,
  };
}
