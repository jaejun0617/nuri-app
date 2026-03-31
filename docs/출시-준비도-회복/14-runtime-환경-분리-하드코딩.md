# 액션 4. Runtime 환경 분리 및 하드코딩 제거

상태: 검증 필요
최종 갱신: 2026-03-30
우선순위: P1

## 배경

- runtime 설정은 배포 후 유지보수성과 보안 위생에 직접 연결된다.

## 현재 문제

- `src/services/supabase/config.ts`와 `src/config/runtime.ts`는 local-only 파일이지만 실제 값이 하드코딩돼 있다.
- `src/services/monitoring/config.ts`는 tracked 파일에 Sentry DSN이 남아 있었다.
- 프로젝트에는 공식 env 주입 라이브러리가 아직 없다.

## 목표

- 현재 앱을 깨뜨리지 않는 최소 범위에서 tracked 하드코딩을 줄인다.
- local-only 관리 원칙과 남은 환경 분리 항목을 문서화한다.

## 작업 목록

- [x] tracked monitoring DSN 기본값 제거
- [x] local-only 파일과 tracked 파일 경계 문서화
- [ ] Supabase / Kakao / TourAPI 공식 env 주입 경로 도입
- [ ] build variant별 secret 주입 체계 확정

## 현재 분리 상태

| 파일 | 현재 상태 | 비고 |
| --- | --- | --- |
| `src/services/supabase/config.ts` | local-only | `.gitignore`에 포함 |
| `src/config/runtime.ts` | local-only | `.gitignore`에 포함 |
| `src/services/monitoring/config.ts` | tracked 기본값 | 이번 턴에 DSN 기본값 제거 |

## 검증 결과

- `./scripts/collect_release_readiness_snapshot.sh` 실행으로 아래를 확인했다.
  - `src/services/supabase/config.ts`: local-only
  - `src/config/runtime.ts`: local-only
  - `src/services/monitoring/config.ts`: tracked DSN 없음

## 완료 기준

- tracked 코드에 공개용 DSN/키가 남지 않는다.
- local-only 파일과 예시 파일의 경계가 문서로 고정된다.

## 리스크

- 현재는 공식 env 주입 라이브러리가 없어 Supabase/Kakao/TourAPI는 여전히 local-only 파일 의존이다.
- 무리하게 env 시스템을 도입하면 Android/iOS 부팅 경로를 깨뜨릴 수 있다.

## 다음 액션

- 공식 env 주입 방식을 별도 승인 후 도입하고, local-only 파일을 예시/CI 검증과 함께 전환한다.

## 상태

- 검증 필요
