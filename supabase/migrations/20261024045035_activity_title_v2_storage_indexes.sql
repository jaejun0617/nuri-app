-- Stable row identity and FK coverage for long-lived award history and deletion.
alter table title_private.nuri_title_awards_v2
 add column id uuid not null default gen_random_uuid() primary key;
create index nuri_title_awards_v2_pet on title_private.nuri_title_awards_v2(pet_id);
create index nuri_title_awards_v2_title on title_private.nuri_title_awards_v2(title_id);
create index nuri_remembrance_records_v2_pet on title_private.nuri_remembrance_records_v2(pet_id);
