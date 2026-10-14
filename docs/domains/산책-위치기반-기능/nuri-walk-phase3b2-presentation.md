# Walk Phase 3B2 Presentation Candidate

## 2026-10-15 Copy/weather row and label-only Walk CTAs

- Subsequent PO direction makes the main CTA consistently seasonal in all ten states: primary fill/pressed fill/white label, including start/resume/recovery and confirmation's `계속 걷기`. Keep the result-close action, red finish CTA and disabled future-record actions unchanged. No action is added or enabled. Follow-up fail-first24 retained; final2 suites/135 tests, TypeScript, ESLint0/0 and Metro200 PASS; no build/install/commit/push.
- All ten states share one row: small supporting copy on the left, actual Home weather on the right. Use this row in informational panels for pre-walk/recovery/confirmation/results and in the active bottom sheet otherwise. Render each summary once. Keep the row at narrow width/fontScale1.3, wrapping text inside bounded columns instead of stacking weather below copy.
- Remove icons from product Walk CTAs and the minimize-confirmation pair; preserve header/map/QA inspector tool icons. Keep existing compact15sp labels, touch geometry, disabled/read-only handling and finish-confirmation actions. Use the existing destructiveConfirm palette for the filled red finish CTA, including its pressed state; do not create a new red or seasonal destructive palette.
- Weather remains frameless/background-free. Map/panel surfaces, seasonal pause,40dp pet marker and actual weather/cache source remain unchanged. This does not authorize native/engine/Wizard/server changes, captures, build/install, commit or push.
- Fail-first26 failures retained. Final targeted4 suites/118 tests, TypeScript, ESLint0/0 and Metro200 PASS. Original181 dirty and protected324 files unchanged, staged0. PO visual approval pending; STORE HOLD.

## 2026-10-15 Actual weather across every QA state

- PO explicitly requested actual weather for all ten QA states, including the synthetic route/state gallery. This supersedes the previous synthetic-weather boundary only; public map/route fixtures and anonymous pet photos remain unchanged.
- Every state uses the same Home current-snapshot/freshness reader. Remove synthetic weather generation from WalkWeatherChip. Missing or expired actual data shows `날씨 확인 중`, never a sunny fixture fallback. No additional location/network collection or weather-store mutation is introduced.
- Add the missing weather summary to finish confirmation; exactly one summary renders per state. Remove the weather background/rounded frame, retaining the icon, temperature, condition, compact typography and existing spacing. Do not remove map/panel/control backgrounds or borders.
- Since gallery weather is now actual, do not label whole-screen captures as fully synthetic public evidence. No device capture was performed in this iteration.
- Final actual-weather fail-first21 assertions preserved. Final targeted3 suites/100 tests, TypeScript and ESLint0/0 PASS; Metro bundle200. Original181 dirty and protected324 files unchanged, staged0; native/engine/server/build/install/commit/push0. STORE HOLD; PO visual review pending.

## 2026-10-15 Pet photo overlay corrective candidate

- PO confirmed the previous candidate still showed an empty ring. The prefetch-driven `LOADED` receipt was not proof of visible photo pixels; the preceding readiness corrective did not pass the visual gate.
- Render the existing pet Image as a regular RN sibling above MapView, not a custom Marker child subject to Android snapshot rendering. Use the installed map SDK's `pointForCoordinate` for screen placement, including camera rotation/tilt/padding. Keep route segments and the static start marker native; do not change filtered GPS, camera ownership, distance, service or server contracts.
- Coalesce camera events to at most20Hz, with one in-flight projection per target lifetime and no continuous polling. Cancel queued work and ignore stale replies on target loss/change or unmount. Hide unavailable projection rather than inventing a viewport-center position. The overlay does not intercept map touches.
- After confirming photo display, PO requested a slightly smaller marker:44→40dp circle,36→32dp photo and22→20dp fallback glyph. Overlay dimensions and projection centering share the same size constant. Keep the2dp canonical seasonal border. Derive image status only from Image.onLoad/onError, never cache preparation. Missing/failed profiles keep paw fallback; public gallery never receives private image URIs. No new dependency or native build is needed. The smaller geometry awaits PO review through Metro.
- Fail-first3 assertions preserved; targeted5 suites/104 tests, TypeScript and scoped ESLint0/0 PASS. PO subsequently confirmed `펫 사진이 정상으로 보여요`, closing the photo-display visual gate only. This is not whole-screen design approval, physical-walk QA or Release authorization. Evidence uses the existing refinement root's `overlay-*` files and `MARKER_OVERLAY_REPORT.md`. Actual location/photo capture0; build/install/commit/push0; STORE HOLD. Await the next PO direction without automatic implementation.

