import fs from 'node:fs';
import path from 'node:path';
import { COMMUNITY_CREATE_PHOTO_LIMIT } from '../src/screens/Community/communityPostEditor.shared';

it('keeps five photos and ownership checks while removing the PO-rejected upload time quota', () => {
  const migration = fs.readFileSync(
    path.join(
      __dirname,
      '../supabase/migrations/20261008181510_community_remove_image_upload_window_limit.sql',
    ),
    'utf8',
  );
  const canonical = fs.readFileSync(
    path.join(__dirname, '../docs/sql/커뮤니티/커뮤니티-운영-최종.sql'),
    'utf8',
  );
  const body = migration.match(/as \$\$([\s\S]*?)\$\$;/)?.[1];
  expect(body).toBeDefined();
  expect(canonical).toContain(body);
  expect(COMMUNITY_CREATE_PHOTO_LIMIT).toBe(5);
  expect(body).toContain('current_post_upload_count >= 5');
  expect(body).not.toContain('recent_upload_count');
  expect(body).not.toContain("interval '10 minutes'");
  expect(body).toContain('assert_community_actor_id_is_active(actor_id)');
  expect(body).toContain('path_segments[1] <> actor_id::text');
  expect(body).toContain('p.user_id = actor_id');
  expect(body).toContain('p.deleted_at is null');
  expect(body).toContain("p.status = 'active'");
  expect(migration).not.toMatch(
    /create policy|alter table|delete from|insert into/i,
  );
});

it('changes only the time-window declaration and quota block from the previously deployed guard', () => {
  const readBody = (file: string) =>
    fs
      .readFileSync(
        path.join(__dirname, '../supabase/migrations', file),
        'utf8',
      )
      .match(/as \$\$([\s\S]*?)\$\$;/)?.[1];
  const before = readBody(
    '20261008180014_community_image_five_photo_limit.sql',
  );
  const after = readBody(
    '20261008181510_community_remove_image_upload_window_limit.sql',
  );
  expect(before).toBeDefined();
  expect(after).toBeDefined();
  const expected = before
    ?.replace('  recent_upload_count integer := 0;\n', '')
    .replace(
      / {2}select count\(\*\)\n {2}into recent_upload_count[\s\S]*? {2}end if;\n\n/,
      '',
    );
  expect(after).toBe(expected);
});
