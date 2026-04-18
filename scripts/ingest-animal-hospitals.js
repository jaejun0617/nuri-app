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
  SUPABASE_SERVICE_ROLE_KEY=... node scripts/ingest-animal-hospitals.js --input ./localdata.csv

Options:
  --input <path>              Local JSON/CSV/TSV source file
  --url <url>                 Remote JSON/CSV/TSV source URL
  --dry-run                   Parse and map only. Does not write remote rows
  --limit <number>            Limit rows for smoke ingestion
  --format <auto|json|csv>    Source format. Default: auto
  --encoding <utf8|euc-kr>    Text decoding. Default: utf8
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
        issueCount: issues.length,
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
  const summary = args.dryRun
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
