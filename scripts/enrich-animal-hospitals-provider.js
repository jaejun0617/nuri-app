#!/usr/bin/env node
/* eslint-env node */
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

require.extensions['.ts'] = function loadTypeScript(module, filename) {
  const source = fsSync.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  }).outputText;

  module._compile(output, filename);
};

const { SUPABASE_URL } = require('../src/services/supabase/config');
const {
  GOOGLE_MAPS_ANDROID_API_KEY,
  KAKAO_REST_API_KEY,
} = require('../src/config/runtime');
const {
  normalizeAnimalHospitalAddress,
  normalizeAnimalHospitalName,
  normalizeAnimalHospitalPhone,
} = require('../src/services/animalHospital/normalization');

const GOOGLE_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const GOOGLE_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.googleMapsUri',
  'places.websiteUri',
  'places.businessStatus',
  'places.regularOpeningHours',
  'places.photos',
].join(',');
const GOOGLE_PHOTO_WIDTH = 640;
const DEFAULT_LIMIT = 50;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_DELAY_MS = 150;

function printHelp() {
  console.log(`Usage:
  node scripts/enrich-animal-hospitals-provider.js --dry-run --input docs/qa/animal-hospital-provider-enrichment-smoke-2026-04-23.json --report-output docs/qa/animal-hospital-provider-enrichment-2026-04-23.md
  SUPABASE_SERVICE_ROLE_KEY=... GOOGLE_PLACES_API_KEY=... node scripts/enrich-animal-hospitals-provider.js --dry-run --limit 200 --provider google
  SUPABASE_SERVICE_ROLE_KEY=... GOOGLE_PLACES_API_KEY=... node scripts/enrich-animal-hospitals-provider.js --apply --limit 200 --provider google

Options:
  --provider <google|kakao|fixture>  Provider to use. Default: google
  --input <path>                     Optional JSON hospitals[] fixture/input
  --dry-run                          Collect and report candidates without remote writes
  --apply                            Insert verification candidates and operator action logs
  --limit <number>                   Max canonical hospitals to process. Default: 50
  --offset <number>                  Remote offset. Default: 0
  --batch-size <number>              Batch size between delay pauses. Default: 10
  --delay-ms <number>                Delay between provider requests. Default: 150
  --cache-dir <path>                 Optional provider response cache directory
  --report-output <path>             Markdown report output path
  --json-output <path>               JSON report output path
`);
}

function parseArgs(argv) {
  const args = {
    apply: false,
    batchSize: DEFAULT_BATCH_SIZE,
    cacheDir: null,
    delayMs: DEFAULT_DELAY_MS,
    dryRun: false,
    help: false,
    input: null,
    jsonOutput: null,
    limit: DEFAULT_LIMIT,
    offset: 0,
    provider: 'google',
    reportOutput: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }

    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (token === '--apply') {
      args.apply = true;
      continue;
    }

    if (token === '--provider') {
      if (!['google', 'kakao', 'fixture'].includes(next)) {
        throw new Error('--provider must be google, kakao, or fixture');
      }
      args.provider = next;
      index += 1;
      continue;
    }

    if (token === '--input') {
      args.input = next;
      index += 1;
      continue;
    }

    if (token === '--cache-dir') {
      args.cacheDir = next;
      index += 1;
      continue;
    }

    if (token === '--report-output') {
      args.reportOutput = next;
      index += 1;
      continue;
    }

    if (token === '--json-output') {
      args.jsonOutput = next;
      index += 1;
      continue;
    }

    if (token === '--limit') {
      args.limit = parsePositiveInteger(next, '--limit');
      index += 1;
      continue;
    }

    if (token === '--offset') {
      args.offset = parseNonNegativeInteger(next, '--offset');
      index += 1;
      continue;
    }

    if (token === '--batch-size') {
      args.batchSize = parsePositiveInteger(next, '--batch-size');
      index += 1;
      continue;
    }

    if (token === '--delay-ms') {
      args.delayMs = parseNonNegativeInteger(next, '--delay-ms');
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (args.apply === args.dryRun && !args.help) {
    throw new Error('Choose exactly one of --dry-run or --apply');
  }

  if (!args.reportOutput && !args.jsonOutput && !args.help) {
    throw new Error('Provide --report-output, --json-output, or both');
  }

  return args;
}

function parsePositiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function parseNonNegativeInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return parsed;
}

