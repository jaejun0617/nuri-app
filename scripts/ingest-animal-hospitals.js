#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const iconv = require('iconv-lite');
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
  createOfficialAnimalHospitalSnapshot,
  normalizeLocaldataAnimalHospitalRow,
} = require('../src/services/animalHospital/officialSource');
const {
  mapOfficialAnimalHospitalSourceToCanonical,
} = require('../src/services/animalHospital/mapper');
const {
  createAnimalHospitalRepository,
} = require('../src/services/animalHospital/repository');
const {
  createAnimalHospitalSupabasePersistence,
} = require('../src/services/supabase/animalHospitals');

const DEFAULT_PROVIDER = 'official-localdata';

function printHelp() {
  console.log(`Usage:
  node scripts/ingest-animal-hospitals.js --input ./localdata.csv --dry-run
  node scripts/ingest-animal-hospitals.js --url "$ANIMAL_HOSPITAL_OFFICIAL_SOURCE_URL" --dry-run
  node scripts/ingest-animal-hospitals.js --input ./localdata.csv --sql-output /tmp/animal-hospitals.sql
  SUPABASE_SERVICE_ROLE_KEY=... node scripts/ingest-animal-hospitals.js --input ./localdata.csv

Options:
  --input <path>              Local JSON/CSV/TSV source file
  --url <url>                 Remote JSON/CSV/TSV source URL
  --dry-run                   Parse and map only. Does not write remote rows
  --limit <number>            Limit rows for smoke ingestion
  --format <auto|json|csv>    Source format. Default: auto
  --encoding <utf8|euc-kr>    Text decoding. Default: utf8
  --sql-output <path>          Write batch upsert SQL instead of calling Supabase REST
  --sql-output-dir <path>      Write one SQL file per batch for Supabase API limits
  --sql-batch-size <number>    SQL values per batch. Default: 500
  --snapshot-id <id>          Explicit snapshot id
  --source-updated-at <iso>   Fallback source_updated_at for rows without a source date
`);
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    encoding: 'utf8',
    format: 'auto',
    ingestMode: 'snapshot',
    input: null,
    limit: null,
    sqlBatchSize: 500,
    sqlOutput: null,
    sqlOutputDir: null,
    snapshotId: null,
    sourceUpdatedAt: null,
    url: null,
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

    if (token === '--input') {
      args.input = next;
      index += 1;
      continue;
    }

    if (token === '--url') {
      args.url = next;
      index += 1;
      continue;
    }

    if (token === '--limit') {
      const limit = Number(next);
      if (!Number.isInteger(limit) || limit <= 0) {
        throw new Error('--limit must be a positive integer');
      }
      args.limit = limit;
      index += 1;
      continue;
    }

    if (token === '--format') {
      if (!['auto', 'json', 'csv'].includes(next)) {
        throw new Error('--format must be auto, json, or csv');
      }
      args.format = next;
      index += 1;
      continue;
    }

    if (token === '--encoding') {
      if (!['utf8', 'utf-8', 'euc-kr'].includes(next)) {
        throw new Error('--encoding must be utf8 or euc-kr');
      }
      args.encoding = next === 'utf-8' ? 'utf8' : next;
      index += 1;
      continue;
    }

    if (token === '--snapshot-id') {
      args.snapshotId = next;
      index += 1;
      continue;
    }

    if (token === '--sql-output') {
      args.sqlOutput = next;
      index += 1;
      continue;
    }

    if (token === '--sql-output-dir') {
      args.sqlOutputDir = next;
      index += 1;
      continue;
    }

    if (token === '--sql-batch-size') {
      const batchSize = Number(next);
      if (!Number.isInteger(batchSize) || batchSize <= 0) {
        throw new Error('--sql-batch-size must be a positive integer');
      }
      args.sqlBatchSize = batchSize;
      index += 1;
      continue;
    }

    if (token === '--source-updated-at') {
      const timestamp = Date.parse(next);
      if (!Number.isFinite(timestamp)) {
        throw new Error('--source-updated-at must be an ISO-compatible date');
      }
      args.sourceUpdatedAt = new Date(timestamp).toISOString();
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (!args.input && !args.url && process.env.ANIMAL_HOSPITAL_OFFICIAL_SOURCE_URL) {
    args.url = process.env.ANIMAL_HOSPITAL_OFFICIAL_SOURCE_URL;
  }

  if (!args.input && !args.url && !args.help) {
    throw new Error('Provide --input, --url, or ANIMAL_HOSPITAL_OFFICIAL_SOURCE_URL');
  }

  return args;
}

function decodeBuffer(buffer, encoding) {
  if (encoding === 'euc-kr') {
    return iconv.decode(buffer, 'euc-kr');
  }

  return buffer.toString('utf8');
}

async function loadSource(args) {
  if (args.input) {
    const absolutePath = path.resolve(args.input);
    const buffer = await fs.readFile(absolutePath);
    return {
      label: absolutePath,
      text: decodeBuffer(buffer, args.encoding),
    };
  }

  const response = await fetch(args.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch source URL: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    label: args.url,
    text: decodeBuffer(buffer, args.encoding),
  };
}

function detectFormat(text, label, requestedFormat) {
  if (requestedFormat !== 'auto') {
    return requestedFormat;
  }

  const trimmed = text.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json';
  }

  const extension = path.extname(label).toLowerCase();
  if (extension === '.json') {
    return 'json';
  }

  return 'csv';
}

