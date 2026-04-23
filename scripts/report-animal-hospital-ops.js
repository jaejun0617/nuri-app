#!/usr/bin/env node
/* eslint-env node */
'use strict';

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
      jsx: ts.JsxEmit.ReactJSX,
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
  KAKAO_REST_API_KEY,
} = require('../src/config/runtime');
const {
  normalizeAnimalHospitalAddress,
  normalizeAnimalHospitalName,
} = require('../src/services/animalHospital/normalization');

const DEFAULT_QUERY = '동물병원';
const DEFAULT_COORDINATES = {
  latitude: 37.5172363,
  longitude: 127.0473248,
};
const DEFAULT_RADIUS_METERS = 3000;

function buildKakaoKeywordSearchUrl(input) {
  const params = new URLSearchParams();
  params.set('query', input.query);
  params.set('size', '15');
  params.set('x', String(input.longitude));
  params.set('y', String(input.latitude));
  params.set('radius', String(DEFAULT_RADIUS_METERS));
  params.set('sort', 'distance');
  return `https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`;
}

function printHelp() {
  console.log(`Usage:
  SUPABASE_SERVICE_ROLE_KEY=... node scripts/report-animal-hospital-ops.js --output docs/qa/animal-hospital-ops-report.md

Options:
  --output <path>             Markdown report output path
  --json-output <path>        JSON report output path
  --query <text>              Runtime provider keyword. Default: 동물병원
  --lat <number>              Runtime search latitude. Default: Gangnam-gu office
  --lng <number>              Runtime search longitude. Default: Gangnam-gu office
  --skip-runtime              Skip Kakao runtime provider query
`);
}

function parseArgs(argv) {
  const args = {
    help: false,
    jsonOutput: null,
    output: null,
    query: DEFAULT_QUERY,
    latitude: DEFAULT_COORDINATES.latitude,
    longitude: DEFAULT_COORDINATES.longitude,
    skipRuntime: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }

    if (token === '--output') {
      args.output = next;
      index += 1;
      continue;
    }

    if (token === '--json-output') {
      args.jsonOutput = next;
      index += 1;
      continue;
    }

    if (token === '--query') {
      args.query = next;
      index += 1;
      continue;
    }

    if (token === '--lat') {
      args.latitude = Number(next);
      if (!Number.isFinite(args.latitude)) {
        throw new Error('--lat must be a finite number');
      }
      index += 1;
      continue;
    }

    if (token === '--lng') {
      args.longitude = Number(next);
      if (!Number.isFinite(args.longitude)) {
        throw new Error('--lng must be a finite number');
      }
      index += 1;
      continue;
    }

    if (token === '--skip-runtime') {
      args.skipRuntime = true;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (!args.output && !args.jsonOutput && !args.help) {
    throw new Error('Provide --output, --json-output, or both');
  }

  return args;
}

function createSupabaseServiceClient() {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NURI_SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY or NURI_SUPABASE_SERVICE_ROLE_KEY is required',
    );
  }

  return createClient(SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 4,
  }).format(value ?? 0);
}

