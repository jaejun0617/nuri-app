# NURI Android Release Artifact Procedure

이 문서는 debug APK, local QA release APK, Store release APK를 파일명만으로 혼동하지 않도록 하는 canonical 절차다.

Release entrypoint prerequisite는 [NURI Node/Yarn Toolchain](node-yarn-toolchain.md)의 Node `24.20.0`과 Yarn `3.6.4`다. release script는 build 전에 공용 toolchain guard를 실행한다.

## 명령

- QA artifact: `yarn android:release:qa`
- Store artifact: `yarn android:release:store`
- 기존 APK 검증: `yarn verify-release-apk <apk> --source-head <40-char-head> --variant release --signer <certificate-sha256>`
- toolchain 확인: `yarn verify-js-toolchain`
- immutable dependency install: `yarn install --immutable`

`android:release:store`는 `NURI_UPLOAD_STORE_FILE`, `NURI_UPLOAD_STORE_PASSWORD`, `NURI_UPLOAD_KEY_ALIAS`, `NURI_UPLOAD_KEY_PASSWORD`가 모두 protected process에 존재하지 않으면 실패한다. 값은 출력하거나 파일·argv·evidence에 저장하지 않는다.

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

하나라도 실패하면 artifact는 `REJECTED`다. Store path는 signing input 부재 시 fail-closed이며 QA path와 Store path는 명령·artifact 이름으로 분리한다.

## 범위

이 절차는 build/signature/artifact identity gate만 다룬다. Product feature QA, Supabase 변경, Store upload, publish, rollout은 포함하지 않는다.