## 2026-10-15 Pet marker readiness corrective

- The selected profile URI was present and independently loadable on S24, while the map marker stayed in `LOADING`. Do not treat URI propagation or unit tests as proof of Android marker pixels.
- Prepare the same profile URI through native Image.prefetch, keyed by URI, independently of the detached map view's Image.onLoad event. Ignore completion after unmount/URI change. Failed or missing images retain the paw fallback; public gallery never prepares private profile images.
- After readiness is committed, explicitly redraw the native map marker and stop temporary view tracking after the bounded refresh window. No GPS, heading, distance, route, server or profile-storage change.
- QA diagnostics expose only photo input presence and enum load state, never URI/photo bytes/coordinates. S24 state changed from `PRESENT/LOADING` to `PRESENT/LOADED`; final visual approval remains PO-owned. Development Fast Refresh recovery is not a Release build or installed-artifact validation.

## 2026-10-15 Latest PO refinements

- This section supersedes the first reference follow-up below. `함께 걸은 거리` remains the current native session candidate, not Lifetime. Both metric captions and values are centered in equal-width areas; compact local typography remains unchanged.
- Walking, paused and acquiring headings are omitted. Their supporting copy shares a row with the existing Home weather cache summary. Hide GPS product indicators only; native signal processing remains unchanged. No new location/network request or stale weather claim is introduced.
- Personal local preview uses the selected pet photo and Home weather cache. Public gallery keeps anonymous photo fallback; subsequent explicit PO direction now connects actual Home weather to every QA state as described above. Actual mode pins the active session pet. Subsequent smaller marker geometry is40dp circle/32dp cover photo; no marker tail or bearing.
- Main controls use labels/icons only, a 48dp compact face inside the preserved 84dp touch area. Walking pause uses canonical seasonal primary fill with a seasonal pause glyph on a light icon disc. Resume stays centered; finish retains neutral 1dp/8dp-radius Community-style outline with semantic action color.
- PO subsequently authorized a current-location map for design review only. An explicit QA-inspector action checks existing location permission and requests a single SDK position. It never starts a walk/watch/FGS, persists coordinates, issues Wizard mutations or supplies distance-engine samples. The map-review point is transient UI state, cleared on mode/owner/screen/background boundaries; denied/unavailable results never use fixture coordinates. Controls retain candidate visuals but cannot issue walk actions in review mode. Distance/time are unmeasured, not synthetic walk totals.
- Normal actual mode still requires native filtered fixes; the new display-location input is supplied only to the explicit design-review path. Public fixtures never use that input. No actual location capture, outdoor QA or device setting changes are authorized.
- Current run receipts: `/Users/shinjaejun/.codex/nuri-design-evidence/walk-refinements-20261015-oMKsFb`. Native/engine/Wizard/server/XP unchanged. No new Release, install, commit, push or outdoor QA. PO visual review pending; STORE HOLD.

## 2026-10-15 PO walking-screen reference follow-up

- This follow-up is presentation-only in the existing Metro review worktree. The prior Release/build/install requirements below belong to the accepted Phase 3B2 iteration; they do not authorize a new build, install, commit or push now.
- Use the PO reference's header/map/bottom-panel composition with compact local type: title18, body13, caption12, metric28. Existing AppText family and scaling stay enabled. Larger text stacks controls; only panel information scrolls, keeping actions outside the scroll view.
- Show current-session distance as `이번 산책 거리`, describe pause as stopping distance recording, and derive GPS status labels from existing presentation states. No fake weather, new weather fetch, native policy or server changes.
- Use the existing Google renderer with neutral dark map styling, seasonal route/ring, and circular photo clipping with paw fallback. Reserve the sheet overlap in map padding and recenter placement. Preview/actual exclusion, segment boundaries and camera ownership remain unchanged.
- Evidence: `/Users/shinjaejun/.codex/nuri-design-evidence/walk-active-20261015-0bg8p8`. PO reviews directly through Metro; no new device capture, physical walk, build/install, commit, push or Store approval.

