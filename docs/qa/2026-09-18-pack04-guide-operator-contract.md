# Pack04 Guide Operator Contract

## Authorized Boundary

The PO approved Guide-only operator authorization and additive server-side actor
tracking. Existing administrator login, session cookies, MFA, roles and unrelated
domain permissions are unchanged. No existing operator capability was changed.
This is not an administrator authentication redesign.

The existing CMS uses `admin_operator_accounts`, not a Supabase Auth session.
The previous Guide adapter used `supabase.auth.getUser()` and therefore rejected
an otherwise valid CMS session. Legacy Guide `created_by` and `updated_by` refer
to `auth.users`; a custom operator ID cannot be written into those columns.

## Minimum Compatible Contract

Migration `20260918090000_pack04_guide_operator_contract.sql` adds nullable
`created_by_operator_id` and `updated_by_operator_id`. Existing author columns
and timestamps are retained. Existing Guide and pet rows are not rewritten.

The server resolves the existing administrator session inside every Guide data
request. Its verified account ID, auth version, MFA verification timestamp,
action and payload are bound to a Guide-only HMAC envelope with a maximum
60-second validity. Forms cannot supply the authenticated actor. Write request
IDs are single-use and committed atomically with the mutation and audit record.

`guide_operator_request_v1` accepts only list, detail, summary, create, update
and archive operations. It rechecks account status, auth version,
`guides.manage` and any active MFA factor before accessing Guide data.
Existing empty-capability administrator defaults are preserved; an explicit
Guide-only capability does not grant another administrator domain capability.

The gateway is owned by `nuri_guide_executor`, a non-login, non-owner,
NOBYPASSRLS role. It has no password-hash or encrypted-MFA-secret privileges,
no profile write privilege and no hard-delete privilege. Client roles cannot
assume it. Existing Guide policies remain; additive executor policies are scoped
to the verified subject. Guide requests use the public Supabase key, not a new
service-role client. Existing authentication credential lookups remain unchanged.

The DB trigger preserves the original creator on updates and attributes the
modifier to the verified operator. Legacy authenticated writes still use
`auth.uid()`. Caller-provided author and creation-time values are ignored.
`guide_private.operation_audit` records create/update/archive, operator,
request ID, Guide ID and before/after update timestamps in the same transaction.

## Applied State and Actual CMS Evidence

Only the new operator migration was applied on 2026-09-18 KST. The two previously
applied species/legacy migrations were not reapplied.

The PO's existing authenticated browser session remained usable at
`http://localhost:3040/admin/guides`. No credentials were requested or reused.
One inactive, unpublished draft was created through the normal CMS:

- Marker: `QA-PACK04-GUIDE-0B92A8F`.
- ID: `71ff53bb-c955-44b7-a92f-f41a595d3626`.
- Species: REPTILE only.
- Category: SAFETY.
- Normal and important semantic blocks survived save and requery.
- HTTPS source metadata survived save and requery.
- Blank optional publisher and reviewed date remained nullable.
- Create and edit returned their success routes, not the error catch path.
- Creation time was preserved; update time and operator attribution changed
  through the DB contract.
- Normal UI delete archived the draft and excluded it from the active list.
- A fresh CMS search returned zero rows; DB requery confirmed archived,
  inactive and non-null `deleted_at`.
- The audit action sequence was create, update, archive, with authenticated
  operator attribution. The recoverable archived row is retained, not purged.

The existing 29 Guide digest remained
`9d8d16c8a8da0f76cb72dbd92285f40b`; the pet digest remained
`f856d97eed13216d5fd459597158c005`. Comparisons exclude new additive columns
and Guide update timestamps. No existing user content was edited or deleted.

The final read-only provenance check identifies 25 legacy rows by their exact
fixed IDs and slugs in the retained public development seed. These are
`LEGACY_SEED` content. Four other legacy rows are `UNKNOWN_LEGACY`: three
deterministic seed-like rows and one authenticated-author record named `test`.
Their first insertion channel cannot be established from the available history.
No legacy cleanup was performed or authorized.

The 120 Pack04 rows alone satisfy the content floor: DOG 20, CAT 20, and each
of RABBIT, HAMSTER, GUINEA_PIG, FERRET, BIRD, FISH, REPTILE and OTHER 10.
Published combined counts are DOG 26, CAT 26, OTHER 25, each remaining active
species 10, and COMMON 1. Duplicate published titles are zero. The archived
CMS QA draft is excluded from these public counts.

Local evidence root:
`/private/tmp/nuri-qa/post-upgrade-product-experience-20260917/phase03-pack04`.
`guide-contract-dry-run.log` and `guide-security-regression.log` contain the
rollback-only SQL verification results, not secrets or request proofs. Browser
observations and DB requery are distinct from durable binary screenshot files.

## Security Verification and Limits

Verified: non-login/non-owner/NOBYPASSRLS execution, RLS enabled, no client role
membership, no credential secret access, no unrelated profile write,
forged/expired proofs denied, missing Guide capability denied, revoked auth
version denied, active MFA without verification denied, verified MFA accepted,
author spoofing denied, creator preserved and write replay denied. An ordinary
authenticated non-administrator direct Guide update affected zero rows.
Synthetic operator/MFA changes existed only inside a rolled-back transaction.

There were zero active enrolled MFA factors before and after this change.
Existing TOTP and session tests remain applicable; live enrolled-MFA login was
not observed and is not reported as PASS. The already authenticated CMS session
was verified; a new login was not forced for this pass.

The Guide list retains its existing 100-row query window. That displayed window
is not the remote Guide total. Storage/image-upload authorization is unchanged;
operator image upload was not exercised or expanded by this contract.

At the final continuation checkpoint the browser returned to the existing login
screen. The completed authenticated CRUD observations above are retained; no
credentials were reused, no fresh draft was created, and an expired session was
not bypassed. The fresh DB cleanup and audit checks do not depend on that session.

## Deployment Contract

The server requires `NURI_GUIDE_OPERATOR_KEY_ID` and
`NURI_GUIDE_OPERATOR_REQUEST_SECRET`. The ignored, mode-0600 file
`.nuri-admin/guide-operator.env` contains only the new Guide request key.
`scripts/provision-guide-operator-key.mjs` registers that key without printing
it, changing login/session/MFA keys or rotating an existing mismatched key.

The local CMS server explicitly loads this file in addition to the existing
deployment environment. A production deployment must securely configure the
same two server-only variables before serving this version. Never use a
`NEXT_PUBLIC_` variable or commit the key. Repository push and local validation
do not prove production deployment or production configuration completion.
Missing or mismatched keys fail closed; they do not enable service-role fallback.

Relevant primary references:
[PostgreSQL function security](https://www.postgresql.org/docs/current/sql-createfunction.html),
[PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html),
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Stop Boundary

Protected project-memory and Home files remain untouched. Home modal centering
and Timeline video retain their separate documented blockers. No unrelated
authentication, MFA, RLS, Storage, administrator domain, policy/legal, final RC
or Store work is authorized by this Guide correction.

The protected `supabase/.temp/cli-latest` was automatically refreshed by a CLI
read-only query from the recorded `v2.116.0` checkpoint. It is volatile tool state,
not product work, and remains excluded from staging and commits. The five other
protected files retain their recorded byte hashes.
