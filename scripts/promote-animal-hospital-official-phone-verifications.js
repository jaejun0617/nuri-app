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
const {
  normalizeAnimalHospitalPhone,
} = require('../src/services/animalHospital/normalization');

const DEFAULT_PAGE_SIZE = 1000;
const APPROVAL_NOTE = 'official Localdata 전화번호를 public phone 승인값으로 승격';
const APPROVAL_POLICY = 'official-localdata-phone-auto-approval-2026-04-23';

function printHelp() {
  console.log(`Usage:
  node scripts/promote-animal-hospital-official-phone-verifications.js --dry-run --report-output docs/qa/animal-hospital-official-phone-promotion.md
  SUPABASE_SERVICE_ROLE_KEY=... node scripts/promote-animal-hospital-official-phone-verifications.js --apply --report-output docs/qa/animal-hospital-official-phone-promotion.md

Options:
  --dry-run                  Calculate promotable pending rows without remote writes
  --apply                    Promote pending official-source rows to approved
  --max <number>             Maximum rows to promote
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

function readEvidenceSource(evidence) {
  if (!evidence || typeof evidence !== 'object') {
    return null;
  }

  const source = evidence.source;
  return typeof source === 'string' && source.trim() ? source.trim() : null;
}

function buildPromotionCandidates(params) {
  const { hospitals, pendingRows, args } = params;
  const hospitalMap = new Map(hospitals.map(hospital => [hospital.id, hospital]));
  const candidates = [];
  const skipped = {
    hospitalMissing: 0,
    inactiveOrHidden: 0,
    sourceMismatch: 0,
    phoneMismatch: 0,
    invalidPhone: 0,
  };

  for (const row of pendingRows) {
    const hospital = hospitalMap.get(row.animal_hospital_id);
    if (!hospital) {
      skipped.hospitalMissing += 1;
      continue;
    }

    if (hospital.is_active !== true || hospital.is_hidden === true) {
      skipped.inactiveOrHidden += 1;
      continue;
    }

    if (
      row.verification_source !== 'official-source' ||
      readEvidenceSource(row.evidence) !== 'official-localdata'
    ) {
      skipped.sourceMismatch += 1;
      continue;
    }

    const candidatePhone = normalizeAnimalHospitalPhone(
      row.verified_value && typeof row.verified_value === 'object'
        ? row.verified_value.phone
        : null,
    );
    const officialPhone = normalizeAnimalHospitalPhone(hospital.official_phone);

    if (!candidatePhone || !officialPhone) {
      skipped.invalidPhone += 1;
      continue;
    }

    if (candidatePhone !== officialPhone) {
      skipped.phoneMismatch += 1;
      continue;
    }

    candidates.push({
      verificationId: row.id,
      animalHospitalId: row.animal_hospital_id,
      hospitalName: hospital.canonical_name,
      phone: officialPhone,
      sourceUpdatedAt: hospital.source_updated_at || null,
      createdAt: row.created_at,
      existingNote: typeof row.note === 'string' ? row.note : null,
    });

    if (args.max && candidates.length >= args.max) {
      break;
    }
  }

  return { candidates, skipped };
}

async function promoteCandidate(client, operatorId, candidate) {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('animal_hospital_verifications')
    .update({
      status: 'approved',
      reviewer_id: operatorId,
      reviewed_at: now,
      updated_at: now,
      note: APPROVAL_NOTE,
      evidence: {
        source: 'official-localdata',
        sourceUpdatedAt: candidate.sourceUpdatedAt,
        promotedAt: now,
        approvalPolicy: APPROVAL_POLICY,
      },
    })
    .eq('id', candidate.verificationId)
    .eq('status', 'pending')
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  const verificationId = data && typeof data.id === 'string' ? data.id : null;
  if (!verificationId) {
    throw new Error('verification id was not returned after promotion');
  }

  const { error: logError } = await client
    .from('animal_hospital_operator_action_log')
    .insert({
      animal_hospital_id: candidate.animalHospitalId,
      actor_id: operatorId,
      action_type: 'verification_approved',
      target_table: 'animal_hospital_verifications',
      target_id: verificationId,
      summary: 'Official Localdata 전화번호 검수 후보를 승인했어요.',
      payload: {
        fieldKey: 'phone',
        status: 'approved',
        source: 'official-localdata',
        approvalPolicy: APPROVAL_POLICY,
      },
    });

  if (logError) {
    throw logError;
  }

  return verificationId;
}

function buildReport(input) {
  const lines = [
    '# AnimalHospital Official Phone Verification Promotion Report',
    '',
    `- generated_at: ${input.generatedAt}`,
    `- mode: ${input.mode}`,
    `- pending_rows_scanned: ${input.pendingRowsScanned}`,
    `- candidates: ${input.candidates.length}`,
    `- promoted: ${input.promoted.length}`,
    `- failed: ${input.failed.length}`,
    `- skipped: ${JSON.stringify(input.skipped)}`,
    '',
    '## Candidates',
    '',
    '| hospital | phone | source_updated_at | pending_created_at |',
    '| --- | --- | --- | --- |',
    ...input.candidates.slice(0, 200).map(candidate => {
      return `| ${candidate.hospitalName} | ${candidate.phone} | ${candidate.sourceUpdatedAt || '-'} | ${candidate.createdAt || '-'} |`;
    }),
    '',
    '## Notes',
    '',
    '- Only pending phone verification rows created from official Localdata are promoted.',
    '- Promotion requires active/not-hidden hospitals and phone equality between pending value and current official phone.',
    '- Public app exposure still depends on approved phone verification only.',
    `- approval_policy: ${APPROVAL_POLICY}`,
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
  const [hospitals, pendingRows] = await Promise.all([
    fetchPaged(
      client,
      'animal_hospitals',
      'id, canonical_name, official_phone, source_updated_at, is_active, is_hidden',
      query => query.order('canonical_name', { ascending: true }),
    ),
    fetchPaged(
      client,
      'animal_hospital_verifications',
      'id, animal_hospital_id, verification_source, verified_value, evidence, note, created_at, status',
      query =>
        query
          .eq('field_key', 'phone')
          .eq('status', 'pending')
          .order('created_at', { ascending: true }),
    ),
  ]);

  const { candidates, skipped } = buildPromotionCandidates({
    hospitals,
    pendingRows,
    args,
  });
  const operatorId = args.apply ? await fetchOperatorId(client) : null;
  const promoted = [];
  const failed = [];

  if (args.apply) {
    for (const candidate of candidates) {
      try {
        const verificationId = await promoteCandidate(
          client,
          operatorId,
          candidate,
        );
        promoted.push({ ...candidate, verificationId });
      } catch (error) {
        failed.push({
          ...candidate,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    mode: args.apply ? 'apply' : 'dry-run',
    pendingRowsScanned: pendingRows.length,
    skipped,
    candidates,
    promoted,
    failed,
  };

  const report = buildReport(output);
  await writeOutput(args.reportOutput, report);
  await writeOutput(
    args.jsonOutput,
    JSON.stringify(output, null, 2).concat('\n'),
  );
  console.log(JSON.stringify(output, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
