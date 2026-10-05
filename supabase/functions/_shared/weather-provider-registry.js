import {
  PROVIDER_CAPABILITIES,
  selectMeasurement,
  validateWarning,
  validateNowcast,
  weatherTimestamp,
} from './weather-api-domain.js';

function validMeasurement(item, kind, units, locationKey, source) {
  return (
    item &&
    typeof item.value === 'number' &&
    Number.isFinite(item.value) &&
    item.meta?.kind === kind &&
    units.includes(item.meta.unit) &&
    item.meta.source === source &&
    ['VALID', 'PARTIAL', 'STALE'].includes(item.meta.quality) &&
    item.meta.locationKey === locationKey &&
    weatherTimestamp(item.meta.validAt) &&
    weatherTimestamp(item.meta.retrievedAt) &&
    weatherTimestamp(item.meta.expiresAt)
  );
}
const contracts = {
  'kma-observation': (items, key) =>
    items.every(m =>
      validMeasurement(
        m,
        'OBSERVED',
        ['°C', '%', 'm/s', 'WMO'],
        key,
        'kma-observation',
      ),
    ),
  'kma-warning': (items, key) =>
    items.every(w => validateWarning(w) && w.meta.locationKey === key),
  airkorea: (items, key) =>
    items.every(m =>
      validMeasurement(m, 'AIR_QUALITY_OBSERVED', ['μg/m³'], key, 'airkorea'),
    ),
  'kma-nowcast': (items, key) =>
    items.every(n => validateNowcast(n) && n.meta.locationKey === key),
};

// Credentials/live fetchers are supplied only after a separate authorized activation.
// An absent adapter explicitly returns unavailable, not a fabricated normal condition.
export function createWeatherProviderRegistry(
  forecast,
  authorizedAdapters = {},
) {
  return {
    forecast,
    capabilities: PROVIDER_CAPABILITIES.map(s => ({
      ...s,
      state:
        s.state === 'ACTIVE' || authorizedAdapters[s.source]
          ? 'ACTIVE'
          : 'READY_INACTIVE',
    })),
    async readRole(source, locationKey, signal) {
      const validate = contracts[source],
        adapter = authorizedAdapters[source];
      if (!validate || !adapter)
        return { availability: 'unavailable', items: [] };
      const result = await adapter.read({ locationKey, signal });
      if (
        !Array.isArray(result?.items) ||
        result.items.length > 192 ||
        !validate(result.items, locationKey)
      )
        return { availability: 'unavailable', items: [] };
      return { availability: 'available', items: result.items };
    },
    current: (candidates, now) =>
      selectMeasurement(candidates, ['OBSERVED', 'FORECAST'], now),
    airQuality: (candidates, now) =>
      selectMeasurement(
        candidates,
        ['AIR_QUALITY_OBSERVED', 'AIR_QUALITY_FORECAST'],
        now,
      ),
  };
}
