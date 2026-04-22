# PetTravel Remote Drop Readiness - 2026-04-22

## Status

- 이번 턴에서는 remote table/RPC drop을 실행하지 않는다.
- 앱 런타임에서 PetTravel route, menu, screen, hook/service/map/test 의존성은 제거된 상태다.
- remote migration 이력은 과거 운영 히스토리로 남긴다.

## Drop 전 선행 조건

- 구버전 앱 차단 또는 강제 업데이트 정책 적용
- production traffic에서 PetTravel table/RPC 호출이 0인지 확인
- Supabase logs에서 관련 RPC/table 접근이 없는 기간을 운영자가 확정
- backup/export 보관 여부 결정
- rollback 필요 시 복구 SQL 준비

## 후속 Migration 초안

```sql
begin;

-- 구버전 앱 차단 이후에만 실행한다.
-- 실제 object name은 remote catalog 확인 후 확정한다.
drop function if exists public.search_pet_travel_destinations cascade;
drop function if exists public.pet_travel_public_query cascade;
drop table if exists public.pet_travel_source_records cascade;
drop table if exists public.pet_travel_destinations cascade;
drop table if exists public.pet_travel_change_log cascade;

commit;
```

## 후속 Checklist

- [ ] remote catalog에서 실제 PetTravel object 목록 캡처
- [ ] 앱 최신 버전 강제 업데이트 또는 구버전 write/read 차단 확인
- [ ] 7일 이상 관련 API 호출 0 확인
- [ ] backup/export 완료
- [ ] migration dry-run
- [ ] production drop 실행
- [ ] post-drop 앱 cold start, More menu, location domain smoke

## Risk

- 구버전 앱이 남아 있으면 remote drop 이후 해당 화면에서 hard error가 발생할 수 있다.
- table 이름과 RPC 이름을 repo 추정으로 drop하면 운영 object drift를 놓칠 수 있으므로, 실행 직전 remote catalog 기준으로만 확정한다.