function findJsonRows(payload) {
  const candidates = [
    payload,
    payload && payload.data,
    payload && payload.rows,
    payload && payload.records,
    payload && payload.items,
    payload && payload.response && payload.response.body && payload.response.body.items,
    payload &&
      payload.response &&
      payload.response.body &&
      payload.response.body.items &&
      payload.response.body.items.item,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (candidate && Array.isArray(candidate.item)) {
      return candidate.item;
    }
  }

  throw new Error('JSON source does not contain a supported row array');
}

function parseDelimitedLine(line, delimiter) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseDelimitedRows(text) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headerLine = lines[0];
  const delimiter =
    (headerLine.match(/\t/g) || []).length > (headerLine.match(/,/g) || []).length
      ? '\t'
      : ',';
  const headers = parseDelimitedLine(headerLine, delimiter).map(header =>
    header.trim(),
  );

  return lines.slice(1).map(line => {
    const values = parseDelimitedLine(line, delimiter);
    return headers.reduce((row, header, index) => {
      row[header] = values[index] === undefined ? '' : values[index].trim();
      return row;
    }, {});
  });
}

function parseRows(source, format) {
  if (format === 'json') {
    return findJsonRows(JSON.parse(source.text));
  }

  return parseDelimitedRows(source.text);
}

function buildSnapshotInput(args, rows) {
  return {
    provider: DEFAULT_PROVIDER,
    rows,
    defaultSourceUpdatedAt: args.sourceUpdatedAt,
    fetchedAt: new Date().toISOString(),
    snapshotId: args.snapshotId,
    ingestMode: args.ingestMode,
  };
}

