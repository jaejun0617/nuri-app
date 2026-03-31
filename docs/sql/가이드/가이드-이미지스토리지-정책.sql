begin;

insert into storage.buckets (id, name, public)
values ('guide-images', 'guide-images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "guide_images_public_read" on storage.objects;
create policy "guide_images_public_read"
on storage.objects
for select
to public
using (bucket_id = 'guide-images');

drop policy if exists "guide_images_admin_upload" on storage.objects;
create policy "guide_images_admin_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'guide-images'
  and public.is_guide_admin()
);

drop policy if exists "guide_images_admin_update" on storage.objects;
create policy "guide_images_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'guide-images'
  and public.is_guide_admin()
)
with check (
  bucket_id = 'guide-images'
  and public.is_guide_admin()
);

drop policy if exists "guide_images_admin_delete" on storage.objects;
create policy "guide_images_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'guide-images'
  and public.is_guide_admin()
);

commit;
