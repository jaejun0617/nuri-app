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

- Corrective source `23993fa52bfaccc8d707e984c5aa0e7a4bc39ee4`, tree `350a9187160a1cba57c3d502a9a691a3a9340974`. New QA Main Release1/install-r1; no initial rebuild was necessary before the exact timer defect. No second corrective build, push or Metro.
- APK SHA-256 `9cc3d1e72438cd1f47adfbcd32e868ee385a735cca81b762cf43611a5427570e`; AAB `bfc6a316a43ac33e88f6999e54b2ac694cd4a0334eb3284b1bc696612eccb63d`. Approved signer `08efb41ea4729792ce9fc3d242be9704e84a8ea3eadcbbcf1c8426884db689d3` matches; APK flags debuggable/cleartext/backup false, embedded JS, installed SHA and separate AAB signature verification PASS.
- S24 UID10402, firstInstallTime `2026-06-02 19:16:57`, account/pet flow, permissions,1080x2340/density450/fontScale1.0/screen timeout and location setting preserved. No uninstall, clear-data or account change. Both owned READINESS sessions ended, checksummed allowlisted receipts and QA-only route cleanup PASS; final tracking service OFF and app returned Home. Older unrelated finished checkpoints were preserved.
- Requested screenshot set completed:10 public state screens plus4 seasonal WALKING screens,14 unedited1080x2340 PNGs in external `qa-screenshots/`. All14 decode and match SHA manifest. Map/route/profile/metrics are fixtures; existing Home weather summary is retained without region text. No actual location screenshots, user profile photos or raw route export. `qa-screenshots/README.md` is the design reference index.

## Timer Residual — NOT PASS

- PO observed normal one-second updates, but occasional brief holds followed by a two-second jump. This observation supersedes any assumption that passing unit tests means the device symptom is fully resolved. TIMER_DEVICE_EXIT_GATE:NOT_PASS.
- Pause freeze verified at `01:13` and later `03:29`; resume and finish operate, service stops. The original sparse-checkpoint display dependency is corrected, but the residual cause is NOT_CONFIRMED. JS scheduling, frame delivery and native-anchor reconciliation are hypotheses, not findings.
- The UI hierarchy inspector failed once waiting for an idle screen during continuous updates. Two read-only accessibility-event attempts did not yield timer text; the reviewed attempt saw48 app events but no exported duration text. Neither is quantitative1Hz proof. No actual-map screen recording was used as a workaround.
- The304667ms automated indoor sample reports CPU peak5.35%, PSS peak549346KiB, thermalMax0 and app-vsync late5643/9759. These are limited app-level estimates, not a timer-correlated JS trace or Google Maps GPU verdict. They do not establish the residual root cause or a physical performance PASS.
- The approved minimal corrective build/install has been used. Do not tune thresholds, slow elapsed time to hide skipped seconds or make an unmeasured second build. The next proposed task is an explicitly scoped timer scheduling/anchor diagnostic, approved before another candidate build.

## Physical Handoff Remains Blocked

- OPEN_A independent reference:1000m, supplied by PO. URBAN reference:미정, explicitly confirmed by PO. Do not substitute OPEN_A for URBAN or configure a fabricated reference.
- Some current receipt summary fields (`pauseDistanceDeltaM`, `endpointLoss`, `segmentMerge`, `gapBridgeM`) are constants, not independent measured proof. Future physical verdicts require observed evidence and must not treat those zeros alone as PASS. Native evidence schema is not changed by this UI corrective.
- OUTDOOR_QA_READY:NO until the timer device gate and independent URBAN reference are resolved. PHYSICAL_QA_STARTED:NO. Phase3 remains implemented pending timer closure and physical evidence; Phase4 is not opened. No outdoor walking, reboot protocol, server mutation or automatic next phase is performed here.
- Original181/status/content hashes unchanged; protected source44 files match before. Native/engine/server/XP/progression delta0, accepted security baseline20/20 preserved, not re-audited. No linked remote query or remote mutation was performed. Runtime commit remains unchanged by the final documentation-only closeout; exact final HEAD is recorded externally.

PO 승인을 기다립니다.