function buildHospitalPersistenceRow(contract) {
  return {
    id: contract.canonicalHospital.id,
    official_source_key: contract.officialSourceKey,
    primary_source_provider: contract.canonicalHospital.primarySource.provider,
    primary_source_record_id:
      contract.canonicalHospital.primarySource.providerRecordId,
    canonical_name: contract.canonicalHospital.canonicalName,
    normalized_name: contract.canonicalHospital.normalizedName,
    primary_address: contract.canonicalHospital.address.primary,
    road_address: contract.canonicalHospital.address.roadAddress,
    lot_address: contract.canonicalHospital.address.lotAddress,
    normalized_primary_address:
      contract.canonicalHospital.address.normalizedPrimary,
    latitude: contract.canonicalHospital.coordinates.latitude,
    longitude: contract.canonicalHospital.coordinates.longitude,
    coordinate_source: contract.canonicalHospital.coordinates.source,
    coordinate_normalization_status:
      contract.canonicalHospital.coordinates.normalizationStatus,
    status_code: contract.canonicalHospital.status.code,
    status_summary: contract.canonicalHospital.status.summary,
    license_status_text: contract.canonicalHospital.status.licenseStatusText,
    operation_status_text: contract.canonicalHospital.status.operationStatusText,
    official_phone: contract.canonicalHospital.contact.publicPhone
      ? contract.canonicalHospital.contact.publicPhone.value
      : null,
    normalized_phone: contract.canonicalHospital.searchTokens.normalizedPhone,
    public_trust_status: contract.canonicalHospital.trust.publicStatus,
    freshness_status: contract.canonicalHospital.trust.freshness,
    requires_verification: contract.canonicalHospital.trust.requiresVerification,
    has_source_conflict: contract.canonicalHospital.trust.hasSourceConflict,
    source_updated_at: contract.canonicalHospital.trust.sourceUpdatedAt,
    canonical_updated_at: contract.canonicalUpdatedAt,
    reviewed_at: contract.canonicalHospital.trust.reviewedAt,
    is_active: contract.canonicalHospital.lifecycle.isActive,
    is_hidden: contract.canonicalHospital.lifecycle.isHidden,
    lifecycle_note: contract.canonicalHospital.lifecycle.statusReason,
    provider_place_id: contract.canonicalHospital.links.providerPlaceId,
    provider_place_url: contract.canonicalHospital.links.providerPlaceUrl,
  };
}

function buildSourcePersistenceRow(contract) {
  return {
    id: contract.sourceRecord.sourceId,
    source_key: contract.sourceRecord.sourceKey,
    official_source_key: contract.sourceRecord.officialSourceKey,
    provider: contract.sourceRecord.provider,
    source_kind: contract.sourceRecord.sourceKind,
    provider_record_id: contract.sourceRecord.providerRecordId,
    name: contract.sourceRecord.name,
    normalized_name: contract.sourceRecord.normalizedName,
    lot_address: contract.sourceRecord.lotAddress,
    road_address: contract.sourceRecord.roadAddress,
    normalized_primary_address:
      contract.sourceRecord.normalizedPrimaryAddress,
    license_status_text: contract.sourceRecord.licenseStatusText,
    operation_status_text: contract.sourceRecord.operationStatusText,
    official_phone: contract.sourceRecord.officialPhone,
    normalized_phone: contract.sourceRecord.normalizedPhone,
    latitude: contract.sourceRecord.rawCoordinates.latitude,
    longitude: contract.sourceRecord.rawCoordinates.longitude,
    x5174: contract.sourceRecord.rawCoordinates.x5174,
    y5174: contract.sourceRecord.rawCoordinates.y5174,
    coordinate_crs: contract.sourceRecord.rawCoordinates.crs,
    coordinate_source: contract.sourceRecord.normalizedCoordinates.source,
    coordinate_normalization_status:
      contract.sourceRecord.normalizedCoordinates.normalizationStatus,
    source_updated_at: contract.sourceRecord.sourceUpdatedAt,
    ingested_at: contract.sourceRecord.ingestedAt,
    snapshot_id: contract.sourceRecord.snapshotId,
    snapshot_fetched_at: contract.sourceRecord.snapshotFetchedAt,
    ingest_mode: contract.sourceRecord.ingestMode,
    row_checksum: contract.sourceRecord.rowChecksum,
    metadata: contract.sourceRecord.metadata || {},
    canonical_hospital_id: contract.canonicalHospital.id,
    raw_payload: contract.sourceRecord.rawPayload || {},
  };
}

