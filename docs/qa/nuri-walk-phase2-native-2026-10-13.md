# NURI Walk Phase 2 Native Acceptance

Status: COMPLETE_PENDING_PO_REVIEW. STORE HOLD, PUSH NO, Phase 3 not started.
This is native foundation acceptance, not verified distance, server acceptance or Store approval.

## Source and Artifact

- Base: `e59360d9ce0b685868850dbd2a1fb3bbfbda78a3`.
- Implementation: `3836d20a963406b7d0455d4fd5bbdf5bb5658cca`.
- Reboot corrective and exact final APK source: `929f0320cc0ab5c82f303740ffa471bf6f0d97eb`.
- Branch/worktree: `codex/walk-phase2-native-runtime`, `/Users/shinjaejun/.codex/worktrees/walk-phase2-native-runtime/nuri`.
- APK SHA-256: `2d126608700fd1c774f9f29d7da18f7906d2a285d5a961b821e1e7730968b75c`.
- AAB SHA-256: `d268a9ea95f5f92fada91735c4eed16d22386409d248f4e658d3acb707d8358e`.
- Approved signer SHA-256: `08efb41ea4729792ce9fc3d242be9704e84a8ea3eadcbbcf1c8426884db689d3`.
- Installed APK hash matches. Main Release builds 2, Main install-r 2; auxiliary signed instrumentation APK installs 2. No third build, uninstall or data clear.
- Evidence root: `/Users/shinjaejun/.codex/nuri-walk-evidence/phase2-native-20261013-205536`.
- First artifact bundle: `2026-10-13T12-35-33-289Z-3836d20-Q3rqq6`; corrective bundle: `reboot-corrective/2026-10-13T13-47-41-643Z-929f032-Eo667c` under that root. Manifests, APK/AAB and sidecars are preserved per run.
- Post-QA documentation updates do not change runtime source and require no additional build.

## Native Contract

Private location foreground service, START_NOT_STICKY, stopWithTask=false; explicit visible start only.
No ACCESS_BACKGROUND_LOCATION, Walk boot receiver, automatic restart or new exported component.
Room schema 1 enforces one active slot. Native serial ownership, monotonic revision and encrypted
idempotency receipts outlive JS state. React snapshots contain no raw coordinates.
AES-256-GCM, non-exportable Android Keystore key, random 96-bit nonce and bound AAD protect
metadata, point chunks and command results. Wrong AAD/key and key failure reject safely without
plaintext fallback or deleting ciphertext. Finished checkpoints remain local and are not Phase 4 payloads.

## Physical S24 Evidence

Device: SM-S937N, Android 16, serial R5CY613NMSY. Initial required gates used implementation source;
the final corrective affects only segment sample ordering and was regression-tested separately.

| Gate | Result and Evidence Scope |
|---|---|
| Denied/approximate/services disabled | Stable denial, no service; `permission-matrix.json` |
| Precise start | Actual Fused samples and encrypted chunks |
| Background cold start | Denied before Room insert by real platform gate in S24 instrumentation |
| Notification denied | Capture continued; Samsung Recents Running Apps listed Pet Nuri; no drawer notification |
| Pause/resume | No samples while paused; new segment and single subscription on resume |
| Background | 180,085 ms, actual fixes +20; `background-window.json` |
| Screen off | 180,144 ms, actual fixes +20; `screen-off-window.json` |
| Task swipe | Only Pet Nuri task removed; service/session retained and reopened WALKING |
| Process stop | Controlled force-stop 1; no auto restart; same session recovered on explicit app opening |
| Finish/replay | Durable FINISHED_LOCAL, duplicate result unchanged, no further samples/service |
| Actual logout | Immediate native stop; anonymous read denied; PO restored kakaoQA directly |
| Recovery finish | Actual logout recovery finished without GPS restart; final instrumentation also passed |
| Other owner | Distinct synthetic owner on S24 cannot read/mutate; no second real-account login or upload test |

## Full Reboot: Failure and Corrective

Physical reboot count 2: one per candidate. The first reboot preserved the encrypted checkpoint,
returned RECOVERY_REQUIRED and required explicit resume, but then fresh fixes/chunks stayed at 13
for 60 seconds. The previous boot's `lastFixNs` remained in the new segment. Android's
[elapsedRealtimeNanos](https://developer.android.com/reference/android/os/SystemClock#elapsedRealtimeNanos())
is relative to boot; fresh post-reboot timestamps were rejected as older than that cursor.

Behavioral fail-first preceded the minimum cursor reset in `WalkMetadata.beginSegment`.
Historical chunks/counts, owner/pet/session identity and cumulative duration remain unchanged;
stale pre-segment and duplicate point rejection remain active. No boot receiver, sticky service,
automatic collection or schema change was added.

Final physical reboot: automatic service/capture NO; encrypted checkpoint 5 chunks preserved;
revision 2 to 3 at RECOVERY_REQUIRED; visible explicit resume kept the hashed session identity,
advanced revision to 5 and created segment 2. Over 60,084 ms, fixes/chunks increased 6 to 16.
Finish produced revision 7, 20 chunks, FINISHED_LOCAL, service/subscription stopped.
Final reboot used resume then finish; direct recovery finish uses the independent evidence above.

## Local and Native Tests

- Phase 1: 4 suites / 145 tests PASS, domain unchanged.
- Exact targeted JS: 9 suites / 185 tests PASS; paths verified before execution.
- Final native JVM: 3 suites / 13 tests PASS.
- Final S24 instrumentation: 11 / 11 PASS.
- TypeScript PASS; scoped ESLint 0 errors / 0 warnings.
- Full Jest ran exactly once: 235 passed suites / 1 failed, 2,542 passed tests / 5 failed.
  The failures were a virtual-mock resolver error in the new logout test, not a runtime failure.
  Only that test registration changed; exact targeted repair passed all 5. Consolidated coverage
  is 236 suites / 2,547 tests. This is not an all-PASS original full invocation or a repeated run.
- Initial fail-first and reboot fail-first remain separate from final acceptance.

## Preservation and Measurement Scope

- Original dirty 181 status/content hashes match; staged NONE, original HEAD unchanged.
- kakaoQA and selected pet 누리 restored; UID 10402 and FIRST_INSTALL_TIME `2026-06-02 19:16:57` preserved.
- Fine/coarse/notification flags, location enabled state, display size/density, fontScale and timeout restored.
- Accepted security 20/20, Phase 1, signer, reference APK, old records and XP preserved.
- No server schema/RPC/RLS/Storage or content mutation introduced. Existing logout/relogin auth lifecycle ran;
  remote Auth/session hashes were not resampled and are not claimed byte-identical.
- Raw real-coordinate evidence/log output 0. Observed retained app log windows: Android fatal 0,
  RN fatal 0, ANR 0. No guarantee beyond retained windows; Crashlytics/Analytics payloads were not re-audited.
- Plaintext DB absence is proven with synthetic encrypted test fixtures, not by reading real GPS data.
- Only inactive Gradle 8.9 transforms were removed under the disk-gate approval; active toolchain,
  accepted evidence, keystore and source remained intact. Second build free-space gate exceeded 25 GiB.

## Next Gate

PO reviews Phase 2. Phase 3 needs distance filtering, anti-drift, segment quality, route simplification,
minimal map QA and actual distance/battery measurements. No automatic start, push or Store action.
New native/location/persistence surfaces enter final source-frozen Security Re-Audit later.

PO 승인을 기다립니다.