async function fetchOpsSummary(client) {
  const { data, error } = await client.rpc('animal_hospital_ops_summary');
  if (error) {
    throw new Error(`animal_hospital_ops_summary failed: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error('animal_hospital_ops_summary returned no rows');
  }

  return {
    totalCanonical: Number(row.total_canonical ?? 0),
    sourceRows: Number(row.source_rows ?? 0),
    publicVisible: Number(row.public_visible ?? 0),
    activeNotHidden: Number(row.active_not_hidden ?? 0),
    sourceUnlinkedRows: Number(row.source_unlinked_rows ?? 0),
    canonicalDriftSuspected: Number(row.canonical_drift_suspected ?? 0),
    pendingPhone: Number(row.pending_phone ?? 0),
    pendingCoordinates: Number(row.pending_coordinates ?? 0),
    pendingThumbnail: Number(row.pending_thumbnail ?? 0),
    pendingOpen24Hours: Number(row.pending_open24_hours ?? 0),
    pendingExoticAnimalCare: Number(row.pending_exotic_animal_care ?? 0),
    providerOnlyCandidates: Number(row.provider_only_candidates ?? 0),
    canonicalLinked: Number(row.canonical_linked ?? 0),
    hiddenCount: Number(row.hidden_count ?? 0),
    inactiveCount: Number(row.inactive_count ?? 0),
    approvedPhoneCoverage: Number(row.approved_phone_coverage ?? 0),
    approvedCoordinatesCoverage: Number(
      row.approved_coordinates_coverage ?? 0,
    ),
    approvedThumbnailCoverage: Number(row.approved_thumbnail_coverage ?? 0),
    approvedOpen24HoursCoverage: Number(
      row.approved_open24_hours_coverage ?? 0,
    ),
    approvedExoticAnimalCareCoverage: Number(
      row.approved_exotic_animal_care_coverage ?? 0,
    ),
    latestRuntimeSnapshotAt: row.latest_runtime_snapshot_at ?? null,
  };
}

async function runRuntimeSnapshot(params) {
  if (!KAKAO_REST_API_KEY) {
    throw new Error('KAKAO_REST_API_KEY is required for runtime summary');
  }

  const response = await fetch(
    buildKakaoKeywordSearchUrl({
      query: params.query,
      latitude: params.latitude,
      longitude: params.longitude,
    }),
    {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Kakao runtime search failed: ${response.status}`);
  }

  const payload = await response.json();
  const documents = Array.isArray(payload.documents) ? payload.documents : [];
  const latDelta = DEFAULT_RADIUS_METERS / 111000;
  const lngDelta =
    DEFAULT_RADIUS_METERS /
    (111000 * Math.max(Math.cos((params.latitude * Math.PI) / 180), 0.2));
  const { data, error } = await params.client
    .from('animal_hospitals')
    .select(
      'id,canonical_name,normalized_name,primary_address,normalized_primary_address,latitude,longitude',
    )
    .eq('is_active', true)
    .eq('is_hidden', false)
    .gte('latitude', params.latitude - latDelta)
    .lte('latitude', params.latitude + latDelta)
    .gte('longitude', params.longitude - lngDelta)
    .lte('longitude', params.longitude + lngDelta)
    .limit(80);

  if (error) {
    throw new Error(`canonical runtime query failed: ${error.message}`);
  }

  const canonicalRows = data || [];
  const linkedCanonicalIds = new Set();
  let matchCount = 0;

  documents.forEach(document => {
    const documentName = normalizeAnimalHospitalName(document.place_name);
    const documentAddress = normalizeAnimalHospitalAddress(
      document.road_address_name || document.address_name,
    );
    const match = canonicalRows.find(row => {
      const rowName = normalizeAnimalHospitalName(
        row.canonical_name || row.normalized_name,
      );
      const rowAddress = normalizeAnimalHospitalAddress(
        row.primary_address || row.normalized_primary_address,
      );

      if (!documentName || rowName !== documentName) {
        return false;
      }

      return (
        documentAddress !== null &&
        rowAddress !== null &&
        rowAddress === documentAddress
      );
    });

    if (match) {
      matchCount += 1;
      linkedCanonicalIds.add(match.id);
    }
  });

  const createdAt = new Date().toISOString();
  const runtimeCandidateCount = documents.length;
  const canonicalLinkedCount = linkedCanonicalIds.size;
  const providerOnlyCount = Math.max(
    0,
    runtimeCandidateCount - canonicalLinkedCount,
  );
  const denominator = Math.max(1, runtimeCandidateCount);
  const summary = {
    snapshotKey: `animal-hospital-runtime:${createdAt}`,
    query: params.query,
    createdAt,
    runtimeCandidateCount,
    canonicalResultCount: canonicalRows.length,
    canonicalLinkedCount,
    providerOnlyCount,
    deferredCount: 0,
    matchCount,
    providerOnlyRatio: providerOnlyCount / denominator,
    canonicalLinkedRatio: canonicalLinkedCount / denominator,
  };
  const { error: insertError } = await params.client
    .from('animal_hospital_runtime_match_snapshots')
    .insert({
      snapshot_key: summary.snapshotKey,
      query: summary.query,
      anchor_latitude: params.latitude,
      anchor_longitude: params.longitude,
      runtime_candidate_count: summary.runtimeCandidateCount,
      canonical_result_count: summary.canonicalResultCount,
      canonical_linked_count: summary.canonicalLinkedCount,
      provider_only_count: summary.providerOnlyCount,
      deferred_count: summary.deferredCount,
      match_count: summary.matchCount,
      provider_only_ratio: summary.providerOnlyRatio,
      canonical_linked_ratio: summary.canonicalLinkedRatio,
      summary: {
        query: summary.query,
        createdAt: summary.createdAt,
      },
    });

  if (insertError) {
    throw new Error(`runtime snapshot insert failed: ${insertError.message}`);
  }

  return summary;
}