function sqlText(value) {
  if (value === null || value === undefined) {
    return 'null';
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  return `${sqlText(JSON.stringify(value))}::jsonb`;
}

function splitBatches(items, batchSize) {
  const batches = [];
  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }

  return batches;
}

function buildSqlBatch(contracts, batchIndex) {
  const values = contracts
    .map(contract => {
      const hospital = buildHospitalPersistenceRow(contract);
      const source = buildSourcePersistenceRow(contract);

      return `(
        ${sqlText(contract.canonicalId)},
        ${sqlText(contract.sourceRecord.sourceId)},
        ${sqlText(contract.sourceKey)},
        ${sqlText(contract.officialSourceKey)},
        ${sqlText(contract.rowChecksum)},
        ${sqlJson(hospital)},
        ${sqlJson(source)}
      )`;
    })
    .join(',\n');

  return `
-- animal hospital ingest batch ${batchIndex + 1}
with input_rows(
  canonical_id,
  source_id,
  source_key,
  official_source_key,
  row_checksum,
  hospital,
  source
) as (
  values
${values}
),
source_actions as (
  select
    input_rows.*,
    case
      when existing.source_key is null then 'inserted'
      when existing.row_checksum is distinct from input_rows.row_checksum then 'updated'
      else 'unchanged'
    end as change_type
  from input_rows
  left join public.animal_hospital_source_records existing
    on existing.source_key = input_rows.source_key
),
upsert_hospitals as (
  insert into public.animal_hospitals (
    id,
    official_source_key,
    primary_source_provider,
    primary_source_record_id,
    canonical_name,
    normalized_name,
    primary_address,
    road_address,
    lot_address,
    normalized_primary_address,
    latitude,
    longitude,
    coordinate_source,
    coordinate_normalization_status,
    status_code,
    status_summary,
    license_status_text,
    operation_status_text,
    official_phone,
    normalized_phone,
    public_trust_status,
    freshness_status,
    requires_verification,
    has_source_conflict,
    source_updated_at,
    canonical_updated_at,
    reviewed_at,
    is_active,
    is_hidden,
    lifecycle_note,
    provider_place_id,
    provider_place_url
  )
  select
    canonical_id,
    official_source_key,
    hospital->>'primary_source_provider',
    hospital->>'primary_source_record_id',
    hospital->>'canonical_name',
    hospital->>'normalized_name',
    hospital->>'primary_address',
    hospital->>'road_address',
    hospital->>'lot_address',
    hospital->>'normalized_primary_address',
    nullif(hospital->>'latitude', '')::numeric,
    nullif(hospital->>'longitude', '')::numeric,
    hospital->>'coordinate_source',
    hospital->>'coordinate_normalization_status',
    hospital->>'status_code',
    hospital->>'status_summary',
    hospital->>'license_status_text',
    hospital->>'operation_status_text',
    hospital->>'official_phone',
    hospital->>'normalized_phone',
    hospital->>'public_trust_status',
    hospital->>'freshness_status',
    coalesce((hospital->>'requires_verification')::boolean, true),
    coalesce((hospital->>'has_source_conflict')::boolean, false),
    nullif(hospital->>'source_updated_at', '')::timestamptz,
    nullif(hospital->>'canonical_updated_at', '')::timestamptz,
    nullif(hospital->>'reviewed_at', '')::timestamptz,
    coalesce((hospital->>'is_active')::boolean, true),
    coalesce((hospital->>'is_hidden')::boolean, false),
    hospital->>'lifecycle_note',
    hospital->>'provider_place_id',
    hospital->>'provider_place_url'
  from input_rows
  on conflict (id) do update set
    official_source_key = excluded.official_source_key,
    primary_source_provider = excluded.primary_source_provider,
    primary_source_record_id = excluded.primary_source_record_id,
    canonical_name = excluded.canonical_name,
    normalized_name = excluded.normalized_name,
    primary_address = excluded.primary_address,
    road_address = excluded.road_address,
    lot_address = excluded.lot_address,
    normalized_primary_address = excluded.normalized_primary_address,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    coordinate_source = excluded.coordinate_source,
    coordinate_normalization_status = excluded.coordinate_normalization_status,
    status_code = excluded.status_code,
    status_summary = excluded.status_summary,
    license_status_text = excluded.license_status_text,
    operation_status_text = excluded.operation_status_text,
    official_phone = excluded.official_phone,
    normalized_phone = excluded.normalized_phone,
    public_trust_status = excluded.public_trust_status,
    freshness_status = excluded.freshness_status,
    requires_verification = excluded.requires_verification,
    has_source_conflict = excluded.has_source_conflict,
    source_updated_at = excluded.source_updated_at,
    canonical_updated_at = excluded.canonical_updated_at,
    reviewed_at = excluded.reviewed_at,
    is_active = excluded.is_active,
    is_hidden = excluded.is_hidden,
    lifecycle_note = excluded.lifecycle_note,
    provider_place_id = excluded.provider_place_id,
    provider_place_url = excluded.provider_place_url
  returning id
),
upsert_sources as (
  insert into public.animal_hospital_source_records (
    id,
    source_key,
    official_source_key,
    provider,
    source_kind,
    provider_record_id,
    name,
    normalized_name,
    lot_address,
    road_address,
    normalized_primary_address,
    license_status_text,
    operation_status_text,
    official_phone,
    normalized_phone,
    latitude,
    longitude,
    x5174,
    y5174,
    coordinate_crs,
    coordinate_source,
    coordinate_normalization_status,
    source_updated_at,
    ingested_at,
    snapshot_id,
    snapshot_fetched_at,
    ingest_mode,
    row_checksum,
    metadata,
    canonical_hospital_id,
    raw_payload
  )
  select
    source_id,
    source_key,
    official_source_key,
    source->>'provider',
    source->>'source_kind',
    source->>'provider_record_id',
    source->>'name',
    source->>'normalized_name',
    source->>'lot_address',
    source->>'road_address',
    source->>'normalized_primary_address',
    source->>'license_status_text',
    source->>'operation_status_text',
    source->>'official_phone',
    source->>'normalized_phone',
    nullif(source->>'latitude', '')::numeric,
    nullif(source->>'longitude', '')::numeric,
    nullif(source->>'x5174', '')::numeric,
    nullif(source->>'y5174', '')::numeric,
    source->>'coordinate_crs',
    source->>'coordinate_source',
    source->>'coordinate_normalization_status',
    nullif(source->>'source_updated_at', '')::timestamptz,
    nullif(source->>'ingested_at', '')::timestamptz,
    source->>'snapshot_id',
    nullif(source->>'snapshot_fetched_at', '')::timestamptz,
    source->>'ingest_mode',
    source->>'row_checksum',
    case
      when jsonb_typeof(source->'metadata') = 'object' then source->'metadata'
      else '{}'::jsonb
    end,
    canonical_id,
    case
      when jsonb_typeof(source->'raw_payload') = 'object' then source->'raw_payload'
      else '{}'::jsonb
    end
  from input_rows
  where exists (
    select 1
    from upsert_hospitals
    where upsert_hospitals.id = input_rows.canonical_id
  )
  on conflict (source_key) do update set
    official_source_key = excluded.official_source_key,
    provider = excluded.provider,
    source_kind = excluded.source_kind,
    provider_record_id = excluded.provider_record_id,
    name = excluded.name,
    normalized_name = excluded.normalized_name,
    lot_address = excluded.lot_address,
    road_address = excluded.road_address,
    normalized_primary_address = excluded.normalized_primary_address,
    license_status_text = excluded.license_status_text,
    operation_status_text = excluded.operation_status_text,
    official_phone = excluded.official_phone,
    normalized_phone = excluded.normalized_phone,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    x5174 = excluded.x5174,
    y5174 = excluded.y5174,
    coordinate_crs = excluded.coordinate_crs,
    coordinate_source = excluded.coordinate_source,
    coordinate_normalization_status = excluded.coordinate_normalization_status,
    source_updated_at = excluded.source_updated_at,
    ingested_at = excluded.ingested_at,
    snapshot_id = excluded.snapshot_id,
    snapshot_fetched_at = excluded.snapshot_fetched_at,
    ingest_mode = excluded.ingest_mode,
    row_checksum = excluded.row_checksum,
    metadata = excluded.metadata,
    canonical_hospital_id = excluded.canonical_hospital_id,
    raw_payload = excluded.raw_payload
  returning id
),
insert_change_log as (
  insert into public.animal_hospital_change_log (
    canonical_hospital_id,
    source_record_id,
    change_type,
    summary,
    payload
  )
  select
    canonical_id,
    source_id,
    change_type,
    case
      when change_type = 'inserted'
        then '공식 source 기준 canonical 병원을 최초 생성했어요.'
      when change_type = 'updated'
        then '공식 source 최신 스냅샷으로 canonical 병원을 갱신했어요.'
      else '공식 source 스냅샷 메타데이터만 새로 반영했어요.'
    end,
    jsonb_build_object(
      'officialSourceKey', official_source_key,
      'rowChecksum', row_checksum,
      'sourceUpdatedAt', source->>'source_updated_at'
    )
  from source_actions
  where exists (
    select 1
    from upsert_sources
    where upsert_sources.id = source_actions.source_id
  )
  returning 1
)
select
  (select count(*) from input_rows) as input_rows,
  (select count(*) from upsert_hospitals) as upserted_hospitals,
  (select count(*) from upsert_sources) as upserted_sources,
  (select count(*) from insert_change_log) as inserted_change_logs;
`;
}

