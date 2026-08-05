# NURI-12-Android·Release-QA

- 목적: Android build/signing, APK provenance, physical-device smoke, logcat, release/store gate
- 화면/code: `android`, build scripts, QA evidence; no feature screen ownership
- Supabase: only release configuration evidence; no schema ownership
- tests/docs: release checklist, QA evidence, device smoke
- 허용: build config/release metadata and evidence scripts
- 금지: feature bug fixes, data mutation, migration, provider configuration changes
- 경계: bug returns to owning domain; admin release evidence may include NURI-10
- 현재 상태: CREATE_NOW / ACTIVATE_PRIORITY_2 sequence position 6; ANDROID-001/RELEASE-001 및 AUTH-001 회귀 지원
- 첫 작업: clean RC APK, Google/Kakao 회귀, device evidence
- bootstrap/write: `BOOTSTRAP_READY` 전까지 `WRITE_LOCKED`; 기능 버그는 owning room으로 반환
