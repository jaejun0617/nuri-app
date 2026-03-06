# Maestro Flows

## 준비

- Android package: `com.nuri.app`
- 에뮬레이터/실기기에서 앱 실행
- 아래 환경변수 설정

```bash
export E2E_EMAIL="qa-login@nuri.dev"
export E2E_PASSWORD="password1234"
export E2E_RECORD_TITLE="QA 자동 기록"
export E2E_DELETE_EMAIL="qa-delete@nuri.dev"
export E2E_DELETE_PASSWORD="password1234"
```

## 실행

```bash
yarn test:e2e:smoke
yarn test:e2e:account
```

## 범위

- `login-record-crud.yaml`
  - 로그인
  - 기록 생성
  - 기록 수정
  - 기록 삭제
- `account-delete.yaml`
  - 로그인
  - 전체메뉴
  - 회원탈퇴
