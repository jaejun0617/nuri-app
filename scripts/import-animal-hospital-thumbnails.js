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

const ALLOWED_SOURCE_TYPES = new Set([
  'official-homepage',
  'official-sns',
  'official-introduction',
]);

function printHelp() {
  console.log(`Usage:
  node scripts/import-animal-hospital-thumbnails.js --manifest docs/qa/animal-hospital-thumbnail-candidates-2026-04-22.json --dry-run
  SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-animal-hospital-thumbnails.js --manifest docs/qa/animal-hospital-thumbnail-candidates-2026-04-22.json --apply --report-output docs/qa/animal-hospital-thumbnail-import-2026-04-22.md

Options:
  --manifest <path>          JSON manifest with official thumbnail candidates
  --dry-run                  Validate and hash candidates without remote writes
  --apply                    Insert import candidate rows and pending verifications
  --report-output <path>     Write an md report
`);
}

function parseArgs(argv) {
  const args = {
    apply: false,
    dryRun: false,
    manifest: null,
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

    throw new Error(`Unknown argument: ${token}`);
  }

  if (!args.manifest && !args.help) {
    throw new Error('Provide --manifest');
  }

  if (args.apply === args.dryRun && !args.help) {
    throw new Error('Choose exactly one of --dry-run or --apply');
  }

  return args;
}

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateCandidate(candidate, index) {
  const canonicalId = readString(candidate.canonical_id);
  const hospitalSourceKey = readString(candidate.hospital_source_key);
  const externalImageUrl = readString(candidate.external_image_url);
  const originalSourcePageUrl = readString(candidate.original_source_page_url);
  const sourceType = readString(candidate.source_type);

  if (!canonicalId && !hospitalSourceKey) {
    throw new Error(`candidate[${index}] requires canonical_id or hospital_source_key`);
  }

  if (!isHttpUrl(externalImageUrl)) {
    throw new Error(`candidate[${index}] external_image_url must be http(s)`);
  }

  if (!isHttpUrl(originalSourcePageUrl)) {
    throw new Error(
      `candidate[${index}] original_source_page_url must be http(s)`,
    );
  }

  if (!ALLOWED_SOURCE_TYPES.has(sourceType)) {
    throw new Error(`candidate[${index}] source_type is not allowed`);
  }

  return {
    canonicalId: canonicalId || null,
    hospitalSourceKey: hospitalSourceKey || null,
    externalImageUrl,
    originalSourcePageUrl,
    sourceType,
    note: readString(candidate.note) || null,
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

async function fetchImageDigest(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'NURI animalHospital ops thumbnail importer',
    },
  });

  if (!response.ok) {
    throw new Error(`image fetch failed: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? 'unknown';
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error(`not an image response: ${contentType}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    byteLength: buffer.length,
    checksumSha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    contentType,
  };
}

