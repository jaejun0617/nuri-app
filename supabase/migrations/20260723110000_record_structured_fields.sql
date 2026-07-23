-- NURI 기록 입력값을 문자열 제목/태그와 분리해 보존한다.
-- 기존 레코드는 빈 metadata와 nullable 반려동물 기본값으로 그대로 호환된다.

alter table public.memories
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.pets
  add column if not exists default_meal_amount_grams numeric(7,2);

alter table public.pets
  drop constraint if exists pets_default_meal_amount_grams_check;

alter table public.pets
  add constraint pets_default_meal_amount_grams_check
  check (
    default_meal_amount_grams is null
    or (
      default_meal_amount_grams > 0
      and default_meal_amount_grams <= 99999.99
    )
  );

comment on column public.memories.metadata is
  'Typed category-specific record metadata. Legacy rows keep an empty object.';

comment on column public.pets.default_meal_amount_grams is
  'Per-pet default meal amount in grams. Null means no default is configured.';
