import {
  isPlaceEnrichmentProviderRuntimeDisabled,
  normalizeHardCap,
} from '../supabase/functions/_shared/place-enrichment-runtime-policy.js';

describe('place enrichment runtime policy', () => {
  it('hard cap이 없거나 0이면 production provider runtime을 닫는다', () => {
    expect(normalizeHardCap(undefined)).toBe(0);
    expect(normalizeHardCap('')).toBe(0);
    expect(normalizeHardCap('0')).toBe(0);
    expect(normalizeHardCap('-1')).toBe(0);
    expect(normalizeHardCap('not-a-number')).toBe(0);
  });

  it('명시적으로 양수 hard cap을 넣은 환경에서만 provider runtime을 연다', () => {
    expect(normalizeHardCap('6000')).toBe(6000);
    expect(isPlaceEnrichmentProviderRuntimeDisabled(0)).toBe(true);
    expect(isPlaceEnrichmentProviderRuntimeDisabled(6000)).toBe(false);
  });
});
