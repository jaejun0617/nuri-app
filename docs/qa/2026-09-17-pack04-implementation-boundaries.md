# Pack04 Implementation Boundaries

## Resume Baseline

- Documentation baseline: `065416fa3640ac0b0ee4729d71c1cdb770e364eb`.
- Previous accepted product source: `944c99961e3259307974e4982fc4776caf5fac1f`.
- Existing uncommitted Pack04 implementation was recovered, not recreated.
- Pack03 acceptance and its canonical closeout documents remain unchanged.
- This document records implementation boundaries, not completed physical QA.

## Canonical Pet and Guide Contract

The single mobile taxonomy is `src/services/pets/species.ts`. It defines ten
active representative species and 61 selectable subtypes: DOG, CAT, RABBIT,
HAMSTER, GUINEA_PIG, FERRET, BIRD, FISH, REPTILE and OTHER.

Existing `species_group` values dog, cat and other remain compatible. The new
nullable `pets.species_key` is additive. Existing pets are not rewritten.
Legacy aliases are resolved at read time; unknown values resolve to OTHER.
An explicit species change clears the previous species' subtype. A profile
save without a taxonomy change preserves existing detail/display/breed values.

Guides retain `target_species` and plain `body`. Additive fields are
`species_keys`, `content_blocks` and `source_references`. Inclusion uses exact
canonical species or COMMON, never keyword similarity. Keywords rank only
already eligible candidates. Home enriches its existing pet context through
`useHomePetCareGuides` without editing the protected Home component.

Two reviewed migrations were applied remotely on 2026-09-17:

- `20260917090000_pack04_species_guide_platform.sql`: additive schema, canonical
  RPCs, semantic/source metadata and 120 new published guides.
- `20260917100000_pack04_legacy_species_write_compatibility.sql`: legacy writes
  synchronize canonical Guide species and plain-body rendering. A legacy pet
  compatibility-group change clears an unchanged canonical key for read-time
  resolution. It performs no bulk row update.

Dry-run transaction tests cover legacy Guide insert, legacy Guide species/body
update, canonical semantic metadata preservation and legacy pet group update.
Those tests use temporary tables, not production user mutations.

Remote published species counts, excluding deleted/inactive/future-published
rows, are DOG 26, CAT 26, RABBIT 10, HAMSTER 10, GUINEA_PIG 10, FERRET 10,
BIRD 10, FISH 10, REPTILE 10, OTHER 25 and COMMON 1. Multi-target legacy rows
can count for more than one species. Published duplicate titles: zero.
Existing 29 Guide rows and pet values were preserved, verified by before/after
digests excluding only additive columns and Guide `updated_at`:

- Legacy Guide digest: `9d8d16c8a8da0f76cb72dbd92285f40b`.
- Pet digest: `f856d97eed13216d5fd459597158c005`.

RLS was not weakened. Storage policies were not changed. New public Guide RPCs
use SECURITY INVOKER and authenticated-only execution. Old RPCs remain.

The separately versioned nuri-web Guide CMS reads and writes canonical species,
semantic roles and source metadata alongside legacy fields. No unrelated admin
navigation or global redesign is included. Production deployment is a separate
operational fact, not implied by local build or repository push.

## Home Notification Centering Blocker

Status: `BLOCKED_BY_PROTECTED_DIRTY_BOUNDARY`.

Exact conflicting file:
`src/screens/Main/components/LoggedInHome/LoggedInHome.tsx`.

The notification overlay is a local component, not a shared modal primitive.
It computes `panelTopOffset = Math.max(topInset + 78, 92)` and passes that value
as inline `marginTop` to the panel. The separate styles use a flex-start root.
Changing only `justifyContent` cannot center the actual usable viewport while
that inline margin remains. Cancelling it with another fixed margin is not a
safe viewport-based solution. A shared primitive change would not reach this
local overlay; extracting it would still require editing the protected file.

Minimum future authorization: allow a reviewed, bounded overlay placement hunk
in that protected file to remove `panelTopOffset` and inline `marginTop`, and
apply usable-viewport insets/centering with bounded long-content height. Preserve
the unrelated pre-existing Home section-order diff. No centering PASS or fake
centered screenshot is claimed in Pack04.

## Timeline Video Architecture Decision

Status: `BLOCKED_BY_ARCHITECTURE`, an explicitly allowed Pack04 outcome.

The existing picker is photo-only. Memory media/upload and thumbnail paths are
image-only. The upload path loads full-file base64/Buffer data into memory.
There is no production video player or playback lifecycle. Existing image
Timeline behavior is retained; video MIME is not placed into image columns.

A separately approved video project must resolve all of these contracts:

1. Player dependency and playback lifecycle.
2. Streaming/file-based upload rather than full-file base64.
3. Video MIME validation and server-side content checks.
4. Additive typed DB media model with legacy image compatibility.
5. Storage policy and RLS review without broad public opening.
6. Poster and thumbnail generation and failure handling.
7. Size and duration limits with actionable validation.
8. Edit/delete cleanup and ownership lifecycle.
9. Route-blur and app-background pause/resource release.
10. Large-file memory, cancellation, retry and slow-network handling.

No autoplay stub, upload hack, dependency sweep or video implementation is
included. Schema/security/storage changes for video require separate approval.

## Guide Source Boundary

Guide content is original, species-aware general-care guidance, not a diagnosis
or treatment prescription. Source metadata links to primary veterinary material:
[Merck dog routine care](https://www.merckvetmanual.com/dog-owners/routine-care-of-dogs/routine-health-care-of-dogs),
[Merck cat routine care](https://www.merckvetmanual.com/cat-owners/caring-for-cats/routine-health-care-of-cats),
[Merck rabbit routine care](https://www.merckvetmanual.com/all-other-pets/rabbits/routine-health-care-of-rabbits),
and [Merck fish routine care](https://www.merckvetmanual.com/all-other-pets/fish/routine-health-care-of-fish).
Each seeded species also retains its own source reference in the data.

## Protected Dirty and Stop Boundary

All six PO-protected paths remain outside Pack04 staging and release source.
Protected project-memory files are not updated; this separate document records
the changed implementation judgment. The volatile `supabase/.temp/cli-latest`
is excluded from commit. QA binaries remain in a local evidence directory,
not Git. Final QA, artifact hash and push result belong to the Pack04 closeout
report and must not be inferred from this implementation document.

General Phase03 remains in progress. Policy content is not final; the legal gate
is open. Final RC is not run and Store remains on PO hold. No next pack, legal
finalization, final E2E, RC, Store or video project starts automatically.
