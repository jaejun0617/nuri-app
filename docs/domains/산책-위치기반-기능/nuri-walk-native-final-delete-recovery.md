# Walk Native/client final-delete recovery

2026-10-21. Source implementation and local validation; Android release/device proof remains with NURI-12. This adds the Native/client half of the already-applied [server receipt contract](nuri-walk-final-deletion-receipt.md). It does not change that contract, global deletion policy, applied SQL or Record/XP/progression.

## Reason and Ordering

The F confirmed-only journal could replay a received final deletion result but could not prove a lost remote result after process death. Fresh explicit V2 deletion intents now use the registered server watch; empty lookups, grace, zero rows and absent resources remain non-proof.

1. Native `CAPTURE_FINAL_CLEANUP` creates/reuses an exact owner/account-or-pet scope, UUID and 32-byte SecureRandom capability. Encrypt and verify committed AtomicFile envelope/readback before any network call. No secret enters logs, reports, Room plaintext or AsyncStorage.
2. Explicit caller recovers the same identity first. Only an unavailable, never-bound watch can prepare, with the captured owner/foreground AbortSignal and the existing 15s adapter deadline. Persist and read back the exact server resource binding before permitting the existing destructive call.
3. Native `ARM` fences and quiesces only that captured scope before fallible journal persistence. Durable `UNKNOWN` includes an independent deletion-attempt counter, not a Walk runtime revision. No destructive continuation before readback. Recovery never starts GPS.
   Account's existing create-request result is bound through `onRequest`/Native ACCOUNT_REQUEST before `delete_my_account` dispatch. A different restore request cannot release that armed attempt. The pre-binding window cannot have dispatched that destructive RPC; an explicit authoritative cancel can still release the matching account scope without inferring FINAL.
4. Restart scans the bounded committed cleanup journal, including unconfirmed V2 intents, without Auth reads or selection dependency. Empty journal and legacy unconfirmed entries make no RPC. Capability-only recover/ACK use the existing adapter's public-key/body transport, not a global JWT or refresh queue.
5. Only exact bound FINAL can durably CONFIRM. Receiving FINAL in REGISTER also quiesces/fences before a fallible write. A committed FINAL proof fences future collection even before confirmed-flag persistence; STEP still refuses erasure until durable confirmation.
6. Purge exact owner/pet JS drafts/queries and paged Native PRODUCT plus owned V1 QA data. Native cursor/nativeDone are durable. Only then server ACK, persist ACKNOWLEDGED, then verified physical local ACK/removal. Recovered ACKNOWLEDGED skips an invalid second FINAL-only ACK call.

Unknown, aborted prepare, malformed response, disk failure and uncertain destructive outcomes retain the same identity/data. A failed initial `.new` promotion is not committed proof. Existing AtomicFile base/.bak recovery, envelope readback, verified deletion, encryption key/AAD and V1 confirmed bytes remain compatible. No Room migration.

## Collection and Restore Boundaries

Watch lifecycle is separate from destructive-command outcome. PENDING alone neither confirms deletion nor releases an armed UNKNOWN command. Ordinary logout/grace preserves the encrypted outbox/drafts and never automatically resumes collection.

- An actual account result with `actualStatus=pending_grace_period`, `canRestore=true` can durably mark RESTORABLE and release only that captured attempt. Existing compatibility completed/grace logout remains unchanged.
- A definite Pet SQL transaction rollback in the narrow existing error-code allowlist can release the same attempt. Transport errors, empty responses, generic failed statuses and guesses cannot.
- After process death before that grace callback, the existing explicit `cancelAccountDeletion(requestId)` durably captures the global request ID and same-owner account watch/attempt before its unchanged RPC. A local intent-persistence failure blocks that RPC before dispatch. Only its matching authoritative cancelled result plus a still-PENDING exact watch can release collection fencing as RESTORED. A late result cannot release a newer attempt or another owner. No deletion, data purge, Auth refresh or automatic GPS occurs.
- Source review confirms SignIn clears the gate and returns to Splash after restore, while the existing gate query selects only pending grace. The same cancel RPC's replay behavior is not assumed or newly remotely tested. Restart therefore reads the **existing** owner-RLS `account_deletion_requests` row by the durably captured exact ID/owner, with an abortable 15s scoped deadline. Only the explicit `status=cancelled` row plus the same still-PENDING watch releases that attempt. Missing/denied/other-status rows do nothing; no automatic cancel, absent-gate inference or new RPC/policy is introduced. A committed newer attempt invalidates the old restoration intent.
- A restoration receipt/network/disk failure remains pending, not a fabricated success. Global restore success is never reclassified by post-response local failure. Mount/foreground and an event-only cached-owner-ready retry drain pending intents, including Auth hydration after the initial null-owner drain. No Auth read/refresh queue or interval is added. Old unbound restoration attempts from before this protocol cannot invent a global request binding; those remain an exact legacy-cohort privacy/release obligation if present.

