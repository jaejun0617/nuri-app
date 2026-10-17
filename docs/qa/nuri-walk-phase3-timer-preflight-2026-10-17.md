# Walk Phase 3 Timer Corrective / Outdoor Preflight

## Boundary

- Base HEAD `44c9e48d15983d032b057117375e080365bb9773`, tree `ad6a04dc7408841a9eb54944089856727405e9f8`. Latest Walk presentation `3c403f2017319378c6f4cdfa8a48b4210101f292` and performance corrective `eb7283fe9a080e747302be8b6558bc4668cc66cd` are in the same ancestry. No integration cherry-pick is required.
- Local branch `codex/walk-phase3-final-physical-20261017`; original repository dirty181 is not staged, reset or reconciled. Push NO, STORE HOLD, Phase4 NO.
- Evidence root: `~/.codex/nuri-walk-evidence/phase3-final-physical-20261017-ixo6k8/`. Source/artifact/device identity receipts are external, not product assets.

## Exact Defect / Minimal Corrective

- The displayed time used `snapshot.elapsedActiveMs` directly. Native GPS and durable checkpoint production normally occur every5 seconds; the native1Hz event limit only throttles events and does not produce a1Hz clock. Therefore the displayed elapsed time jumps between snapshots even though native duration accounting is monotonic.
- `WalkElapsedMetric` interpolates only the visible active-time text from a native duration anchor using `performance.now()`. Only that child updates every second. Native snapshots reconcile the anchor without counting the same interval twice or moving backwards during a continuous foreground walk.
- Pause/recovery/result, synthetic previews and location-only design review do not extrapolate. Background/unmount stops the JS timer; foreground performs a guarded read-only native refresh. A new session resets the anchor. The map does not rerender per display tick.
- Native GPS sampling, distance policy/engine, route projection, FGS, encryption, Room, receipt schema, backend, Level/XP and existing small fonts/layout are unchanged. Display interpolation is not a new canonical duration source or server result.

## Local Evidence

- Behavioral fail-first: `01:00` remained `01:00` after one second instead of `01:01`. An earlier test setup failure (`AppState.currentState` auto-mock) is separately preserved, not claimed as the product reproduction.
- Final focused tests:2 suites/53 tests PASS. Broader pre-corrective Walk checks:8 suites/216 tests PASS; intermediate corrective checks:9 suites/231 tests PASS. The foreground refresh test initially invoked an obsolete mocked listener; the final generation guard rejects obsolete callbacks before reading native state.
- Full Suite before the new timer request:260 suites/3174 tests PASS at base HEAD. Final corrective source:261 suites/3190 tests PASS, exactly once after code edits. Total full invocations this task2, no aborted or hidden failing full run.
- TypeScript PASS. Scoped ESLint5 files:0 errors/0 warnings. Existing native distance/segment tests:2 suites/19 tests PASS before presentation-only edits; no native delta. The first non-app Gradle test selection is explicitly not counted as native coverage.
- Initial indoor READINESS: first actual fix, pet photo LOADED, follow/free-look/recenter and pause freeze observed. Resumed revision4 from paused revision3. Finish/receipt checksum/QA-only route cleanup PASS; service stopped. No outdoor distance/drift accuracy verdict is inferred.

## Release / Device Gate

- Corrective source commit, fresh QA Release, install-r and timer-specific S24 checks are pending this document's initial checkpoint. Final receipts and a documentation-only update will record actual outcomes; this is not a build or device PASS declaration.
- Requested screenshot set:10 public synthetic states plus4 seasonal WALKING screens,14 images, after the final candidate is installed. No actual location screenshots or raw route export.

## Physical Handoff Remains Blocked

- OPEN_A independent reference:1000m, supplied by PO. URBAN reference:미정, explicitly confirmed by PO. Do not substitute OPEN_A for URBAN or configure a fabricated reference.
- Some current receipt summary fields (`pauseDistanceDeltaM`, `endpointLoss`, `segmentMerge`, `gapBridgeM`) are constants, not independent measured proof. Future physical verdicts require observed evidence and must not treat those zeros alone as PASS. Native evidence schema is not changed by this UI corrective.
- OUTDOOR_QA_READY:NO until the independent URBAN reference and final preflight gates are satisfied. PHYSICAL_QA_STARTED:NO. Phase3 remains implemented pending physical evidence; Phase4 is not opened. No outdoor walking, reboot protocol, server mutation or automatic next phase is performed here.
