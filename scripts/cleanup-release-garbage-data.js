/* eslint-env node */

const { createClient } = require('@supabase/supabase-js');

const PET_GARBAGE_ID = '86ea4d55-602d-4540-9a66-bfae8b62e52e';

function requireEnv(name) {
  const value = `${process.env[name] ?? ''}`.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function createRestClient() {
  const url = requireEnv('SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  async function request(path, init = {}) {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`rest_request_failed:${response.status}:${text}`);
    }

    return text ? JSON.parse(text) : null;
  }

  return { client, request };
}

function buildInFilter(values) {
  return values.join(',');
}

async function main() {
  const { client, request } = createRestClient();
  const qaPosts = await request(
    "posts?select=id,title,status,created_at&or=(title.like.%5BQA%5D%25,title.eq.%ED%85%8C%EC%8A%A4%ED%8A%B86)&order=created_at.asc",
  );
  const postIds = qaPosts.map(row => row.id);

  let storageRemovals = [];
  if (postIds.length > 0) {
    const assets = await request(
      `community_image_assets?select=id,storage_bucket,storage_path,post_id&post_id=in.(${buildInFilter(
        postIds,
      )})`,
    );

    const bucketMap = new Map();
    for (const asset of assets) {
      const bucket = `${asset.storage_bucket ?? ''}`.trim();
      const path = `${asset.storage_path ?? ''}`.trim();
      if (!bucket || !path) {
        continue;
      }

      if (!bucketMap.has(bucket)) {
        bucketMap.set(bucket, []);
      }
      bucketMap.get(bucket).push(path);
    }

    for (const [bucket, paths] of bucketMap.entries()) {
      const { error } = await client.storage.from(bucket).remove(paths);
      if (error) {
        throw error;
      }

      storageRemovals.push({
        bucket,
        removedPaths: paths.length,
      });
    }
  }

  const cleanupSummary = await request('rpc/cleanup_v1_release_garbage_data', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  const [remainingPosts, remainingPet] = await Promise.all([
    request(
      "posts?select=id&or=(title.like.%5BQA%5D%25,title.eq.%ED%85%8C%EC%8A%A4%ED%8A%B86)",
    ),
    request(`pets?select=id&id=eq.${PET_GARBAGE_ID}`),
  ]);

  const verification = {
    remainingPosts: remainingPosts.length,
    remainingPetRows: remainingPet.length,
  };

  if (verification.remainingPosts !== 0 || verification.remainingPetRows !== 0) {
    throw new Error(`cleanup_verification_failed:${JSON.stringify(verification)}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        cleanupSummary,
        qaPostCount: qaPosts.length,
        removedPostIds: postIds,
        storageRemovals,
        verification,
      },
      null,
      2,
    ),
  );
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
