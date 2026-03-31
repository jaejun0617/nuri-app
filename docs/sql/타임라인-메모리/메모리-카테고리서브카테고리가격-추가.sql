-- 이 파일은 memories 카테고리/서브카테고리/가격 컬럼을 운영 프로젝트에 추가할 때 쓰는 공용 기능 추가 SQL이다.
-- `public.memories.category`, `sub_category`, `price`와 관련 check constraint를 관리한다.
-- 문서용 source of truth는 아니고 수동 release bundle이므로, linked remote에 이미 같은 컬럼이 있는지 먼저 확인한 뒤 적용해야 한다.
-- `docs/sql/공용/누리-전체초기구성-부트스트랩.sql`과 일부 memories 컬럼이 겹치더라도, 이 파일은 해당 기능만 따로 붙이는 용도로 유지한다.

alter table public.memories
  add column if not exists category text,
  add column if not exists sub_category text,
  add column if not exists price integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'memories_price_check'
  ) then
    alter table public.memories
      add constraint memories_price_check
      check (price is null or price >= 0);
  end if;
end
$$;
