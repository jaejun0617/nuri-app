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

const ALLOWED_FIELDS = new Set(['open24Hours', 'exoticAnimalCare']);
const ALLOWED_STATUSES = new Set(['pending', 'approved']);
const ALLOWED_SOURCE_TYPES = new Set(['official-homepage', 'official-sns']);

function printHelp() {
  console.log(`Usage:
  node scripts/import-animal-hospital-sensitive-verifications.js --manifest docs/qa/animal-hospital-sensitive-verifications-2026-04-23.json --dry-run --report-output docs/qa/animal-hospital-sensitive-verifications-2026-04-23.md
  SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-animal-hospital-sensitive-verifications.js --manifest docs/qa/animal-hospital-sensitive-verifications-2026-04-23.json --apply --report-output docs/qa/animal-hospital-sensitive-verifications-2026-04-23.md

Options:
  --manifest <path>          JSON manifest with official-site verification rows
  --dry-run                  Validate manifest and summarize rows without remote writes
  --apply                    Insert verification rows and operator action logs
  --report-output <path>     Write an md report
  --json-output <path>       Write a json report
`);
}

function parseArgs(argv) {
  const args = {
    apply: false,
    dryRun: false,
    help: false,
    manifest: null,
    reportOutput: null,
    jsonOutput: null,
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

    if (token === '--manifest') {
      args.manifest = next;
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

  if (!args.help && !args.manifest) {
    throw new Error('Provide --manifest');
  }

  if (!args.help && args.apply === args.dryRun) {
    throw new Error('Choose exactly one of --dry-run or --apply');
  }

  return args;
}

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function validateCandidate(candidate, index) {
  const animalHospitalId = readString(
    candidate.animal_hospital_id || candidate.canonical_id,
  );
  const fieldKey = readString(candidate.field_key);
  const status = readString(candidate.status || 'approved');
  const sourceType = readString(candidate.source_type);
  const sourcePageUrl = readString(candidate.source_page_url);
  const evidenceSummary = readString(candidate.evidence_summary);
  const note = readString(candidate.note) || null;
  const value = candidate.value;

  if (!animalHospitalId) {
    throw new Error(`candidate[${index}] requires animal_hospital_id`);
  }

  if (!ALLOWED_FIELDS.has(fieldKey)) {
    throw new Error(`candidate[${index}] field_key is not allowed`);
  }

  if (!ALLOWED_STATUSES.has(status)) {
    throw new Error(`candidate[${index}] status must be pending or approved`);
  }

  if (!ALLOWED_SOURCE_TYPES.has(sourceType)) {
    throw new Error(`candidate[${index}] source_type is not allowed`);
  }

  if (!isHttpUrl(sourcePageUrl)) {
    throw new Error(`candidate[${index}] source_page_url must be http(s)`);
  }

  if (!evidenceSummary) {
    throw new Error(`candidate[${index}] evidence_summary is required`);
  }

  if (typeof value !== 'boolean') {
    throw new Error(`candidate[${index}] value must be boolean`);
  }

  return {
    animalHospitalId,
    fieldKey,
    status,
    sourceType,
    sourcePageUrl,
    evidenceSummary,
    note,
    value,
  };
}

async function loadManifest(filePath) {
  const absolutePath = path.resolve(filePath);
  const raw = await fs.readFile(absolutePath, 'utf8');
  const parsed = JSON.parse(raw);
  const candidates = Array.isArray(parsed) ? parsed : parsed.candidates;

  if (!Array.isArray(candidates)) {
    throw new Error('manifest must be an array or contain candidates[]');
  }

  return {
    path: absolutePath,
    candidates: candidates.map(validateCandidate),
  };
}

function createClientFromEnv() {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NURI_SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      'Apply mode requires SUPABASE_SERVICE_ROLE_KEY or NURI_SUPABASE_SERVICE_ROLE_KEY',
    );
  }

  return createClient(SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
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

function buildVerifiedValue(candidate) {
  return candidate.fieldKey === 'open24Hours'
    ? { open24Hours: candidate.value }
    : { exoticAnimalCare: candidate.value };
}

async function applyCandidate(client, operatorId, candidate) {
  const now = new Date().toISOString();
  const approved = candidate.status === 'approved';
  const { data, error } = await client
    .from('animal_hospital_verifications')
    .insert({
      animal_hospital_id: candidate.animalHospitalId,
      field_key: candidate.fieldKey,
      status: candidate.status,
      verified_value: buildVerifiedValue(candidate),
      verification_source: 'official-source',
      reviewer_id: approved ? operatorId : null,
      reviewed_at: approved ? now : null,
      note:
        candidate.note ??
        `official site curated ${candidate.fieldKey} verification`,
      evidence: {
        source: 'official-site-curation',
        sourceType: candidate.sourceType,
        sourcePageUrl: candidate.sourcePageUrl,
        evidenceSummary: candidate.evidenceSummary,
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
      action_type:
        candidate.status === 'approved'
          ? 'verification_approved'
          : 'verification_created',
      target_table: 'animal_hospital_verifications',
      target_id: verificationId,
      summary:
        candidate.status === 'approved'
          ? '공식 사이트 기반 민감 필드 검수값을 승인했어요.'
          : '공식 사이트 기반 민감 필드 검수 후보를 생성했어요.',
      payload: {
        fieldKey: candidate.fieldKey,
        status: candidate.status,
        sourceType: candidate.sourceType,
        sourcePageUrl: candidate.sourcePageUrl,
      },
    });

  if (logError) {
    throw logError;
  }

  return verificationId;
}

function buildReport(summary) {
  const lines = [
    '# AnimalHospital Sensitive Verification Import Report',
    '',
    `- generated_at: ${summary.generatedAt}`,
    `- mode: ${summary.mode}`,
    `- manifest: ${summary.manifestPath}`,
    `- total: ${summary.total}`,
    `- applied: ${summary.applied.length}`,
    `- failed: ${summary.failed.length}`,
    '',
    '## Candidates',
    '',
    '| hospital_id | field | status | value | source |',
    '| --- | --- | --- | --- | --- |',
    ...summary.candidates.map(candidate => {
      return `| ${candidate.animalHospitalId} | ${candidate.fieldKey} | ${candidate.status} | ${String(candidate.value)} | ${candidate.sourcePageUrl} |`;
    }),
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

  const manifest = await loadManifest(args.manifest);
  const summary = {
    generatedAt: new Date().toISOString(),
    mode: args.apply ? 'apply' : 'dry-run',
    manifestPath: manifest.path,
    total: manifest.candidates.length,
    candidates: manifest.candidates,
    applied: [],
    failed: [],
  };

  if (args.apply) {
    const client = createClientFromEnv();
    const operatorId = await getOperatorId(client);

    for (const candidate of manifest.candidates) {
      try {
        const verificationId = await applyCandidate(client, operatorId, candidate);
        summary.applied.push({ ...candidate, verificationId });
      } catch (error) {
        summary.failed.push({
          ...candidate,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  await writeOutput(args.reportOutput, buildReport(summary));
  await writeOutput(
    args.jsonOutput,
    JSON.stringify(summary, null, 2).concat('\n'),
  );

  console.log(JSON.stringify(summary, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
