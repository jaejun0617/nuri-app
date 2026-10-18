# Walk Timer Scheduling / Anchor Diagnostic

## Approved boundary

Exact base665438efa27e4daab791fb70ac28b2c4be4dfef4, tree d20961a4f900c1c169d151a023d086a15fc2af82. Navigation72482ea, performance eb7283f and Walk410d13d are ancestors. Original repository181 dirty paths and both hashes match the approved baseline.

The current PO authorizes timer diagnosis and a confirmed minimal corrective, at most one diagnostic and one corrective QA Release/install. Outdoor QA, physical reboot, server, distance/FGS/Room/encryption, Home entry and navigation changes are excluded. URBAN_REFERENCE remains UNDECIDED. The temporary Home entry remains until physical closeout and separate PO removal approval.

Evidence root: `/Users/shinjaejun/.codex/nuri-walk-evidence/timer-final-20261018-1Z01GU`.

## Existing timing contract

- Owner: WalkElapsedMetric leaf under WalkView.1000ms JS interval, performance.now monotonic projection, millisecond floor followed by second floor in metricTime.
- The native foreground service checkpoints every5000ms; native snapshot events are throttled to at most1Hz. Throttle is not a1Hz producer. getSnapshot reads the stored timing; it does not advance the native checkpoint clock.
- Every activeMs/session/ticking change reconciles Math.max(nativeMs, prior local projection), then resets the anchor timestamp. No drift threshold exists. The interval effect depends only on ticking, not snapshots.
- PAUSED/recovery/synthetic states use frozen native values. AppState clears the anchor and stops the interval while backgrounded. On foreground the parent issues a read-only GET asynchronously; the child can restart before that GET resolves. Session replacement resets the anchor. Unmount removes the listener and interval.
- Leaf timer state does not rerender the parent, map, route, weather or whole sheet. Native snapshots separately update the parent; unchanged route revisions do not request a route projection. These are distinct sources of render work.

## Diagnostic candidate

The diagnostic candidate preserves the current timer algorithm. A bounded2000-event QA-only in-memory ring correlates snapshot receipt, anchor computation, nominal interval deadline, callback, state set and React layout commit. Session identity is hashed; only scalar allowlisted arguments enter the trace. No per-tick logging or file writes. Explicit export writes one scalar JSON per experiment, then clears memory. Export uses the already installed file bridge. Store gate is closed.

nativeSnapshotMonoMs means JS receipt time, not an invented native sample timestamp. renderCommitMonoMs means React layout-effect commit, not physical display presentation. frameObserved is false until an independent safe observer exists. Opening the existing QA inspector unmounts the presentation, so scenario start/end boundaries must exclude those transitions.

Initial behavioral fail-first reproduces an early frame-boundary callback: callback at999.6ms repeats the prior second and no next callback arrives by1050ms.17 other timer contracts pass. This is a deterministic vulnerability, not yet the device root-cause classification. No corrective is applied before correlated S24 measurement.

## Gate ownership

External final report/receipt owns exact candidate hashes, scenario durations, event counts and device verdicts. TIMER_DEVICE_EXIT_GATE remains NOT_PASS during diagnosis. No full suite is repeated on the diagnostic source; the single required full run belongs to the final corrective product source. Diagnostic targeted output preserves the expected behavioral failure separately from build/type/test harness errors.

## Correlated S24 diagnosis and minimal corrective

Diagnostic source a31f91d completed indoor static605s, map185s, pause/resume245s and AppState165s observations. The PO independently reported intermittent holds in minutes3-4, then normal cadence. The static trace has12 long holds in minute3 and14 in minute4; none from minute6 onward. There is one committed337-to339 second jump within the independent605s observation window. Polling can miss briefly displayed seconds, so observer skipped values are not counted as actual app jumps.

Classification: MIXED_CONFIRMED. A nominal1000ms interval actually spaced at median1001.168ms accumulated phase drift. Snapshot reconciliation also published projected elapsed between interval callbacks even when anchor correction was zero, creating short/long pairs of visible seconds. Static React layout commit delay peaked at24.147ms, not a one-second render stall. The data does not justify blaming MapView or a long JS stall. Foreground additionally discarded a still-valid anchor before an asynchronous GET returned a stored checkpoint.

The corrective changes only the elapsed leaf: one owned timeout schedules the next absolute elapsed-second boundary, early callbacks retry with a16ms minimum, stale/equal checkpoints neither reanchor nor publish, and an active monotonic anchor survives background until native state invalidates it. Native duration ahead of projection remains authoritative; late callbacks show real time, never fabricated intermediate seconds. Pause/recovery/session replacement invalidate anchors. Native runtime, map geometry, route projection, navigation and Home entry remain unchanged.

Expanded fail-first had3 behavioral failures and21 passes before the corrective, without a compilation failure. Native accessibility-node observation is independent of React commit but is not compositor/pixel evidence. Final device results and cleanup below supersede the earlier pending verdict.

## Final indoor device exit, 2026-10-19

Corrective runtime: `6f4d5cdf7ff39bc504f85d34e7d88951b02a1869`. Installed QA Release SHA256: `b5d8775a18dfcd24f8d2cec3b87a9a01a9e651203d49de1c0143c646006fbe75`. Approved signer and installed bytes match; debuggable, cleartext and backup are false. Final HEAD may include documentation-only closeout; no product bytes change after this runtime commit.

