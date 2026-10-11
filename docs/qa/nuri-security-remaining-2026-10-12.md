# NURI Security Remaining Corrective Checkpoint

## Security-Only Commit Approval

PO subsequently authorized one selective local commit of the approved security
corrective, including its required dependency patch, tests and documentation.
Earlier no-commit statements remain historical; push, tag, build, install and
deployment remain unauthorized. Design, assets, caches, temporary evidence and
unrelated working-tree changes are excluded. Mixed documents retain unrelated
working-tree changes while only their security sections enter the index.

The current protected process still lacks all four signing inputs and the approved
signer fingerprint. Key read/copy policy and an approved clean Release candidate
remain separate gates. Vercel browser access now exposes production metadata
matching the existing GitHub Deployment and public health source. The separate
CLI-authenticated metadata GET returned 403 before browser login; browser success
does not prove that credential was repaired. No credential was changed by Codex.
New SEC-011 source/cutover provenance remains unestablished. This local commit
does not resolve SEC-011, authorize a Release or remove STORE HOLD.

## Authoritative Evidence

[Pre-Release Gate Report](/private/tmp/nuri-security-remaining-20261012-1WlHPZ/FINAL_REPORT.md).
This supersedes the SEC-019/020 pending-approval status in the 2026-10-10 report;
it does not supersede native, operations, signing, SEC-011, or Pro gates.

## Implemented And Verified

- SEC-019: invoker guard rejects owner counter edits; fixed-path definer trigger
  preserves normal comment like/unlike aggregation. Remote version 20261011163706.
- SEC-020: caller-visible eligible target required for RPC and direct report
  INSERT; uniform PGR02, existing actor/duplicate/rate-limit/trace preserved.
  Remote version 20261011163727.
- Five A/B SQL scripts passed with transaction rollback; named23 resource hashes
  unchanged, synthetic0, Auth/Storage/role changes0.
- Actual Jest29.7 binary + lock verified. Exact16 test paths were listed before
  execution; unexpected0. Authoritative16 suites/106 tests PASS; TypeScript PASS;
  targeted lint8 files 0 errors/0 warnings.
- INVALID_ABORTED_FILTER_RUN1 is excluded from all validation counts. A completed
  earlier compatible-regex targeted run remains non-authoritative. One subsequent
  exact-path run is authoritative. Completed targeted invocations2, full-suite0.
  Original logs preserved; remote/source/device mutation from invalid run0.

## Explicit Open Boundaries

- Findings20: resolved13/open7; HIGH1/MEDIUM4/LOW2; immediate0/Pre-Store5/Pro3.
- SEC-006/013 source ready, native NOT_RUN. SEC-008 metadata20MiB/8MIME matches
  app preflight; bytes/lifecycle NOT_RUN.
- SEC-016 remaining34 classified build13/dev16/unused5 for current Android JS;
  fresh APK/native remains pending. No dependency update in this phase.
- SEC-014 app-wrapper bypass0, SDK automatic collection and operations evidence
  remain open. SEC-015 signing/provenance/key handling remains blocked.
- SEC-011 PARTIAL_BLOCKED_DEPLOYMENT_PROVENANCE; Vercel403 + exact source required.
- All13 gap categories retain explicit residual boundaries; none claimed fully
  closed. Cross-realm same-human separation remains a measurement gap.

## Resume

PO prepares A: protected signing/fingerprint and source/key policy; B: existing
Vercel access and exact-source provenance. No secret values in chat or report.
Build0/install0/ADB0/commitNO/pushNO/cleanupNO. DEVICE_OWNER PO. STORE HOLD.
MASTER_STATE: STOPPED_WAITING_FOR_PO_EXTERNAL_RELEASE_GATES.
