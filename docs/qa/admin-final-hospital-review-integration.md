# Admin Final Hospital Review Integration

기준일: 2026-07-13

## source of truth

- 관리자 화면: `../nuri-web /admin/hospitals`
- 병원 public policy: Localdata canonical, public-safe projection, 앱 public 차단 필드 유지

## 이번 closeout 반영

- nuri-web은 동물병원 검수 export를 제공한다.
- 병원 export는 public-safe 요약과 검수 상태만 포함한다.
- 운영시간, 야간, 응급, 특수동물, 주차, 장비, 홈페이지, SNS, raw provider metadata는 public/export 기본 범위에서 제외한다.
- 병원 hard delete, 대량 자동 승인, Google/Kakao provider 설정 변경, Kakao Local global hard delete는 수행하지 않았다.

## 검증

- nuri-web lint/build/test 통과
- export route build 포함 확인
- 앱 repo Supabase dry-run remote up to date

## 조건부

실제 duplicate 비교/soft merge 실행 smoke는 QA fixture와 2인 승인 운영자 세션이 필요하다.

