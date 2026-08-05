# NURI-12-Android·Release-QA

- 목적: Android build/signing, APK provenance, physical-device smoke, logcat, release/store gate
- 화면/code: `android`, build scripts, QA evidence; no feature screen ownership
- Supabase: only release configuration evidence; no schema ownership
- tests/docs: release checklist, QA evidence, device smoke
- 허용: build config/release metadata and evidence scripts
- 금지: feature bug fixes, data mutation, migration, provider configuration changes
- 경계: bug returns to owning domain; admin release evidence may include NURI-10
- 현재 상태: CREATE_NOW Priority 2; ANDROID-001/RELEASE-001
- 첫 작업: clean RC APK and device evidence
