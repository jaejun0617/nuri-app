import type { MemoryRecord } from '../supabase/memories';
import type { MemoryImageVariant } from '../supabase/storageMemories';

type MemoryImageFields = Pick<MemoryRecord, 'imagePath' | 'imagePaths' | 'imageUrl'>;

export type MemoryImageRefKind = 'storage' | 'remote' | 'local';

export type MemoryImageRef = {
  key: string;
  value: string;
  kind: MemoryImageRefKind;
};

function normalizeString(value: string | null | undefined) {
  return `${value ?? ''}`.trim();
}

export function isRemoteMemoryImageUri(value: string | null | undefined) {
  return /^https?:\/\//i.test(normalizeString(value));
}

export function isLocalMemoryImageUri(value: string | null | undefined) {
  return /^(file|content|ph|assets-library):\/\//i.test(normalizeString(value));
}

export function isDirectMemoryImageUri(value: string | null | undefined) {
  return (
    isRemoteMemoryImageUri(value) ||
    isLocalMemoryImageUri(value) ||
    /^data:/i.test(normalizeString(value))
  );
}

export function getMemoryImageRefKind(
  value: string | null | undefined,
): MemoryImageRefKind | null {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  if (isRemoteMemoryImageUri(normalized)) return 'remote';
  if (isLocalMemoryImageUri(normalized) || /^data:/i.test(normalized)) {
    return 'local';
  }
  return 'storage';
}

function pushUnique(target: string[], seen: Set<string>, value: string | null | undefined) {
  const normalized = normalizeString(value);
  if (!normalized || seen.has(normalized)) return;
  seen.add(normalized);
  target.push(normalized);
}

export function normalizeMemoryImageFields<T extends Partial<MemoryImageFields>>(
  input: T,
): T & MemoryImageFields {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const value of input.imagePaths ?? []) {
    pushUnique(ordered, seen, value);
  }
  pushUnique(ordered, seen, input.imagePath);
  pushUnique(ordered, seen, input.imageUrl);

  const storagePaths = ordered.filter(value => !isDirectMemoryImageUri(value));
  const directUri = ordered.find(isDirectMemoryImageUri) ?? null;

  return {
    ...input,
    imagePath: storagePaths[0] ?? null,
    imagePaths: storagePaths,
    imageUrl: directUri,
  };
}

export function normalizeMemoryRecord<T extends Partial<MemoryRecord>>(input: T) {
  return normalizeMemoryImageFields(input);
}

export function getMemoryImageRefs(input: Partial<MemoryImageFields>): MemoryImageRef[] {
  const seen = new Set<string>();
  const ordered: MemoryImageRef[] = [];

  for (const value of input.imagePaths ?? []) {
    const normalized = normalizeString(value);
    const kind = getMemoryImageRefKind(normalized);
    if (!normalized || !kind || seen.has(normalized)) continue;
    seen.add(normalized);
    ordered.push({ key: `${kind}:${normalized}`, value: normalized, kind });
  }

  for (const value of [input.imagePath, input.imageUrl]) {
    const normalized = normalizeString(value);
    const kind = getMemoryImageRefKind(normalized);
    if (!normalized || !kind || seen.has(normalized)) continue;
    seen.add(normalized);
    ordered.push({ key: `${kind}:${normalized}`, value: normalized, kind });
  }

  return ordered;
}

export function getPrimaryMemoryImageRef(input: Partial<MemoryImageFields>) {
  return getMemoryImageRefs(input)[0]?.value ?? null;
}

export function getTimelinePrimaryMemoryImageSource(
  input: Partial<MemoryImageFields> &
    Pick<Partial<MemoryRecord>, 'timelineImagePath' | 'timelineImageVariant'>,
): {
  value: string | null;
  variant: MemoryImageVariant;
} {
  const timelineImagePath = normalizeString(input.timelineImagePath);
  if (timelineImagePath) {
    return {
      value: timelineImagePath,
      variant: input.timelineImageVariant ?? 'original',
    };
  }

  return {
    value: getPrimaryMemoryImageRef(input),
    variant: 'original',
  };
}

export function hasMemoryImage(input: Partial<MemoryImageFields>) {
  return getMemoryImageRefs(input).length > 0;
}
