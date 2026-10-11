# Auth transition corrective and native acceptance contract

## Scope and source

- Parent: `657dd597dbea5fb6b93d79901f0eea05ed745e02`.
- SEC-006, SEC-013 and isolated SEC-008 runtime evidence only. No SQL/RLS,
  credential, provider, SEC-011, dependency or product-design changes.
- Original working tree and its 223 unrelated dirty paths stay untouched.
- This document describes the source contract. Native PASS requires the exact
  candidate evidence; local tests alone do not close a finding. STORE HOLD.

## Confirmed causes

The installed Supabase SDK persists a session and awaits `SIGNED_IN` listeners
before `exchangeCodeForSession()` returns. NURI cleared explicit-logout suppression
after that return. Its listener could resolve an anonymous boot in between, with
no subsequent event to publish the new valid session. A fail-first integration
test reproduces that ordering for Google and Kakao.

The callback screen also unconditionally replaced itself with SignIn on failure,
including unsolicited callbacks received while an authenticated session existed.
A separate fail-first screen test reproduces that incorrect route.

A same-user `TOKEN_REFRESHED` event incremented the identity-resolution generation.
An additional fail-first test proves that this invalidated an in-flight callback's
profile readiness, although the user had not changed.

## Single transition owner

AppProviders owns session validation, profile/pet readiness and `resolveBootRoute`.
An accepted callback suppresses only its intermediate SDK `SIGNED_IN`; after a
successful exchange it clears explicit logout and awaits that same owner. The
callback screen applies the owner's route once. No delayed Home push, navigation
retry, provider-specific reset or new navigation timer is used.

Rejected/cancelled callbacks revalidate the current session using the owner.
They do not issue signOut or remove credentials. A genuinely invalid server
session still follows the existing invalid-session policy. Duplicate delivery
shares one in-flight completion and does not publish a second auth transition.

Same-user token rotation updates tokens without invalidating identity readiness.
Cold boot and nickname/pet onboarding continue to use the existing route contract.

## Secret-free runtime evidence

The bounded auth trace contains fixed event names, monotonic sequence and relative
time only. No callback URL, code, state, verifier, token, email or arbitrary error
payload is accepted. Secure-storage receipts contain version/booleans only and
are emitted after verified native write/readback and verified legacy-key absence.
A later failed write cannot inherit the previous operation's successful receipt.

The QA-only screen runs one official `refreshSession()` and a protected user read.
It separately exercises native migration using a public non-credential marker in
an isolated key, then removes that fixture. It never copies a real session back
to plaintext. Synthetic native migration proof must not be mislabeled as a fresh
migration of a legacy real session already removed by the previous candidate.

## Isolated Storage lifecycle

Only a server-verified general-user `kakaoQA` session may run fixtures. The
`memory-images/<own user>/SECURITY_QA_SEC008_<random id>/` namespace uses fixed
filenames and no post/memory rows. Remove/list capabilities are checked before
upload. A non-secret exact-prefix journal permits cleanup after interruption;
another owner's namespace is rejected. Cleanup runs in `finally` and must leave
zero objects before the journal is removed.

JPEG/PNG use native-generated public pixels. HEIC/HEIF use a public synthetic
ImageIO-encoded fixture, not user media. Every successful valid upload requires
download-byte equality, native image decoding, deletion and empty listing.
Size/MIME DENY requires explicit Storage error contracts; unrelated network/auth
failures remain unverified. A spoofed MIME acceptance is a separate residual
content-validation candidate, not hidden by successful cleanup.

The native QA module is absent unless the compile-time QA flag is true. The
canonical wrapper forces it false for Store and true only for QA mode. It exposes
only fixed synthetic-pixel generation, no arbitrary path, credential or command
API. The screen has no public deep-link entry. All server RLS still applies.

## Required native acceptance

One clean exact-commit Release build and one install-r. Google must reach Home
immediately after a valid callback; authenticated rejection must preserve Home.
Verify anonymous rejection, provider cancel, Kakao success, cold restart, actual
TOKEN_REFRESHED and secure receipts. Verify isolated image lifecycle and zero
remaining objects against fresh remote preservation metadata.

If the first candidate reproduces the auth failure, stop using its fixed event
trace. No blind second build. Keep SEC-011, SEC-014 and Pro gates separate.
Final runtime outcomes belong to the evidence report, not this prospective contract.
