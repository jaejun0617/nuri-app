# SEC-008 fixture and decode-path corrective

## Scope and diagnosis

Parent source: `fb438180a9dc586a88d4c9b9945f29d774396dd3`.
Only the compile-time-gated Storage QA harness, public fixtures, tests and
per-run release evidence handling change. No Auth/session, production upload,
SQL/RLS, credentials, dependency, SEC-011 or SEC-014 changes.

`QA_IMAGE_DECODE_FAILED` does not establish a Storage authorization failure.
In the installed RN 0.87.1 source, ImageLoaderModule.getSize calls
`ImagePipeline.fetchEncodedImage`. The actual Fresco 3.7.0 AAR bytecode and
[upstream source](https://github.com/facebook/fresco/blob/v3.7.0/imagepipeline/src/main/java/com/facebook/imagepipeline/core/ProducerSequenceFactory.kt)
show that encoded fetch supports network, local file and content URI, not data URI.
The decoded-image display pipeline supports data URI separately. The old QA
called getSize on a data URI, so even valid pixels hit an unsupported scheme.
This establishes DATA_URI_NATIVE_LIMIT, not a general product decoder defect.

The previous 5,248-byte HEIC fixture independently fails host pixel decode
(`sips`), although metadata reports 64x64. The same tool successfully decodes a
HEIC control converted from an existing public repository PNG. This old fixture
is not an acceptable valid-image fixture. Exact previous native-generated
JPEG/PNG bytes were not retained; do not invent their length or hash.

## Exact fixtures

No user media or production asset is modified. The new fixtures derive from
the existing public `src/assets/auth/providers/kakao-symbol.png`, using installed
macOS sips only. Each is host-decoded at 72x72, has correct magic/MIME/extension,
valid padding, no whitespace and byte-exact base64 roundtrip.

| Format | Bytes | SHA-256 |
| --- | ---: | --- |
| JPEG | 2138 | 9cc62a03b311399dcc1b85979a8ca7d35716de48a678a4c727326b52db222949 |
| PNG | 1949 | 7f379bd82e1384d2e6a874ea90e74b566f627824813c149bf0e39b66bfc6fb91 |
| HEIC / HEIF container | 1922 | 6b1d157d7b810c67e7e23b8ca63989dde6b7a7508b8db79c53a8b7ed3019c328 |

HEIF is the same HEVC-coded HEIF container under the supported image/heif MIME
and .heif extension; it is not a separate codec test.

## Native acceptance contract

Download through the existing signed-read path. Check byte equality, write only
the public fixture to a fixed-name app cache file, verify its SHA-256, getSize
through `file://`, and await the QA preview Image.onLoad. Metadata dimensions
alone are not called pixel/display proof.

Per-format receipts retain upload, read, byte equality, file hash, native size,
actual display, temporary-file absence, delete and server absence separately.
A display failure remains a format compatibility failure but does not erase
Storage lifecycle receipts or prevent independent negative size/MIME checks.
Only fixed event/status values are logged. No signed URL, session, user ID or
full local path is logged. A failure does not produce a false display PASS.

Exact-prefix cleanup covers all server and local temporary fixture paths.
The recovery journal is removed only after absence is verified. Failure leaves
the journal for the existing resumable cleanup path. No existing object, Auth
user, pet, post or memory is mutated. Store mode keeps the QA module disabled.

## Evidence handling

The canonical wrapper allocates a unique timestamp/commit run directory before
preflight. It preserves existing APK/AAB/sidecars before Gradle replaces outputs.
The input manifest goes to that run, never the caller's previous manifest file.
Fresh artifacts and sidecars are captured into the same run with hashes and
exclusive file creation. Signing inputs are never part of this copy operation.

The prior /private/tmp evidence roots were already absent at task entry. Do not
claim they were preserved or reconstruct their historical contents. The current
83223cbd APK, its sidecars and AAB were preserved and hash-checked before edits.

## Validation and remaining gate

Jest 29.7.0 uses --runTestsByPath and listTests before execution. Targeted harness,
Store gating and evidence tests, TypeScript, scoped ESLint and shell syntax must
pass. This QA-only corrective does not require another product full-suite run.

Native acceptance is still pending. The canonical signing wrapper requires
the previously approved APK at
`/private/tmp/nuri-ui-approved-release-IIRKj1/nuri-f6d284d-approved-release.apk`
with SHA-256 `ccf759ca28c51aa7b034b49b2511037840203c22da37c6fd42937c28b674f98b`.
That file is absent in the current environment. Do not substitute the current
candidate, bypass the hash check, rediscover credentials or start a blind build.
Restore the exact approved artifact before the single candidate build/install
and native lifecycle run. SEC-008 remains OPEN; STORE HOLD.
