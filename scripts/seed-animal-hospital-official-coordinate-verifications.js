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
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  }).outputText;

  module._compile(output, filename);
};

const { SUPABASE_URL } = require('../src/services/supabase/config');

const DEFAULT_PAGE_SIZE = 1000;

function printHelp() {
  console.log(`Usage:
  node scripts/seed-animal-hospital-official-coordinate-verifications.js --dry-run --status pending --report-output docs/qa/animal-hospital-official-coordinate-seed.md
  SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-animal-hospital-official-coordinate-verifications.js --apply --status approved --report-output docs/qa/animal-hospital-official-coordinate-seed.md

Options:
  --dry-run                  Calculate candidate rows without remote writes
  --apply                    Insert verification rows and action logs
  --status <pending|approved> Verification status to create. Default: pending
  --max <number>             Maximum candidates to create
  --report-output <path>     Write an md report
  --json-output <path>       Write a json report
`);
}

function parseArgs(argv) {
  const args = {
    apply: false,
    dryRun: false,
    help: false,
    jsonOutput: null,
    max: null,
    reportOutput: null,
    status: 'pending',
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

    if (token === '--status') {
      if (next !== 'pending' && next !== 'approved') {
        throw new Error('--status must be pending or approved');
      }
      args.status = next;
      index += 1;
      continue;
    }

    if (token === '--max') {
      args.max = Number(next);
      if (!Number.isInteger(args.max) || args.max <= 0) {
        throw new Error('--max must be a positive integer');
      }
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

    throw new Error(`Unknown argument: ${token}`);
  }

  if (!args.help && args.apply === args.dryRun) {
    throw new Error('Choose exactly one of --dry-run or --apply');
  }

  return args;
}

function getServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NURI_SUPABASE_SERVICE_ROLE_KEY ||
    null
  );
}

function createServiceClient() {
  const serviceRoleKey = getServiceRoleKey();
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY or NURI_SUPABASE_SERVICE_ROLE_KEY is required',
    );
  }

  return createClient(SUPABASE_URL, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function fetchPaged(client, table, select, buildQuery) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + DEFAULT_PAGE_SIZE - 1;
    let query = client.from(table).select(select).range(from, to);
    query = buildQuery ? buildQuery(query) : query;
    const { data, error } = await query;

    if (error) {
      throw error;
    }

    rows.push(...(data || []));

    if (!data || data.length < DEFAULT_PAGE_SIZE) {
      return rows;
    }

    from += DEFAULT_PAGE_SIZE;
  }
}

