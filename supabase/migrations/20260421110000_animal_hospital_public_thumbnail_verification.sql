-- 동물병원 썸네일은 자동 외부 검색 결과가 아니라 운영 검수된 URL만 public projection에서 소비한다.

comment on table public.animal_hospital_verifications is
  '동물병원 field-level 검수 근거. public projection은 phone/coordinates/thumbnail approved record만 소비한다.';

drop policy if exists "animal_hospital_verifications_read_public_safe" on public.animal_hospital_verifications;
create policy "animal_hospital_verifications_read_public_safe"
on public.animal_hospital_verifications
for select
to anon, authenticated
using (
  status = 'approved'
  and field_key in ('phone', 'coordinates', 'thumbnail')
  and (expires_at is null or expires_at > timezone('utc', now()))
);

create or replace function public.animal_hospital_approved_verifications(hospital_ids text[])
returns table (
  id uuid,
  animal_hospital_id text,
  field_key text,
  status text,
  verified_value jsonb,
  verification_source text,
  reviewer_id uuid,
  reviewed_at timestamptz,
  expires_at timestamptz,
  note text,
  evidence jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.id,
    v.animal_hospital_id,
    v.field_key,
    v.status,
    v.verified_value,
    v.verification_source,
    v.reviewer_id,
    v.reviewed_at,
    v.expires_at,
    v.note,
    v.evidence,
    v.created_at,
    v.updated_at
  from public.animal_hospital_verifications v
  join public.animal_hospitals h on h.id = v.animal_hospital_id
  where v.animal_hospital_id = any(hospital_ids)
    and h.is_active = true
    and h.is_hidden = false
    and v.status = 'approved'
    and v.field_key in ('phone', 'coordinates', 'thumbnail')
    and (v.expires_at is null or v.expires_at > timezone('utc', now()));
$$;

grant execute on function public.animal_hospital_approved_verifications(text[]) to anon, authenticated;
