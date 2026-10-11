-- SEC-008: file boundaries only; no object, ownership or count-policy changes.
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
      'image/gif', 'image/avif', 'image/bmp'
    ]
where id in ('community-images', 'memory-images', 'pet-profiles');
