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

Expanded fail-first had3 behavioral failures and21 passes before the corrective, without a compilation failure. The corrective device verdict remains pending. Native accessibility-node observation is independent of React commit but is not compositor/pixel evidence. Final device results and cleanup are recorded externally without changing the exact installed runtime identity.
