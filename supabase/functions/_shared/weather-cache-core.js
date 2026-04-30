const WEATHER_PROVIDER = 'open-meteo';
const WEATHER_COORD_BUCKET_SIZE_DEGREES = 0.02;
const WEATHER_FRESH_TTL_MS = 60 * 60 * 1000;
const WEATHER_STALE_TTL_MS = 6 * 60 * 60 * 1000;
const WEATHER_DEFAULT_LOCALE = 'ko-KR';
const WEATHER_DEFAULT_TIMEZONE = 'Asia/Seoul';
const OPEN_METEO_ATTRIBUTION = {
  label: 'Open-Meteo',
  url: 'https://open-meteo.com/',
};

export {
  OPEN_METEO_ATTRIBUTION,
  WEATHER_COORD_BUCKET_SIZE_DEGREES,
  WEATHER_DEFAULT_LOCALE,
  WEATHER_DEFAULT_TIMEZONE,
  WEATHER_FRESH_TTL_MS,
  WEATHER_PROVIDER,
  WEATHER_STALE_TTL_MS,
};

export class WeatherCacheHttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'WeatherCacheHttpError';
    this.status = status;
    this.code = code;
  }
}

function normalizeString(value) {
  const normalized = `${value ?? ''}`.trim();
  return normalized ? normalized : null;
}

function readFiniteNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeBucketNumber(value) {
  const normalized = Math.round(value * 100) / 100;
  return Object.is(normalized, -0) ? 0 : normalized;
}

function formatBucketNumber(value) {
  return normalizeBucketNumber(value).toFixed(2);
}

export function createCoordBucket(input) {
  const latitude = readFiniteNumber(input?.latitude);
  const longitude = readFiniteNumber(input?.longitude);

  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new WeatherCacheHttpError(
      400,
      'invalid_coordinates',
      'valid latitude and longitude are required',
    );
  }

  // 날씨는 초정밀 위치보다 지역 단위 재사용 가치가 크다.
  // 0.02도 bucket은 서울권 기준 약 1.5~2.2km 범위라 홈/가이드 목적에 충분하다.
  const bucketLatitude = normalizeBucketNumber(
    Math.round(latitude / WEATHER_COORD_BUCKET_SIZE_DEGREES) *
      WEATHER_COORD_BUCKET_SIZE_DEGREES,
  );
  const bucketLongitude = normalizeBucketNumber(
    Math.round(longitude / WEATHER_COORD_BUCKET_SIZE_DEGREES) *
      WEATHER_COORD_BUCKET_SIZE_DEGREES,
  );

  return {
    latitude: bucketLatitude,
    longitude: bucketLongitude,
    key: `v1:${formatBucketNumber(bucketLatitude)}:${formatBucketNumber(
      bucketLongitude,
    )}:d${WEATHER_COORD_BUCKET_SIZE_DEGREES.toFixed(2)}`,
    sizeDegrees: WEATHER_COORD_BUCKET_SIZE_DEGREES,
  };
}

export function normalizeWeatherRequestBody(rawBody) {
  const body =
    rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)
      ? rawBody
      : {};
  const coordBucket = createCoordBucket({
    latitude: body.latitude,
    longitude: body.longitude,
  });
  const locale = normalizeString(body.locale) ?? WEATHER_DEFAULT_LOCALE;
  const timezone = normalizeString(body.timezone) ?? WEATHER_DEFAULT_TIMEZONE;

  return {
    coordBucket,
    locale,
    timezone,
    cacheLocale: `${locale}|${timezone}`,
  };
}

export function buildWeatherCacheTimes(now = new Date()) {
  const fetchedAt = new Date(now);
  return {
    fetchedAt: fetchedAt.toISOString(),
    expiresAt: new Date(fetchedAt.getTime() + WEATHER_FRESH_TTL_MS).toISOString(),
    staleUntil: new Date(
      fetchedAt.getTime() + WEATHER_STALE_TTL_MS,
    ).toISOString(),
  };
}

function readTime(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function isFreshCacheRow(row, now = new Date()) {
  const expiresAt = readTime(row?.expires_at);
  return expiresAt !== null && expiresAt > now.getTime();
}

export function isStaleCacheRow(row, now = new Date()) {
  const staleUntil = readTime(row?.stale_until);
  return staleUntil !== null && staleUntil > now.getTime();
}

function getCombinedPayloadWithAttribution(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      forecast: {},
      airQuality: null,
      attribution: OPEN_METEO_ATTRIBUTION,
    };
  }

  return {
    ...payload,
    attribution:
      payload.attribution &&
      typeof payload.attribution === 'object' &&
      !Array.isArray(payload.attribution)
        ? payload.attribution
        : OPEN_METEO_ATTRIBUTION,
  };
}