| Scenario | Observed duration | Result |
| --- | --- | --- |
| Foreground static | 605.075 seconds, 5,861 native-node reads | 0 committed or node jumps/decreases/holds over1,500ms; commit gaps977.623-1,016.303ms, node gaps918-1,039ms |
| Pan/zoom/free-look/recenter | 185.066 seconds | FOLLOW/FREE_LOOK observed; 0 active jumps/decreases/holds; maximum commit gap1,009.678ms |
| Pause/resume | 245.076 seconds | Native987,794ms frozen for60.039 seconds with0 ticks, then continuous resume; maximum active commit gap1,017.813ms |
| Background/foreground | 165.056 seconds | Background20 seconds with0 ticks,125 seconds after return; no active jumps/decreases/holds, valid anchor retained |
| Recovery required | 35.097 seconds | Controlled app process loss, not device reboot; native1,355,087ms and displayed22:35 frozen,0 ticks, service stopped |
| Explicit recovery resume | 20.008 seconds | Same owned session,1,355 to1,375 seconds without skips/decreases |
| New session | 15.080 seconds | Different owned session, initial native9,997ms instead of prior session duration; observed14 to29 seconds without skips/decreases |

TIMER_DEVICE_EXIT_GATE: PASS within these indoor observation limits. The PO also reported that the corrective was naturally increasing one second at a time. Diagnostic traces total3,226 events; corrective traces total2,685 events. Each export stays below2,000 and drops0. Static corrective tick lateness maximum25.126ms and React layout commit delay maximum22.777ms. Maximum concurrent scheduler ownership is1; pause/background/unmount stop the owner. Timer-leaf updates do not change route projection or rerender Map/parent/weather/sheets. The final static export separately contains219 Map and220 host commits caused by parent/native updates, not630 timer ticks; route revision remained constant.

Evidence limits remain explicit. The1,500ms hold threshold identifies the reported visible long/short cadence, not a claim of perfect1,000.000ms scheduling. Independent native-node polling is about100ms and is not physical display-frame capture. Initial inspector-close remount accepted an authoritative native correction of2,971.399ms7.651 seconds before the final605-second window; this setup transition is preserved, not hidden or counted as steady cadence. Intentional pause/background gaps and first partial observation intervals are excluded. At resume the QA parent's context can lag the child effect by0.058ms, so owner start/stop and native pause values establish boundaries rather than one stale state label. No outdoor accuracy or reboot claim is made.

## Validation, preservation and stop

- Final targeted15 suites/344 tests, native unit4 suites/29 tests, TypeScript and scoped ESLint0 errors/0 warnings PASS. Full Suite271 suites/3,354 tests PASS exactly once on the final product source. Documentation-only closeout does not repeat it.
- Diagnostic Release/install1 plus corrective Release/install1, total2/2. No third build. Two signing preparation rejections happened before Gradle because the supplied signer assertion was malformed; they are preserved separately and are not successful builds. Metro/Fast Refresh OFF.
- Available logs and Android exit history show fatal0, RN fatal0 and ANR0. Two debug Crashlytics configuration lines initially matched an overbroad classifier; the verified result excludes those initialization lines only. Full message bodies were not retained. An early identity read while install was still pending is not used as final evidence; the completed/final identity receipts match the corrective APK.
- Owned READINESS sessions3 are cleaned through the existing Wizard. Canonical sanitized receipts3 remain on device and were copied with privacy allowlist and canonical digest validation. Existing user results remain. Service OFF, trace buffer CLEARED, temporary routes0. Deleted only20 local raw trace/observer files,9 manifest-owned device trace exports and2 observer jars; raw snippets were removed from summary windows. Raw trace remaining0, actual map screenshots0, raw coordinate evidence0. Source, APK/build caches and canonical evidence are preserved.
- Original repository HEAD657dd597dbea5fb6b93d79901f0eea05ed745e02,181 dirty paths, status SHA23228f58bd6a23341fe84799783a55ee9ae3a059357f8946e9b26d615c668827 and content SHAe25464c4036b84fdb9b399b18eda8e34222052d69d2921bfc31a9d31aafe2c8a remain unchanged. Home temporary entry, Navigation, performance, native distance/FGS/Room/encryption and server/progression source are unchanged. Account/UID/first install/permissions/settings are preserved. No remote mutation or new remote security audit was performed; security20/20 is a preserved baseline, not a fresh full audit.
- OUTDOOR_TECHNICAL_READY YES; URBAN_REFERENCE UNDECIDED; OUTDOOR_QA_READY NO; PHYSICAL_QA_STARTED NO; Phase3 IMPLEMENTED_PENDING_PHYSICAL_QA; Phase4 NO. Home entry remains until physical closeout and separate removal approval. Store HOLD, push NO, auto-start-next NO. Device owner PO, control STOPPED, master STOPPED_WAITING_FOR_PO_TIMER_FINAL_REVIEW.

The external `FINAL-REPORT.md` and `FINAL-RECEIPT.json` in the evidence root own exact final HEAD/tree, documentation commit and complete scalar evidence references. Next action is PO timer review only.
