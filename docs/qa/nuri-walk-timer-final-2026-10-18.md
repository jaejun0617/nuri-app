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