Server transaction-start timestamps can invert under lock contention. Native validates normalized timestamp formats, state-required nullability, immutable binding/registeredAt/confirmedAt/acknowledgedAt and monotonic receipt state; it does not impose a new wall-clock chronology policy.

## Bridge Handoff

- Existing product command: `CAPTURE_FINAL_CLEANUP` now creates V2, usable with QA gate false.
- `finalCleanupCommand(op,ticket)`: PENDING, READ, ARM, STEP, ACK; compatibility CONFIRM only replays an already-confirmed V1 journal.
- Added `finalCleanupProof(op,ticket,input)`: REGISTER, CONFIRM, RELEASE, ACCOUNT_REQUEST, RESTORE_INTENT. Receipt proof contains only the server wire fields. RELEASE includes exact captured attempt plus narrow NOT_STARTED, ROLLED_BACK, RESTORABLE or RESTORED evidence; RESTORED also requires the durably bound global restoration request.
- AppProviders reuses the scoped recovery observer for mount/foreground and cached owner changes; it does not join the existing Auth/Home fetch queues. No polling, background GPS start, QA fixture shortcut or permission change is added.

Invalid/missing/replayed cleanup capabilities stay narrow cleanup-domain outcomes, not an instruction to stop a foreign owner's FGS. Genuine shared Keystore/database failure behavior remains unchanged. The existing notification purpose-dispatch shim from B2 is preserved, not reworked here.

## Validation and Limits

External `NATIVE-DELETE-RECOVERY-REPORT.md/.json` owns exact source, targeted results and initial failures. Tests use synthetic protocol values, mocked network and isolated host SQLite/injected cipher/platform ports. They do not constitute Android Keystore, real Room/AtomicFile/React bridge/FGS or durable Auth-deletion HTTP proof. NURI-09's prior server SQL/HTTP/race receipts remain separate, unchanged evidence.

Legacy V1 confirmed entries replay safe cleanup. Legacy unconfirmed/unregistered entries are retained, never retroactively promoted; existing absent resources, missing capabilities or invalidated Keystore cannot be repaired from an empty lookup. The actual installed legacy cohort is uninspected in this source-only batch. Fresh V2 proof does not erase this residual or authorize deleting unrelated/foreign data.

### NURI-12 Remaining Gates

1. Run the one newly authorized final Full Suite on the reviewed clean source. Preserve the old 288/3592 run with three failures and its separate 3/10 affected PASS; do not relabel it green.
2. Approved-signature QA Release/install-r only, verify exact APK/source, no uninstall/clear-data/logout. Inspect existing session ownership before a short explicit PRODUCT smoke. Under-40s target, pause by45s, no Memory/XP/milestone creation, no actual-map capture or coordinate export.
3. Verify actual bridge/Room/Keystore/FGS and same-ID encrypted finish/restart with existing runtime flows. Host's ignored `WalkPersistenceTest.androidKeystoreAeadIsNonExportableAndRejectsWrongAad` is NOT a device PASS.
4. Auxiliary instrumentation source `com.nuri.walk.WalkFinalDeletionDurabilityTest#realKeystoreRoomAtomicFileV2ReadbackRestartAckAndForeignScope` uses the existing AndroidJUnit4/AndroidJUnitRunner, uniquely named no-backup test DB/journal, actual existing Keystore key without rotation/deletion, and synthetic local proof only inside the test APK. It calls no RPC/Auth/location/FGS/production bridge; only its own temporary files are removed. It checks V2 readback/reopen, actual AtomicFile orphan/promotion/removal behavior, exact foreign-row preservation and ACK replay. Reopening objects/Room is not a physical process-kill result or actual bridge/FGS proof. Its source has not been built/run on Android here.
5. PO explicitly approved one same-signer isolated auxiliary test APK build/install-r (call_af9a4aed86ea49f78908a6b2b633bd75); execution remains pending NURI-12 serial dispatch after this Owner locks and Master reviews. Existing `nuriSecurityQa=true` selects release instrumentation; runner is `androidx.test.runner.AndroidJUnitRunner`, target package `com.nuri.app`, expected default test package `com.nuri.app.test` (verify built manifest). Do not uninstall/replace/clear the production APK, real user data or key. Use the existing approved signing helper. Actual V2 Android/process-loss and existing product bridge/FGS gates remain separate. Do not delete a PO account/pet or add a shipping proof-injection shortcut.

Build/install/ADB/Metro/remote mutation/new Full Suite in this Owner batch: zero. Timer/marker/engine/geometry/permissions/key/Room schema/global Auth deletion policy remain unchanged. Push NO, Store HOLD, unrelated phases not started.