async function writeSqlOutput(args, snapshotInput) {
  const snapshot = createOfficialAnimalHospitalSnapshot(snapshotInput);
  const sqlOutput = args.sqlOutput ? path.resolve(args.sqlOutput) : null;
  const sqlOutputDir = args.sqlOutputDir
    ? path.resolve(args.sqlOutputDir)
    : null;
  const summary = {
    mode: 'sql-output',
    provider: snapshot.provider,
    snapshotId: snapshot.snapshotId,
    fetchedAt: snapshot.fetchedAt,
    totalRows: snapshot.rows.length,
    mappedRows: 0,
    failedRows: 0,
    issueCount: 0,
    sqlOutput,
    sqlOutputDir,
    sqlBatchSize: args.sqlBatchSize,
    sqlFiles: [],
    sampleCanonicalIds: [],
  };
  const contracts = [];
  const seenCanonicalIds = new Set();

  for (const row of snapshot.rows) {
    const normalized = normalizeLocaldataAnimalHospitalRow({ row, snapshot });
    if (!normalized) {
      summary.failedRows += 1;
      continue;
    }

    summary.issueCount += normalized.warnings.length;
    const contract = mapOfficialAnimalHospitalSourceToCanonical(normalized.input);

    if (seenCanonicalIds.has(contract.canonicalId)) {
      summary.failedRows += 1;
      continue;
    }

    seenCanonicalIds.add(contract.canonicalId);
    contracts.push(contract);
    summary.mappedRows += 1;

    if (summary.sampleCanonicalIds.length < 5) {
      summary.sampleCanonicalIds.push(contract.canonicalId);
    }
  }

  if (summary.failedRows > 0) {
    throw new Error(
      `SQL output aborted because ${summary.failedRows} rows failed normalization or dedupe`,
    );
  }

  const batches = splitBatches(contracts, args.sqlBatchSize);

  if (sqlOutputDir) {
    await fs.mkdir(sqlOutputDir, { recursive: true });

    for (const [index, batch] of batches.entries()) {
      const fileName = `${String(index + 1).padStart(4, '0')}-animal-hospitals.sql`;
      const filePath = path.join(sqlOutputDir, fileName);
      const sql = [
        'begin;',
        `-- provider: ${snapshot.provider}`,
        `-- snapshot_id: ${snapshot.snapshotId}`,
        `-- fetched_at: ${snapshot.fetchedAt}`,
        `-- batch: ${index + 1}/${batches.length}`,
        buildSqlBatch(batch, index),
        'commit;',
        '',
      ].join('\n');

      await fs.writeFile(filePath, sql, 'utf8');
      summary.sqlFiles.push(filePath);
    }
  }

  if (sqlOutput) {
    const sql = [
      'begin;',
      `-- provider: ${snapshot.provider}`,
      `-- snapshot_id: ${snapshot.snapshotId}`,
      `-- fetched_at: ${snapshot.fetchedAt}`,
      `-- total_rows: ${snapshot.rows.length}`,
      ...batches.map((batch, index) => buildSqlBatch(batch, index)),
      'commit;',
      '',
    ].join('\n');

    await fs.writeFile(sqlOutput, sql, 'utf8');
  }

  return summary;
}