## Authority and exit boundary

- Base: `bec56de63f93558baf9fc6ad36c7f4ec596a453c`, tree `bb3b54ce8eedc6e7d20e291d5c7657d18292ec43`.
- This is a QA-gated product presentation candidate, not Phase 3 completion or final app Design/Handling approval.
- Native distance policy, encrypted Room, service, typed bridge, durable Wizard commands and sanitized receipt remain unchanged. Actual route pages remain bounded to 512 points.
- Local validation, one final full suite, scoped commit, one QA Release/install-r and indoor S24 review are required. Outdoor accuracy, battery/performance and Phase 4 remain pending.
- Current per-run receipts: `/Users/shinjaejun/.codex/nuri-walk-evidence/phase3b2-presentation-20261014-dWMUVu/`. Accepted Phase 3A/B evidence remains at its original root.

## Presentation contract

- NURI seasonal identity with Mamitalk-inspired gentle hierarchy, restrained surfaces and friendly controls. The official public reference is [Mamitalk](https://mmtalk.kr/); no third-party assets or screen copies are shipped.
- Full-screen Google map, no bottom tabs. High-contrast header, distance/time HUD and reachable controls; existing AppText, icons, theme and CTA palettes only.
- Current moving position is a circular pet photo with a thin seasonal ring. Missing/failed images use the existing paw glyph. Public fixtures never use real pet photos.
- Heading is not exposed by the current typed bridge; do not fabricate bearing or rotate a marker from unreliable data. There is no location-radius circle.
- Route halo plus exact Timeline CTA accent; each native segment renders independently. Colors: `SEASON_CTA.spring/summer/autumn/winter.primary`; no duplicated palette or seasonal geometry.
- Font scaling remains enabled. Numeric emphasis is local to Walk, independent of screen width. Controls stack at narrow width or fontScale 1.3, with minimum 48dp icon and 56dp primary targets.

## Mode, state and privacy

- Public synthetic state gallery is compile-time QA-gated, fixed public geometry, separate from native distance/persistence. Local season selection never changes the saved app season.
- Actual mode never renders fixture geometry. Before the first native filtered fix the map is absent; the first actual fix owns the initial camera. Drag means free-look; explicit recenter restores follow.
- Preview cannot start/pause/finish native sessions. Actual start is an explicit READINESS Wizard action; PHYSICAL protocol creation still requires independent reference distances and later PO outdoor approval.
- Back/minimize never finishes an active session. Recovery requires visible resume or finish action. Finish requires confirmation.
- FINISHED_LOCAL displays only this walk's local distance/time/speed candidate, quality and encrypted device storage. No server acceptance, Lifetime, Level, XP, memory creation or RecordCreate navigation.
- Future record CTA is disabled, fixture-only. Existing Wizard configuration, steps, recovery marker, skip and scoped cleanup remain accessible in the QA inspector.
- Diagnostics default collapsed; opening the opaque inspector unmounts the map. Only scalar allowlisted counters/status/version are displayed, never whole JSON, coordinates, route, raw identities, ciphertext, token or profile URL.
- Public fixture screenshots only. Actual maps/routes/photos are not captured. Indoor actual checks do not imply outdoor accuracy or sunlight readability PASS.

## Review order

- Initial S24 candidate reproduced a QA mode button overlapping Android navigation and a synthetic label dimmed behind the result veil. Preserve both initial screenshots; consolidate the UI-only corrective once, with QA mode switching inside the opaque inspector and the mode label above state overlays.
- The result exit closes this QA modal; it does not claim Home navigation. A static outlined start point avoids font-snapshot timing, and is rendered only when the bounded page actually contains the session start.
- PO explicitly approved one additional full-suite run on corrective source. First full PASS remains historical evidence; the corrective full and second permitted Release/install have separate per-run receipts. Native engine regression is not repeated.

Phase 3A/B -> Phase 3B2 candidate -> PO visual approval -> Phase 3C outdoor QA -> Phase 3D return review/corrective -> Phase 3 completion -> Phase 4.

Security 20/20 stays frozen. Original dirty181 is preserved outside the candidate worktree. No push, remote/server/XP changes; STORE HOLD.