function createSupabaseServiceClient() {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NURI_SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY or NURI_SUPABASE_SERVICE_ROLE_KEY is required for remote fetch/apply',
    );
  }

  return createClient(SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getGoogleApiKey() {
  return (
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    GOOGLE_MAPS_ANDROID_API_KEY ||
    ''
  ).trim();
}

function getKakaoApiKey() {
  return (process.env.KAKAO_REST_API_KEY || KAKAO_REST_API_KEY || '').trim();
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeKrPhone(value) {
  const normalized = normalizeAnimalHospitalPhone(value);
  if (!normalized) {
    return null;
  }

  let digits = normalized.replace(/^\+82/, '0').replace(/[^0-9]/g, '');
  if (digits.startsWith('82')) {
    digits = `0${digits.slice(2)}`;
  }

  if (digits.length < 8 || digits.length > 11) {
    return null;
  }

  if (!digits.startsWith('0')) {
    return null;
  }

  return digits;
}

function distanceMeters(left, right) {
  if (!left || !right) return null;
  const toRadians = degrees => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;
  const latDiff = toRadians(right.latitude - left.latitude);
  const lngDiff = toRadians(right.longitude - left.longitude);
  const leftLat = toRadians(left.latitude);
  const rightLat = toRadians(right.latitude);
  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(lngDiff / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getHospitalCoordinates(hospital) {
  const latitude = readNumber(hospital.latitude);
  const longitude = readNumber(hospital.longitude);
  return latitude !== null && longitude !== null ? { latitude, longitude } : null;
}

function hashValue(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function getCachePath(cacheDir, provider, hospitalId) {
  if (!cacheDir) return null;
  const safeId = hospitalId.replace(/[^0-9a-z_-]/gi, '_');
  return path.resolve(cacheDir, `${provider}-${safeId}.json`);
}

async function readCache(cachePath) {
  if (!cachePath) return null;
  try {
    const raw = await fs.readFile(cachePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeCache(cachePath, payload) {
  if (!cachePath) return;
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(payload, null, 2).concat('\n'), 'utf8');
}

async function delay(ms) {
  if (ms <= 0) return;
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function loadInputHospitals(inputPath) {
  const raw = await fs.readFile(path.resolve(inputPath), 'utf8');
  const parsed = JSON.parse(raw);
  const hospitals = Array.isArray(parsed) ? parsed : parsed.hospitals;
  if (!Array.isArray(hospitals)) {
    throw new Error('input JSON must be an array or contain hospitals[]');
  }
  return hospitals.map((hospital, index) => {
    const id = normalizeString(hospital.id || hospital.canonical_id);
    const name = normalizeString(hospital.name || hospital.canonical_name);
    const address = normalizeString(hospital.address || hospital.primary_address);
    if (!id || !name || !address) {
      throw new Error(`hospitals[${index}] requires id/name/address`);
    }
    return {
      id,
      name,
      address,
      latitude: readNumber(hospital.latitude),
      longitude: readNumber(hospital.longitude),
      normalizedPhone: normalizeKrPhone(hospital.normalized_phone || hospital.phone),
      providerFixture: hospital.providerFixture || hospital.provider_fixture || null,
    };
  });
}

async function fetchRemoteHospitals(client, args) {
  const { data, error } = await client
    .from('animal_hospitals')
    .select(
      'id, canonical_name, primary_address, latitude, longitude, normalized_phone',
    )
    .eq('is_active', true)
    .eq('is_hidden', false)
    .order('canonical_updated_at', { ascending: false })
    .range(args.offset, args.offset + args.limit - 1);

  if (error) {
    throw new Error(`remote hospital fetch failed: ${error.message}`);
  }

  return (data || []).map(row => ({
    id: row.id,
    name: row.canonical_name,
    address: row.primary_address,
    latitude: readNumber(row.latitude),
    longitude: readNumber(row.longitude),
    normalizedPhone: normalizeKrPhone(row.normalized_phone),
    providerFixture: null,
  }));
}

function buildGoogleSearchBody(hospital) {
  const coordinates = getHospitalCoordinates(hospital);
  const body = {
    textQuery: `${hospital.name} ${hospital.address}`.trim(),
    languageCode: 'ko',
    regionCode: 'KR',
    maxResultCount: 5,
  };

  if (coordinates) {
    body.locationBias = {
      circle: {
        center: coordinates,
        radius: 800,
      },
    };
  }

  return body;
}

function scoreProviderPlace(hospital, place) {
  const hospitalName = normalizeAnimalHospitalName(hospital.name);
  const placeName = normalizeAnimalHospitalName(
    place.displayName?.text || place.place_name,
  );
  const hospitalAddress = normalizeAnimalHospitalAddress(hospital.address);
  const placeAddress = normalizeAnimalHospitalAddress(
    place.formattedAddress ||
      place.road_address_name ||
      place.address_name ||
      '',
  );
  const exactName = Boolean(hospitalName && placeName && hospitalName === placeName);
  const exactAddress = Boolean(
    hospitalAddress && placeAddress && hospitalAddress === placeAddress,
  );
  const hospitalCoordinates = getHospitalCoordinates(hospital);
  const placeCoordinates =
    typeof place.location?.latitude === 'number' &&
    typeof place.location?.longitude === 'number'
      ? {
          latitude: place.location.latitude,
          longitude: place.location.longitude,
        }
      : typeof place.y === 'string' && typeof place.x === 'string'
        ? {
            latitude: Number(place.y),
            longitude: Number(place.x),
          }
        : null;
  const distance = distanceMeters(hospitalCoordinates, placeCoordinates);
  const near = distance !== null && distance <= 120;

  return {
    score:
      (exactName ? 60 : 0) +
      (exactAddress ? 35 : 0) +
      (near ? 20 : 0) +
      (place.nationalPhoneNumber || place.phone ? 5 : 0) +
      ((place.photos?.length ?? 0) > 0 ? 3 : 0),
    exactName,
    exactAddress,
    near,
    distance,
  };
}

async function fetchGooglePlace(hospital, cacheDir) {
  const cachePath = getCachePath(cacheDir, 'google', hospital.id);
  const cached = await readCache(cachePath);
  if (cached) return cached;

  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY or GOOGLE_MAPS_API_KEY is required');
  }

  const response = await fetch(GOOGLE_TEXT_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': GOOGLE_FIELD_MASK,
    },
    body: JSON.stringify(buildGoogleSearchBody(hospital)),
  });

  if (!response.ok) {
    throw new Error(`Google Places search failed: ${response.status}`);
  }

  const json = await response.json();
  const places = Array.isArray(json.places) ? json.places : [];
  const best = [...places]
    .map(place => ({
      place,
      match: scoreProviderPlace(hospital, place),
    }))
    .sort((left, right) => right.match.score - left.match.score)[0] || null;
  const payload = {
    provider: 'google-place',
    raw: json,
    bestPlace: best?.place ?? null,
    match: best?.match ?? null,
  };

  await writeCache(cachePath, payload);
  return payload;
}

async function fetchKakaoPlace(hospital, cacheDir) {
  const cachePath = getCachePath(cacheDir, 'kakao', hospital.id);
  const cached = await readCache(cachePath);
  if (cached) return cached;

  const apiKey = getKakaoApiKey();
  if (!apiKey) {
    throw new Error('KAKAO_REST_API_KEY is required');
  }

  const params = new URLSearchParams();
  params.set('query', `${hospital.name} ${hospital.address}`.trim());
  params.set('size', '10');
  const coordinates = getHospitalCoordinates(hospital);
  if (coordinates) {
    params.set('x', String(coordinates.longitude));
    params.set('y', String(coordinates.latitude));
    params.set('radius', '1000');
    params.set('sort', 'distance');
  }

  const response = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`,
    {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
    },
  );
  if (!response.ok) {
    throw new Error(`Kakao keyword search failed: ${response.status}`);
  }

  const json = await response.json();
  const documents = Array.isArray(json.documents) ? json.documents : [];
  const best = [...documents]
    .map(place => ({
      place,
      match: scoreProviderPlace(hospital, place),
    }))
    .sort((left, right) => right.match.score - left.match.score)[0] || null;
  const payload = {
    provider: 'kakao-place',
    raw: json,
    bestPlace: best?.place ?? null,
    match: best?.match ?? null,
  };

  await writeCache(cachePath, payload);
  return payload;
}

function getFixturePlace(hospital) {
  if (!hospital.providerFixture) {
    return {
      provider: 'fixture',
      raw: {},
      bestPlace: null,
      match: null,
    };
  }

  const bestPlace = hospital.providerFixture.bestPlace || hospital.providerFixture;
  return {
    provider: hospital.providerFixture.provider || 'fixture',
    raw: hospital.providerFixture,
    bestPlace,
    match: scoreProviderPlace(hospital, bestPlace),
  };
}

async function fetchProviderPlace(hospital, args) {
  if (args.provider === 'fixture') {
    return getFixturePlace(hospital);
  }

  if (args.provider === 'kakao') {
    return fetchKakaoPlace(hospital, args.cacheDir);
  }

  return fetchGooglePlace(hospital, args.cacheDir);
}

async function fetchGooglePhotoUri(photoName) {
  const apiKey = getGoogleApiKey();
  if (!apiKey || !photoName) {
    return null;
  }

  const params = new URLSearchParams({
    maxWidthPx: String(GOOGLE_PHOTO_WIDTH),
    skipHttpRedirect: 'true',
    key: apiKey,
  });
  const response = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?${params.toString()}`,
  );
  if (!response.ok) {
    return null;
  }
  const json = await response.json();
  return typeof json.photoUri === 'string' ? json.photoUri : null;
}

function inferOpen24Hours(place) {
  const descriptions = place.regularOpeningHours?.weekdayDescriptions;
  if (!Array.isArray(descriptions) || descriptions.length < 7) {
    return null;
  }

  const allDaysExplicit24 = descriptions.every(description => {
    const text = String(description).toLowerCase();
    return text.includes('24시간') || text.includes('24 hours');
  });

  return allDaysExplicit24 ? true : null;
}

function buildPhoneCandidate(hospital, providerPayload) {
  const place = providerPayload.bestPlace;
  if (!place) return null;
  const rawPhone =
    place.nationalPhoneNumber ||
    place.internationalPhoneNumber ||
    place.phone ||
    null;
  const phone = normalizeKrPhone(rawPhone);
  if (!phone) {
    return null;
  }

  if (hospital.normalizedPhone && hospital.normalizedPhone === phone) {
    return null;
  }

  return {
    fieldKey: 'phone',
    status: providerPayload.match?.score >= 90 ? 'pending' : 'held',
    verifiedValue: { phone },
    reason:
      providerPayload.match?.score >= 90
        ? 'provider detail phone candidate'
        : 'provider match needs manual confirmation',
  };
}

function buildCoordinateCandidate(hospital, providerPayload) {
  const place = providerPayload.bestPlace;
  if (!place) return null;
  const latitude =
    readNumber(place.location?.latitude) ?? readNumber(place.y);
  const longitude =
    readNumber(place.location?.longitude) ?? readNumber(place.x);
  if (latitude === null || longitude === null) {
    return null;
  }

  const offsetMeters = distanceMeters(getHospitalCoordinates(hospital), {
    latitude,
    longitude,
  });
  const status =
    offsetMeters === null || offsetMeters <= 120 ? 'pending' : 'held';

  return {
    fieldKey: 'coordinates',
    status,
    verifiedValue: { latitude, longitude },
    reason:
      status === 'pending'
        ? 'provider detail coordinates candidate'
        : 'coordinate offset needs manual confirmation',
    offsetMeters,
  };
}

async function buildThumbnailCandidates(hospital, providerPayload) {
  const place = providerPayload.bestPlace;
  if (!place || !Array.isArray(place.photos) || place.photos.length === 0) {
    return [];
  }

  const candidates = [];
  for (const photo of place.photos.slice(0, 3)) {
    const photoName = normalizeString(photo.name);
    if (!photoName) continue;
    const photoUri =
      typeof photo.photoUri === 'string'
        ? photo.photoUri
        : await fetchGooglePhotoUri(photoName);
    candidates.push({
      fieldKey: 'thumbnail',
      status: 'held',
      verifiedValue: {
        thumbnailUrl: photoUri,
        providerPhotoName: photoName,
      },
      reason:
        'provider photo requires ownership and representativeness review before public use',
      photoName,
      widthPx: readNumber(photo.widthPx),
      heightPx: readNumber(photo.heightPx),
    });
  }

  return candidates;
}

function buildOpen24Candidate(providerPayload) {
  const place = providerPayload.bestPlace;
  if (!place) return null;
  const open24Hours = inferOpen24Hours(place);
  if (open24Hours !== true) {
    return null;
  }

  return {
    fieldKey: 'open24Hours',
    status: 'pending',
    verifiedValue: { open24Hours: true },
    reason: 'provider detail explicitly reports 24 hour opening across all days',
  };
}

async function buildVerificationCandidates(hospital, providerPayload) {
  if (!providerPayload.bestPlace || !providerPayload.match) {
    return [];
  }

  const candidates = [
    buildPhoneCandidate(hospital, providerPayload),
    buildCoordinateCandidate(hospital, providerPayload),
    buildOpen24Candidate(providerPayload),
    ...(await buildThumbnailCandidates(hospital, providerPayload)),
  ].filter(Boolean);

  return candidates.map(candidate => ({
    ...candidate,
    animalHospitalId: hospital.id,
    verificationSource: 'provider-crosscheck',
    evidence: {
      provider: providerPayload.provider,
      providerPlaceId:
        providerPayload.bestPlace.id || providerPayload.bestPlace.place_id || null,
      providerPlaceUrl:
        providerPayload.bestPlace.googleMapsUri ||
        providerPayload.bestPlace.place_url ||
        null,
      providerWebsiteUri: providerPayload.bestPlace.websiteUri || null,
      match: providerPayload.match,
      reason: candidate.reason,
      sourceHash: hashValue(providerPayload.bestPlace),
      fetchedAt: new Date().toISOString(),
    },
  }));
}

async function getOperatorId(client) {
  const { data, error } = await client
    .from('profiles')
    .select('user_id')
    .in('role', ['admin', 'super_admin'])
    .order('role', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data && typeof data.user_id === 'string' ? data.user_id : null;
}

async function applyCandidate(client, operatorId, candidate) {
  const { data, error } = await client
    .from('animal_hospital_verifications')
    .insert({
      animal_hospital_id: candidate.animalHospitalId,
      field_key: candidate.fieldKey,
      status: candidate.status,
      verified_value: candidate.verifiedValue,
      verification_source: candidate.verificationSource,
      reviewer_id: null,
      reviewed_at: null,
      note: candidate.reason,
      evidence: candidate.evidence,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  const verificationId = data && typeof data.id === 'string' ? data.id : null;
  if (!verificationId) {
    throw new Error('verification id was not returned');
  }

  await client.from('animal_hospital_operator_action_log').insert({
    animal_hospital_id: candidate.animalHospitalId,
    actor_id: operatorId,
    action_type: 'provider_enrichment_candidate_created',
    target_table: 'animal_hospital_verifications',
    target_id: verificationId,
    summary: 'Provider enrichment 후보를 검수 queue에 적재했어요.',
    payload: {
      fieldKey: candidate.fieldKey,
      status: candidate.status,
      reason: candidate.reason,
      provider: candidate.evidence.provider,
    },
  });

  return verificationId;
}

function summarizeResults(results) {
  const candidates = results.flatMap(result => result.candidates);
  const byField = new Map();
  const byStatus = new Map();
  for (const candidate of candidates) {
    byField.set(candidate.fieldKey, (byField.get(candidate.fieldKey) || 0) + 1);
    byStatus.set(candidate.status, (byStatus.get(candidate.status) || 0) + 1);
  }

  return {
    hospitalsProcessed: results.length,
    providerMatched: results.filter(result => result.providerMatched).length,
    failedHospitals: results.filter(result => result.error).length,
    totalCandidates: candidates.length,
    byField: Object.fromEntries(byField),
    byStatus: Object.fromEntries(byStatus),
  };
}

function buildMarkdownReport(report) {
  const summary = report.summary;
  const lines = [
    '# AnimalHospital Provider Enrichment Report',
    '',
    `- generated_at: ${report.generatedAt}`,
    `- mode: ${report.mode}`,
    `- provider: ${report.provider}`,
    `- hospitals_processed: ${summary.hospitalsProcessed}`,
    `- provider_matched: ${summary.providerMatched}`,
    `- failed_hospitals: ${summary.failedHospitals}`,
    `- total_candidates: ${summary.totalCandidates}`,
    `- by_field: ${JSON.stringify(summary.byField)}`,
    `- by_status: ${JSON.stringify(summary.byStatus)}`,
    '',
    '## Results',
    '',
    '| hospital | provider matched | candidates | error |',
    '| --- | --- | --- | --- |',
    ...report.results.map(result => {
      const candidateLabel = result.candidates
        .map(candidate => `${candidate.fieldKey}:${candidate.status}`)
        .join(', ');
      return `| ${result.hospitalId} | ${result.providerMatched ? 'yes' : 'no'} | ${candidateLabel || '-'} | ${result.error || '-'} |`;
    }),
    '',
    '## Operational Notes',
    '',
    '- Provider phone/coordinates/photo/open24Hours values are candidates only.',
    '- Public projection still requires approved verification.',
    '- Provider photos are inserted as held unless an operator confirms representative ownership/source safety.',
    '',
  ];

  return lines.join('\n');
}

async function writeOutput(filePath, content) {
  if (!filePath) return;
  const absolutePath = path.resolve(filePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const client = args.input ? null : createSupabaseServiceClient();
  const applyClient = args.apply ? createSupabaseServiceClient() : null;
  const operatorId = applyClient ? await getOperatorId(applyClient) : null;
  const hospitals = args.input
    ? await loadInputHospitals(args.input)
    : await fetchRemoteHospitals(client, args);
  const results = [];

  for (const [index, hospital] of hospitals.entries()) {
    try {
      if (index > 0 && index % args.batchSize === 0) {
        await delay(args.delayMs);
      }

      const providerPayload = await fetchProviderPlace(hospital, args);
      const candidates = await buildVerificationCandidates(
        hospital,
        providerPayload,
      );
      const appliedCandidates = [];

      if (applyClient) {
        for (const candidate of candidates) {
          const verificationId = await applyCandidate(
            applyClient,
            operatorId,
            candidate,
          );
          appliedCandidates.push({ ...candidate, verificationId });
        }
      }

      results.push({
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        providerMatched: Boolean(providerPayload.bestPlace),
        match: providerPayload.match,
        candidates: applyClient ? appliedCandidates : candidates,
        error: null,
      });
    } catch (error) {
      results.push({
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        providerMatched: false,
        match: null,
        candidates: [],
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: args.apply ? 'apply' : 'dry-run',
    provider: args.provider,
    summary: summarizeResults(results),
    results,
  };

  await writeOutput(args.reportOutput, buildMarkdownReport(report));
  await writeOutput(
    args.jsonOutput,
    JSON.stringify(report, null, 2).concat('\n'),
  );

  console.log(JSON.stringify(report, null, 2));

  if (report.summary.failedHospitals > 0) {
    process.exitCode = 2;
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
