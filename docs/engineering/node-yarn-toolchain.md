# NURI Node/Yarn Toolchain

NURI의 JS install·test·Metro·Android entrypoint는 다음 조합을 기준으로 한다.

- Node `24.20.0` (24 LTS line)
- Yarn `3.6.4`
- Yarn linker는 기존 `.yarnrc.yml`의 `node-modules`를 유지한다.

NVM을 사용하는 환경에서는 `.nvmrc`와 `.node-version`을 모두 `24.20.0`으로 유지한다. `.nvmrc`는 NVM의 project pin이고 `.node-version`은 다른 version manager가 읽을 수 있는 동일한 보조 pin이다.

## 시작 절차

1. NVM 환경에서는 repository root에서 `nvm use`를 실행하여 `.nvmrc`의 Node `24.20.0`을 선택한다. 새 login shell의 NVM default도 `24.20.0`이어야 한다.
2. 다른 version manager를 사용하는 환경에서는 `.node-version`을 읽도록 Node `24.20.0`을 선택한다.
3. Node 24 환경에서 Corepack을 활성화한다. 시스템 Node나 전역 Yarn 1을 삭제하지 않는다.
4. 다음 명령으로 project pin을 확인한다.

```text
node --version
yarn --version
yarn verify-js-toolchain
```

기대값은 각각 `v24.20.0`, `3.6.4`다. 일반 `yarn --version`이 Yarn 1을 반환하면 install/build를 시작하지 않는다.

## Immutable install

```text
yarn install --immutable
```

lockfile 변경이 발생하면 install을 성공으로 보지 않는다. Node/Yarn guard는 Android QA release와 Store release, React Native Android/Metro entrypoint에서 먼저 실행된다.

## Guard negative test

실제 runtime을 변경하지 않고 guard 동작만 확인할 때는 test-only override를 사용한다.

```text
NURI_TOOLCHAIN_GUARD_TEST=1 bash scripts/verify-js-toolchain.sh --test-node-version 25.0.0 --test-yarn-version 3.6.4
NURI_TOOLCHAIN_GUARD_TEST=1 bash scripts/verify-js-toolchain.sh --test-node-version 24.20.0 --test-yarn-version 1.22.22
```

각 명령은 `FAIL`과 exit code `2`가 기대값이다. 이 옵션은 package script나 실제 build 경로에서 사용하지 않는다.