function buildMarkdownReport(report) {
  const runtime = report.runtimeSummary;
  return [
    '# AnimalHospital Ops Summary',
    '',
    `- generated_at: ${report.generatedAt}`,
    `- query: ${report.runtimeQuery}`,
    `- coordinates: ${report.coordinates.latitude}, ${report.coordinates.longitude}`,
    '',
    '## Canonical / Source / Public Drift',
    '',
    `- source_rows: ${formatNumber(report.opsSummary.sourceRows)}`,
    `- canonical_rows: ${formatNumber(report.opsSummary.totalCanonical)}`,
    `- public_visible_rows: ${formatNumber(report.opsSummary.publicVisible)}`,
    `- active_not_hidden_rows: ${formatNumber(report.opsSummary.activeNotHidden)}`,
    `- source_unlinked_rows: ${formatNumber(report.opsSummary.sourceUnlinkedRows)}`,
    `- canonical_drift_suspected_rows: ${formatNumber(report.opsSummary.canonicalDriftSuspected)}`,
    `- hidden_rows: ${formatNumber(report.opsSummary.hiddenCount)}`,
    `- inactive_rows: ${formatNumber(report.opsSummary.inactiveCount)}`,
    '',
    '## Verification Coverage',
    '',
    `- pending_phone: ${formatNumber(report.opsSummary.pendingPhone)}`,
    `- pending_coordinates: ${formatNumber(report.opsSummary.pendingCoordinates)}`,
    `- pending_thumbnail: ${formatNumber(report.opsSummary.pendingThumbnail)}`,
    `- pending_open24_hours: ${formatNumber(report.opsSummary.pendingOpen24Hours)}`,
    `- pending_exotic_animal_care: ${formatNumber(report.opsSummary.pendingExoticAnimalCare)}`,
    `- approved_phone_coverage: ${formatNumber(report.opsSummary.approvedPhoneCoverage)}`,
    `- approved_coordinates_coverage: ${formatNumber(report.opsSummary.approvedCoordinatesCoverage)}`,
    `- approved_thumbnail_coverage: ${formatNumber(report.opsSummary.approvedThumbnailCoverage)}`,
    `- approved_open24_hours_coverage: ${formatNumber(report.opsSummary.approvedOpen24HoursCoverage)}`,
    `- approved_exotic_animal_care_coverage: ${formatNumber(report.opsSummary.approvedExoticAnimalCareCoverage)}`,
    '',
    '## Runtime Provider Snapshot',
    '',
    runtime
      ? `- runtime_candidates: ${formatNumber(runtime.runtimeCandidateCount)}`
      : '- runtime_candidates: skipped',
    runtime
      ? `- canonical_results: ${formatNumber(runtime.canonicalResultCount)}`
      : '- canonical_results: skipped',
    runtime
      ? `- canonical_linked: ${formatNumber(runtime.canonicalLinkedCount)}`
      : '- canonical_linked: skipped',
    runtime
      ? `- provider_only: ${formatNumber(runtime.providerOnlyCount)}`
      : '- provider_only: skipped',
    runtime
      ? `- deferred: ${formatNumber(runtime.deferredCount)}`
      : '- deferred: skipped',
    runtime
      ? `- match_count: ${formatNumber(runtime.matchCount)}`
      : '- match_count: skipped',
    runtime
      ? `- provider_only_ratio: ${formatNumber(runtime.providerOnlyRatio)}`
      : '- provider_only_ratio: skipped',
    runtime
      ? `- canonical_linked_ratio: ${formatNumber(runtime.canonicalLinkedRatio)}`
      : '- canonical_linked_ratio: skipped',
    '',
  ].join('\n');
}

async function writeOutput(filePath, content) {
  if (!filePath) {
    return;
  }

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

  const client = createSupabaseServiceClient();
  const runtimeSummary = args.skipRuntime
    ? null
    : await runRuntimeSnapshot({
        client,
        query: args.query,
        latitude: args.latitude,
        longitude: args.longitude,
      });
  const opsSummary = await fetchOpsSummary(client);
  const report = {
    generatedAt: new Date().toISOString(),
    runtimeQuery: args.query,
    coordinates: {
      latitude: args.latitude,
      longitude: args.longitude,
    },
    opsSummary,
    runtimeSummary,
  };

  await writeOutput(args.output, buildMarkdownReport(report));
  await writeOutput(
    args.jsonOutput,
    JSON.stringify(report, null, 2).concat('\n'),
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
