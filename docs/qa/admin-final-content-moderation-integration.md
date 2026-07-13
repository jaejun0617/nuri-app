# Admin Final Content Moderation Integration

기준일: 2026-07-13

## source of truth

- 관리자 화면: `../nuri-web /admin/reports`, `../nuri-web /admin/community`
- 앱 read-path: `src/services/supabase/community.ts`

## 이번 closeout 반영

- nuri-web은 신고/콘텐츠 export, soft action audit, undo/rollback 계약을 유지한다.
- 앱 `fetchCommunityPostById`는 hidden/private/deleted row를 직접 상세 접근에서도 `null`로 처리한다.
- hard delete는 구현하지 않았다.
- author/reporter raw id, raw email, raw phone은 관리자 export에 포함하지 않는다.

## 검증

- `communityReadPathPolicy.test.ts`: hidden/private/status hidden/deleted direct detail 차단
- 앱 focused tests: 1 suite / 4 tests 통과
- 앱 typecheck/lint/diff check 통과

## 조건부

실제 production soft hide/unhide, app feed/search/count/cache 원상복구 smoke는 운영자 세션과 QA fixture가 필요하다. 이번 문서는 코드 read-path 방어와 테스트 완료를 기록한다.