function runDryRun(snapshotInput) {
  const snapshot = createOfficialAnimalHospitalSnapshot(snapshotInput);
  const summary = {
    mode: 'dry-run',
    provider: snapshot.provider,
    snapshotId: snapshot.snapshotId,
    fetchedAt: snapshot.fetchedAt,
    totalRows: snapshot.rows.length,
    mappedRows: 0,
    failedRows: 0,
    issues: [],
    sampleCanonicalIds: [],
  };

  for (const row of snapshot.rows) {
    const normalized = normalizeLocaldataAnimalHospitalRow({ row, snapshot });
    if (!normalized) {
      summary.failedRows += 1;
      summary.issues.push({
        providerRecordId: null,
        code: 'invalid-row',
        message: '필수 식별자 또는 병원명이 없어 공식 source row를 건너뛰었어요.',
      });
      continue;
    }

    summary.issues.push(...normalized.warnings);
    const contract = mapOfficialAnimalHospitalSourceToCanonical(normalized.input);
    summary.mappedRows += 1;

    if (summary.sampleCanonicalIds.length < 5) {
      summary.sampleCanonicalIds.push(contract.canonicalId);
    }
  }

  return summary;
}

async function runRemoteIngest(snapshotInput) {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NURI_SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      'Remote ingest requires SUPABASE_SERVICE_ROLE_KEY or NURI_SUPABASE_SERVICE_ROLE_KEY',
    );
  }

  const client = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const repository = createAnimalHospitalRepository(
    createAnimalHospitalSupabasePersistence(client),
  );

  return repository.ingestOfficialSnapshot(snapshotInput);
}

function printSummary(summary) {
  const issues = Array.isArray(summary.issues) ? summary.issues : [];
  console.log(
    JSON.stringify(
      {
        ...summary,
        issueCount:
          typeof summary.issueCount === 'number'
            ? summary.issueCount
            : issues.length,
        issues: issues.slice(0, 20),
        results: Array.isArray(summary.results)
          ? summary.results.slice(0, 20)
          : summary.results,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const source = await loadSource(args);
  const format = detectFormat(source.text, source.label, args.format);
  const rows = parseRows(source, format);
  const limitedRows = args.limit ? rows.slice(0, args.limit) : rows;
  const snapshotInput = buildSnapshotInput(args, limitedRows);
  const summary = args.sqlOutput || args.sqlOutputDir
    ? await writeSqlOutput(args, snapshotInput)
    : args.dryRun
      ? runDryRun(snapshotInput)
      : await runRemoteIngest(snapshotInput);

  printSummary(summary);

  if ('failed' in summary && summary.failed > 0) {
    process.exitCode = 2;
  }

  if ('failedRows' in summary && summary.failedRows > 0) {
    process.exitCode = 2;
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
