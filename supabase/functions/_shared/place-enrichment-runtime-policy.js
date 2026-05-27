const DEFAULT_PLACE_ENRICHMENT_HARD_CAP = 0;

export const PLACE_ENRICHMENT_PROVIDER_DISABLED_ERROR_CODE =
  'provider_runtime_disabled';

export function normalizeHardCap(value) {
  const normalized = `${value ?? ''}`.trim();
  if (!normalized) {
    return DEFAULT_PLACE_ENRICHMENT_HARD_CAP;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return DEFAULT_PLACE_ENRICHMENT_HARD_CAP;
  }

  return parsed;
}

export function isPlaceEnrichmentProviderRuntimeDisabled(hardCap) {
  return hardCap <= 0;
}