function buildSuccessResponseFromRow(row, source, extra = {}) {
  const data = getCombinedPayloadWithAttribution(row?.combined_payload);

  return {
    ok: true,
    data,
    source,
    fetchedAt: row?.fetched_at,
    expiresAt: row?.expires_at,
    staleUntil: row?.stale_until,
    coordBucket: row?.coord_bucket,
    attribution: data.attribution,
    ...extra,
  };
}

export function buildProviderMode(value) {
  const normalized = normalizeString(value)?.toLowerCase();
  return normalized === 'customer' ? 'customer' : 'free';
}

export function buildOpenMeteoUrl(input) {
  const baseUrl = normalizeString(input.baseUrl);
  if (!baseUrl) {
    throw new WeatherCacheHttpError(
      500,
      'weather_provider_unconfigured',
      'weather provider base url is not configured',
    );
  }

  const url = new URL(baseUrl);
  url.searchParams.set('latitude', formatBucketNumber(input.coordBucket.latitude));
  url.searchParams.set(
    'longitude',
    formatBucketNumber(input.coordBucket.longitude),
  );
  url.searchParams.set('timezone', input.timezone);

  if (input.kind === 'forecast') {
    url.searchParams.set(
      'current',
      [
        'temperature_2m',
        'apparent_temperature',
        'weather_code',
        'relative_humidity_2m',
        'wind_speed_10m',
        'cloud_cover',
      ].join(','),
    );
    url.searchParams.set(
      'daily',
      [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'sunrise',
        'sunset',
        'uv_index_max',
        'precipitation_probability_max',
      ].join(','),
    );
    url.searchParams.set('forecast_days', '7');
  } else {
    url.searchParams.set('current', 'pm10,pm2_5,ozone');
  }

  if (buildProviderMode(input.providerMode) === 'customer') {
    const apiKey = normalizeString(input.apiKey);
    if (!apiKey) {
      throw new WeatherCacheHttpError(
        500,
        'weather_provider_unconfigured',
        'weather provider api key is required in customer mode',
      );
    }
    url.searchParams.set('apikey', apiKey);
  }

  return url;
}

export function buildCombinedWeatherPayload(input) {
  return {
    forecast: input.forecast,
    airQuality: input.airQuality,
    provider: WEATHER_PROVIDER,
    coordBucket: input.coordBucket.key,
    coordBucketSizeDegrees: input.coordBucket.sizeDegrees,
    timezone: input.timezone,
    attribution: OPEN_METEO_ATTRIBUTION,
  };
}

export async function resolveWeatherCache(input) {
  const now = input.now ?? new Date();
  const request = normalizeWeatherRequestBody(input.body);
  const cachedRow = await input.cache.find({
    coordBucket: request.coordBucket.key,
    locale: request.cacheLocale,
    provider: WEATHER_PROVIDER,
  });

  if (cachedRow && isFreshCacheRow(cachedRow, now)) {
    return buildSuccessResponseFromRow(cachedRow, 'fresh_cache');
  }

  const staleRow =
    cachedRow && isStaleCacheRow(cachedRow, now) ? cachedRow : null;

  try {
    const providerBundle = await input.provider.fetchBundle(request);
    const times = buildWeatherCacheTimes(now);
    const combinedPayload = buildCombinedWeatherPayload({
      airQuality: providerBundle.airQuality,
      coordBucket: request.coordBucket,
      forecast: providerBundle.forecast,
      timezone: request.timezone,
    });
    const row = await input.cache.upsert({
      airQualityPayload: providerBundle.airQuality,
      combinedPayload,
      coordBucket: request.coordBucket.key,
      expiresAt: times.expiresAt,
      fetchedAt: times.fetchedAt,
      forecastPayload: providerBundle.forecast,
      locale: request.cacheLocale,
      provider: WEATHER_PROVIDER,
      staleUntil: times.staleUntil,
    });

    return buildSuccessResponseFromRow(row, 'provider', {
      warning: providerBundle.warning ?? undefined,
    });
  } catch (error) {
    if (staleRow) {
      const code =
        error instanceof WeatherCacheHttpError
          ? error.code
          : 'weather_provider_unavailable';
      return buildSuccessResponseFromRow(staleRow, 'stale_cache', {
        fallbackReason: code,
        warning: 'provider_unavailable',
      });
    }

    if (error instanceof WeatherCacheHttpError) {
      throw error;
    }

    throw new WeatherCacheHttpError(
      503,
      'weather_provider_unavailable',
      'weather provider is unavailable',
    );
  }
}
