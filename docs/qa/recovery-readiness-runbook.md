# NURI Backup And Recovery Readiness

## Verified Boundary

2026-10-04 read-only audit: linked project `grmekesqoydylqmyvfke`, ACTIVE_HEALTHY, Postgres 17.6.1.063, Free organization. Migration history has 82 applied entries, latest `20261004051105`. All 101 public tables and `storage.objects` have RLS enabled. No production restore, migration, row mutation or object mutation was performed.

Current managed daily backup/PITR availability and a current restorable backup were not verified. Free-plan evidence is not a managed daily-backup guarantee. The old `backups/supabase/20260329_backup_before_rebuild` contains public-schema/public-data dumps (~796 KiB combined), a migration list and a roles error log. It is stale, lacks successful role-backup proof and is not a complete current database/auth/media recovery set. Dump contents were not inspected.

[Supabase backup documentation](https://supabase.com/docs/guides/platform/backups) states database backups do not include Storage object bytes. A database recovery point alone cannot recover private photos or community attachments. No media backup inventory/checksum or isolated auth-user restore proof is available. RECOVERY_RUNBOOK is complete; OPERATIONAL_RECOVERY is PARTIAL. NON_DESTRUCTIVE_DRILL is NOT_AVAILABLE because an approved isolated destination and verified recovery input set are absent.

## What Must Be Preserved Separately

- Database schema/data, extension configuration, roles/grants, RLS, RPC/functions/triggers and migration history, with backup timestamp and integrity hash.
- Auth users/identities and the documented provider/redirect configuration, protected by an authorized operator. A database restore must not be assumed to preserve every client session or revoke compromised tokens.
- Storage object bytes and path/bucket/owner metadata for public profiles, private memories and private community attachments. Keep object retention and per-user ownership; no live fixture cleanup.
- Application and web exact-source artifacts, input fingerprints, deployment records, signing keys, approved signer fingerprints and protected configuration. Credentials belong in approved secure storage, not this runbook or Git.
- Canonical QA and rollback evidence. A test fixture is not a production backup, and old screenshots do not establish restore correctness.

## Authorized Recovery Sequence

1. Declare the incident scope, owner, last known good point and accepted data-loss window. RPO/RTO are UNVERIFIED until a timed isolated drill succeeds; do not invent targets.
2. Preserve current metadata/evidence and halt destructive operator actions. Identify whether the incident concerns data, media, auth, deployment or policies before choosing a restore unit.
3. Verify an authorized recovery set's hashes, timestamp, schema version, role/grant boundary and separately retained media objects. Obtain an isolated destination approval and cost approval if required.
4. Restore only into that isolated destination first using the official supported backup procedure. Validate extensions, migration history, functions/triggers, RLS and ownership using controlled test users, never real-user login takeover.
5. Restore object bytes and metadata separately, checking private/public bucket boundaries and signed URL behavior. Do not make private buckets public as a recovery workaround.
6. Validate auth configuration and identity boundary separately; plan session invalidation/re-login only if the incident requires it and PO/operator approves.
7. Compare row/object counts, selected controlled ownership cases and application contracts. Record measured recovery time and actual last recoverable timestamp. Keep token/PII out of logs.
8. Propose a production cutover with explicit PO/operator approval and rollback plan. No production restore is authorized by this document.
9. After an approved cutover, verify production health, independent deployment provenance, RLS and media boundary. Retain pre-restore evidence and do not auto-delete existing QA.

## Required Decisions Before Operational PASS

P1: choose and authorize a current database backup/export mechanism or an appropriate managed plan; define encrypted off-host retention and ownership. Do not provision paid services automatically.

P1: establish independent Storage object backup and integrity inventory plus authorized auth-recovery documentation. Database-only recovery cannot claim media recovery.

P2: approve an isolated disposable restore destination and execute a timed non-destructive drill, including ownership/RLS checks. Until then retain NOT_AVAILABLE, not PASS.

These gaps do not reopen the approved offline/Kakao flows or change design. Store remains HOLD; design can proceed while operational readiness stays explicitly bounded.
