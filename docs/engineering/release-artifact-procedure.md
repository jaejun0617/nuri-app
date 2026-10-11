# NURI Android Release Artifact Procedure

이 문서는 debug APK, local QA release APK, Store release APK를 파일명만으로 혼동하지 않도록 하는 canonical 절차다.

Release entrypoint prerequisite는 [NURI Node/Yarn Toolchain](node-yarn-toolchain.md)의 Node `24.20.0`과 Yarn `3.6.4`다. release script는 build 전에 공용 toolchain guard를 실행한다. Android native build 전후 disk 기준은 [NURI Native Build Disk Hygiene Policy](disk-hygiene-policy.md)를 따른다.

## 명령

- QA artifact: `yarn android:release:qa`
- Store artifact: `yarn android:release:store`
- 기존 APK 검증: `yarn verify-release-apk <apk> --source-head <40-char-head> --variant release --signer <certificate-sha256>`
- toolchain 확인: `yarn verify-js-toolchain`
- immutable dependency install: `yarn install --immutable`

QA와 Store Release 모두 `NURI_UPLOAD_STORE_FILE`, `NURI_UPLOAD_STORE_PASSWORD`, `NURI_UPLOAD_KEY_ALIAS`, `NURI_UPLOAD_KEY_PASSWORD`가 protected process에 존재하지 않으면 실패한다. 직접 Gradle Release task에도 같은 누락 차단을 적용한다. 정적 QA signing fallback은 사용하지 않는다. 값은 출력하거나 파일·argv·evidence에 저장하지 않는다.

두 build 명령과 verify 명령은 승인 signer fingerprint를 담은 `NURI_APPROVED_SIGNER_SHA256`가 없으면 artifact 검증을 시작하지 않는다. 이 fingerprint는 secret이 아니지만 명령 출력과 evidence에는 verifier 결과만 남긴다.

## Artifact 이름

- `nuri-<short-head>-qa-release.apk`
- `nuri-<short-head>-store-release.apk`

`release`, `signed`, `upload`라는 문자열은 승인 근거가 아니다. verifier가 실제 APK를 검사한 결과만 유효하다.

## 필수 gate

- `assembleRelease` 실행
- exact source HEAD 기록 및 일치
- build variant `release`
- application ID `com.nuri.app`
- version name/code 기록
- manifest `debuggable=false`
- manifest `usesCleartextTraffic=false`
- `assets/index.android.bundle` 존재
- 승인 signer 일치
- APK SHA-256 기록
- APK static signature 검증 성공

하나라도 실패하면 artifact는 `REJECTED`다. QA와 Store 모두 signing input 부재 시 fail-closed이며 두 path는 명령·artifact 이름으로 분리한다.

## 2026-10-10 Security Corrective Gate

현재 signing 환경변수 4개가 미주입 상태이므로 build/install은 보류한다. 기존 보호된 shell/process 주입만 사용하며 별도 secret manager 연동은 이 runbook에서 확인되지 않았다. `NURI_APPROVED_SIGNER_SHA256`도 별도로 필요하다.

공식 preflight는 clean exact-commit source를 요구한다. 현재 commit/push 금지 및 dirty 보존 지시를 우회하지 않는다. 또한 기존 input preflight는 keystore fingerprint를 읽고 별도 checkout일 때 복사할 수 있으므로, 현재 PO의 keystore 읽기·복제 금지와 함께 실행할 수 없다. 환경 준비만으로 이 제약이 해소됐다고 간주하지 말고 source/input 취급 절차에 대한 PO 결정을 먼저 받는다. 기존 키를 읽거나 옮겨서 해결하지 않는다.

## 범위

이 절차는 build/signature/artifact identity gate만 다룬다. Product feature QA, Supabase 변경, Store upload, publish, rollout은 포함하지 않는다.