async function createClientFromEnv() {
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

async function resolveCanonicalId(client, candidate) {
  if (candidate.canonicalId) {
    return candidate.canonicalId;
  }

  const { data, error } = await client
    .from('animal_hospital_source_records')
    .select('canonical_hospital_id')
    .eq('source_key', candidate.hospitalSourceKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const canonicalId =
    data && typeof data.canonical_hospital_id === 'string'
      ? data.canonical_hospital_id
      : null;

  if (!canonicalId) {
    throw new Error(`canonical not found for ${candidate.hospitalSourceKey}`);
  }

  return canonicalId;
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

async function applyCandidate(client, operatorId, candidate, digest) {
  const canonicalId = await resolveCanonicalId(client, candidate);
  const fetchedAt = new Date().toISOString();
  const { data: verification, error: verificationError } = await client
    .from('animal_hospital_verifications')
    .insert({
      animal_hospital_id: canonicalId,
      field_key: 'thumbnail',
      status: 'pending',
      verified_value: {
        thumbnailUrl: candidate.externalImageUrl,
      },
      verification_source: 'official-source',
      reviewer_id: null,
      reviewed_at: null,
      note: candidate.note,
      evidence: {
        originalSourcePageUrl: candidate.originalSourcePageUrl,
        sourceType: candidate.sourceType,
        fetchedAt,
        checksumSha256: digest.checksumSha256,
        contentType: digest.contentType,
        byteLength: digest.byteLength,
      },
    })
    .select('id')
    .single();

  if (verificationError) {
    throw verificationError;
  }

  const verificationId =
    verification && typeof verification.id === 'string'
      ? verification.id
      : null;

  if (!verificationId) {
    throw new Error('verification id was not returned');
  }

  const { error: candidateError } = await client
    .from('animal_hospital_thumbnail_import_candidates')
    .upsert(
      {
        canonical_hospital_id: canonicalId,
        hospital_source_key: candidate.hospitalSourceKey,
        external_image_url: candidate.externalImageUrl,
        original_source_page_url: candidate.originalSourcePageUrl,
        source_type: candidate.sourceType,
        fetched_at: fetchedAt,
        checksum_sha256: digest.checksumSha256,
        import_status: 'imported',
        verification_status: 'pending',
        verification_id: verificationId,
        note: candidate.note,
        created_by: operatorId,
      },
      { onConflict: 'external_image_url' },
    );

  if (candidateError) {
    throw candidateError;
  }

  await client.from('animal_hospital_operator_action_log').insert({
    animal_hospital_id: canonicalId,
    actor_id: operatorId,
    action_type: 'thumbnail_candidate_imported',
    target_table: 'animal_hospital_verifications',
    target_id: verificationId,
    summary: '공식 대표 이미지 후보를 pending thumbnail verification으로 적재했어요.',
    payload: {
      externalImageUrl: candidate.externalImageUrl,
      originalSourcePageUrl: candidate.originalSourcePageUrl,
      checksumSha256: digest.checksumSha256,
    },
  });

  return {
    canonicalId,
    verificationId,
  };
}

function buildMarkdownReport(summary) {
  const lines = [
    '# animalHospital thumbnail import report',
    '',
    `- manifest: ${summary.manifestPath}`,
    `- mode: ${summary.mode}`,
    `- fetchedAt: ${summary.fetchedAt}`,
    `- total: ${summary.total}`,
    `- imported: ${summary.imported}`,
    `- skipped: ${summary.skipped}`,
    `- failed: ${summary.failed}`,
    '',
    '| hospital | image | source page | status | checksum | verification |',
    '| --- | --- | --- | --- | --- | --- |',
    ...summary.results.map(result => {
      const values = [
        result.canonicalId ?? result.hospitalSourceKey ?? 'unknown',
        result.externalImageUrl,
        result.originalSourcePageUrl,
        result.status,
        result.checksumSha256 ?? '',
        result.verificationId ?? '',
      ];
      return `| ${values.join(' | ')} |`;
    }),
    '',
  ];

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const manifest = await loadManifest(args.manifest);
  const client = args.apply ? await createClientFromEnv() : null;
  const operatorId = client ? await getOperatorId(client) : null;
  const summary = {
    manifestPath: manifest.path,
    mode: args.apply ? 'apply' : 'dry-run',
    fetchedAt: new Date().toISOString(),
    total: manifest.candidates.length,
    imported: 0,
    skipped: 0,
    failed: 0,
    results: [],
  };

  for (const candidate of manifest.candidates) {
    try {
      const digest = await fetchImageDigest(candidate.externalImageUrl);
      const result = client
        ? await applyCandidate(client, operatorId, candidate, digest)
        : {
            canonicalId: candidate.canonicalId,
            verificationId: null,
          };

      summary.imported += args.apply ? 1 : 0;
      summary.results.push({
        ...candidate,
        ...digest,
        canonicalId: result.canonicalId,
        verificationId: result.verificationId,
        status: args.apply ? 'imported' : 'validated',
      });
    } catch (error) {
      summary.failed += 1;
      summary.results.push({
        ...candidate,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(JSON.stringify(summary, null, 2));

  if (args.reportOutput) {
    const reportPath = path.resolve(args.reportOutput);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, buildMarkdownReport(summary), 'utf8');
  }

  if (summary.failed > 0) {
    process.exitCode = 2;
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