async function fetchOperatorId(client) {
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

function toFiniteNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function buildCandidates(hospitals, existingCoordinateHospitalIds, args) {
  const candidates = [];
  const skipped = {
    inactiveOrHidden: 0,
    alreadyQueuedOrApproved: 0,
    missingCoordinates: 0,
    nonExactCoordinates: 0,
    nonOfficialPrimarySource: 0,
  };

  for (const hospital of hospitals) {
    if (hospital.is_active !== true || hospital.is_hidden === true) {
      skipped.inactiveOrHidden += 1;
      continue;
    }

    if (existingCoordinateHospitalIds.has(hospital.id)) {
      skipped.alreadyQueuedOrApproved += 1;
      continue;
    }

    if (
      hospital.primary_source_provider !== 'official-localdata' &&
      hospital.primary_source_provider !== 'municipal-open-data'
    ) {
      skipped.nonOfficialPrimarySource += 1;
      continue;
    }

    if (hospital.coordinate_normalization_status !== 'exact') {
      skipped.nonExactCoordinates += 1;
      continue;
    }

    const latitude = toFiniteNumber(hospital.latitude);
    const longitude = toFiniteNumber(hospital.longitude);

    if (latitude === null || longitude === null) {
      skipped.missingCoordinates += 1;
      continue;
    }

    candidates.push({
      animalHospitalId: hospital.id,
      hospitalName: hospital.canonical_name,
      latitude,
      longitude,
      sourceUpdatedAt: hospital.source_updated_at || null,
      coordinateSource: hospital.coordinate_source || null,
      status: args.status,
    });

    if (args.max && candidates.length >= args.max) {
      break;
    }
  }

  return { candidates, skipped };
}

async function applyCandidate(client, operatorId, candidate) {
  const now = new Date().toISOString();
  const approved = candidate.status === 'approved';
  const { data, error } = await client
    .from('animal_hospital_verifications')
    .insert({
      animal_hospital_id: candidate.animalHospitalId,
      field_key: 'coordinates',
      status: candidate.status,
      verified_value: {
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      },
      verification_source: 'official-source',
      reviewer_id: approved ? operatorId : null,
      reviewed_at: approved ? now : null,
      note: approved
        ? 'official Localdata exact 좌표를 승인 검수값으로 적재'
        : 'official Localdata exact 좌표 검수 후보',
      evidence: {
        source: 'official-localdata',
        sourceUpdatedAt: candidate.sourceUpdatedAt,
        coordinateSource: candidate.coordinateSource,
        importedAt: now,
      },
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

  const { error: logError } = await client
    .from('animal_hospital_operator_action_log')
    .insert({
      animal_hospital_id: candidate.animalHospitalId,
      actor_id: operatorId,
      action_type: 'verification_created',
      target_table: 'animal_hospital_verifications',
      target_id: verificationId,
      summary: 'Official Localdata exact 좌표 검수 record를 생성했어요.',
      payload: {
        fieldKey: 'coordinates',
        status: candidate.status,
        source: 'official-localdata',
      },
    });

  if (logError) {
    throw logError;
  }

  return verificationId;
}

function buildReport(input) {
  const lines = [
    '# AnimalHospital Official Coordinate Verification Seed Report',
    '',
    `- generated_at: ${input.generatedAt}`,
    `- mode: ${input.mode}`,
    `- status: ${input.status}`,
    `- hospitals_scanned: ${input.hospitalsScanned}`,
    `- existing_coordinate_verifications: ${input.existingCoordinateVerifications}`,
    `- candidates: ${input.candidates.length}`,
    `- applied: ${input.applied.length}`,
    `- failed: ${input.failed.length}`,
    `- skipped: ${JSON.stringify(input.skipped)}`,
    '',
    '## Candidates',
    '',
    '| hospital | latitude | longitude | status | source_updated_at | coordinate_source |',
    '| --- | --- | --- | --- | --- | --- |',
    ...input.candidates.slice(0, 200).map(candidate => {
      return `| ${candidate.hospitalName} | ${candidate.latitude} | ${candidate.longitude} | ${candidate.status} | ${candidate.sourceUpdatedAt || '-'} | ${candidate.coordinateSource || '-'} |`;
    }),
    '',
    '## Notes',
    '',
    '- This script creates coordinate verification records from official Localdata exact coordinates.',
    '- Public app exposure still depends on approved coordinate verification only.',
    '- Use --status pending for manual review queue, or --status approved only when official-source auto-approval is an explicit ops decision.',
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

  const client = createServiceClient();
  const [hospitals, existingRows] = await Promise.all([
    fetchPaged(
      client,
      'animal_hospitals',
      [
        'id',
        'canonical_name',
        'latitude',
        'longitude',
        'coordinate_source',
        'coordinate_normalization_status',
        'primary_source_provider',
        'source_updated_at',
        'is_active',
        'is_hidden',
      ].join(', '),
      query => query.order('canonical_name', { ascending: true }),
    ),
    fetchPaged(
      client,
      'animal_hospital_verifications',
      'animal_hospital_id, status',
      query =>
        query
          .eq('field_key', 'coordinates')
          .in('status', ['pending', 'approved', 'held']),
    ),
  ]);

  const existingCoordinateHospitalIds = new Set(
    existingRows.map(row => row.animal_hospital_id).filter(Boolean),
  );
  const { candidates, skipped } = buildCandidates(
    hospitals,
    existingCoordinateHospitalIds,
    args,
  );
  const operatorId = args.apply ? await fetchOperatorId(client) : null;
  const applied = [];
  const failed = [];

  if (args.apply) {
    for (const candidate of candidates) {
      try {
        const verificationId = await applyCandidate(
          client,
          operatorId,
          candidate,
        );
        applied.push({ ...candidate, verificationId });
      } catch (error) {
        failed.push({
          ...candidate,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: args.apply ? 'apply' : 'dry-run',
    status: args.status,
    hospitalsScanned: hospitals.length,
    existingCoordinateVerifications: existingRows.length,
    candidates,
    skipped,
    applied,
    failed,
  };

  await Promise.all([
    writeOutput(args.reportOutput, buildReport(report)),
    writeOutput(
      args.jsonOutput,
      args.jsonOutput ? JSON.stringify(report, null, 2) : null,
    ),
  ]);

  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
