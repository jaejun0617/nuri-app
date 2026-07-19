const { createClient } = require('@supabase/supabase-js');

const FIXTURE_PREFIX = '[QA 커뮤니티 리디자인';
const SECONDARY_SNAPSHOT_TITLE = '[QA 커뮤니티 댓글 작성자 식별]';
const FIXTURE_COUNT = 100;
const PRIMARY_NICKNAME = 'adminQA';
const ALLOWED_ACTIONS = new Set(['audit', 'seed', 'soft-hide', 'restore']);

const TOPICS = [
  '산책 후 발 닦는 순서가 궁금해요',
  '오늘 처음으로 혼자 물을 잘 마셨어요',
  '사료를 천천히 바꾸는 팁을 나눠요',
  '비 오는 날 실내 놀이 추천해 주세요',
  '정기 검진 전에 준비할 것이 있을까요',
  '낯선 소리에 적응한 작은 변화',
  '잠들기 전 우리 집 루틴을 소개해요',
  '털 관리할 때 편안해하는 방법',
  '산책 친구와 인사하는 연습 중이에요',
  '주말에 함께 다녀온 조용한 길',
];
const BODY_LINES = [
  '반려생활에서 직접 확인한 경험을 기록합니다.',
  '비슷한 경험이 있다면 안전한 방법을 함께 나눠 주세요.',
  '아이의 상태에 따라 다를 수 있어 천천히 살펴보고 있어요.',
  '작은 변화도 기록해 두니 다음 선택에 도움이 됐어요.',
];
const CATEGORIES = ['question', 'info', 'daily', 'free'];

function readAction() {
  const action = process.argv[2] || 'audit';
  if (!ALLOWED_ACTIONS.has(action)) {
    throw new Error('지원하지 않는 작업입니다. audit, seed, soft-hide, restore만 허용합니다.');
  }
  return action;
}

function readEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error('Supabase server environment가 준비되지 않았습니다.');
  }
  return { url, anonKey, serviceRoleKey };
}

function buildClient(url, key, accessToken) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

async function createControlledSession(service, url, anonKey, userId) {
  const { data: userData, error: userError } =
    await service.auth.admin.getUserById(userId);
  if (userError || !userData.user?.email) {
    throw userError || new Error('controlled QA 계정 이메일을 확인하지 못했습니다.');
  }

  const { data: linkData, error: linkError } =
    await service.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
    });
  if (linkError || !linkData.properties.hashed_token) {
    throw linkError || new Error('controlled QA session 발급에 실패했습니다.');
  }

  const verifier = buildClient(url, anonKey);
  const { data: sessionData, error: verifyError } = await verifier.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });
  if (verifyError || !sessionData.session?.access_token) {
    throw verifyError || new Error('controlled QA session 검증에 실패했습니다.');
  }

  return buildClient(url, anonKey, sessionData.session.access_token);
}

async function getControlledProfiles(service) {
  const secondaryEmail = `${process.env.NURI_COMMUNITY_QA_SECONDARY_EMAIL || ''}`
    .trim()
    .toLowerCase();
  if (!secondaryEmail) {
    throw new Error('NURI_COMMUNITY_QA_SECONDARY_EMAIL이 필요합니다.');
  }

  const { data: primary, error: primaryError } = await service
    .from('profiles')
    .select('user_id, nickname, nickname_confirmed')
    .eq('nickname', PRIMARY_NICKNAME)
    .eq('nickname_confirmed', true)
    .maybeSingle();
  if (primaryError || !primary) {
    throw primaryError || new Error('adminQA profile을 찾지 못했습니다.');
  }

  const { data: usersData, error: usersError } =
    await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw usersError;
  const secondaryUser = usersData.users.find(
    user => `${user.email || ''}`.toLowerCase() === secondaryEmail,
  );
  if (!secondaryUser || secondaryUser.id === primary.user_id) {
    throw new Error('분리된 controlled secondary QA 계정을 찾지 못했습니다.');
  }

  const { data: secondary, error: secondaryError } = await service
    .from('profiles')
    .select('user_id, nickname, nickname_confirmed')
    .eq('user_id', secondaryUser.id)
    .eq('nickname_confirmed', true)
    .maybeSingle();
  if (secondaryError || !secondary) {
    throw secondaryError || new Error('secondary QA profile을 찾지 못했습니다.');
  }

  return { primary, secondary };
}

async function getPrimaryPet(service, userId) {
  const { data, error } = await service
    .from('pets')
    .select('id, name, species_display_name, species_group, breed, birth_date, profile_image_url')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function buildFixtureTitle(index) {
  const number = String(index + 1).padStart(3, '0');
  return `${FIXTURE_PREFIX} #${number}] ${TOPICS[index % TOPICS.length]}`;
}

function buildPostPayload(index, primary, pet, now) {
  const createdAt = new Date(now - (index + 15) * 8 * 60 * 1000).toISOString();
  return {
    user_id: primary.user_id,
    pet_id: pet?.id || null,
    visibility: 'public',
    title: buildFixtureTitle(index),
    content: `${BODY_LINES[index % BODY_LINES.length]}\n목록·상세·댓글 UI 검증용 controlled QA 게시글 ${index + 1}번입니다.`,
    image_url: null,
    image_urls: [],
    status: 'active',
    category: CATEGORIES[index % CATEGORIES.length],
    author_snapshot_nickname: primary.nickname,
    author_snapshot_avatar_url: null,
    pet_snapshot_name: pet?.name || null,
    pet_snapshot_species:
      pet?.species_display_name || pet?.species_group || null,
    pet_snapshot_breed: pet?.breed || null,
    pet_snapshot_age_label: null,
    pet_snapshot_avatar_path: null,
    show_pet_age: true,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

async function listFixturePosts(service) {
  const { data, error } = await service
    .from('posts')
    .select('id, user_id, title, status, deleted_at, created_at')
    .like('title', `${FIXTURE_PREFIX}%`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function auditFixtures(service) {
  const posts = await listFixturePosts(service);
  const postIds = posts.map(post => post.id);
  let comments = [];
  if (postIds.length > 0) {
    const { data, error } = await service
      .from('comments')
      .select('id, post_id, user_id, parent_comment_id, status, deleted_at')
      .in('post_id', postIds);
    if (error) throw error;
    comments = data || [];
  }

  const activePosts = posts.filter(
    post => post.status === 'active' && post.deleted_at === null,
  );
  const activeComments = comments.filter(
    comment => comment.status === 'active' && comment.deleted_at === null,
  );
  const postsWithExpectedCommentShape = activePosts.filter(post => {
    const postComments = activeComments.filter(comment => comment.post_id === post.id);
    const topLevelComments = postComments.filter(comment => !comment.parent_comment_id);
    const replies = postComments.filter(comment => !!comment.parent_comment_id);

    return (
      topLevelComments.length === 2 &&
      replies.length === 1 &&
      topLevelComments.some(comment => comment.user_id === post.user_id) &&
      topLevelComments.some(comment => comment.user_id !== post.user_id) &&
      replies[0]?.user_id === post.user_id
    );
  }).length;
  const { count: secondarySnapshotCount, error: secondarySnapshotError } =
    await service
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('title', SECONDARY_SNAPSHOT_TITLE)
      .eq('status', 'active')
      .is('deleted_at', null);
  if (secondarySnapshotError) throw secondarySnapshotError;
  const audit = {
    fixturePosts: posts.length,
    activeFixturePosts: activePosts.length,
    fixtureComments: comments.length,
    activeFixtureComments: activeComments.length,
    activeTopLevelComments: activeComments.filter(comment => !comment.parent_comment_id).length,
    activeReplies: activeComments.filter(comment => !!comment.parent_comment_id).length,
    postsWithExpectedCommentShape,
    fixtureContractComplete:
      activePosts.length === FIXTURE_COUNT &&
      postsWithExpectedCommentShape === FIXTURE_COUNT,
    fixtureOwnerCount: new Set(posts.map(post => post.user_id)).size,
    secondaryAuthorSnapshotReady: secondarySnapshotCount === 1,
  };
  console.log(JSON.stringify(audit, null, 2));
  return audit;
}

async function ensureSecondaryAuthorSnapshot(secondaryClient, secondary) {
  const { data: existing, error: existingError } = await secondaryClient
    .from('posts')
    .select('id, status')
    .eq('title', SECONDARY_SNAPSHOT_TITLE)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    if (existing.status !== 'active') {
      const { error } = await secondaryClient
        .from('posts')
        .update({ status: 'active', deleted_at: null })
        .eq('id', existing.id);
      if (error) throw error;
    }
    return;
  }

  const createdAt = '2025-01-01T00:00:00.000Z';
  const { error } = await secondaryClient.from('posts').insert({
    user_id: secondary.user_id,
    pet_id: null,
    visibility: 'public',
    title: SECONDARY_SNAPSHOT_TITLE,
    content: '댓글 작성자 표시 계약을 검증하기 위한 controlled QA snapshot입니다.',
    image_url: null,
    image_urls: [],
    status: 'active',
    category: 'free',
    author_snapshot_nickname: secondary.nickname,
    author_snapshot_avatar_url: null,
    show_pet_age: false,
    created_at: createdAt,
    updated_at: createdAt,
  });
  if (error) throw error;
}

async function seedFixtures(
  service,
  primaryClient,
  secondaryClient,
  primary,
  secondary,
  pet,
) {
  await ensureSecondaryAuthorSnapshot(secondaryClient, secondary);
  const existing = await listFixturePosts(service);
  if (existing.length > 0 && existing.some(post => post.user_id !== primary.user_id)) {
    throw new Error('QA prefix에 허용되지 않은 소유자의 게시글이 있어 중단했습니다.');
  }

  const existingTitles = new Set(existing.map(post => post.title));
  const now = Date.now();
  for (let index = 0; index < FIXTURE_COUNT; index += 1) {
    const title = buildFixtureTitle(index);
    if (existingTitles.has(title)) continue;
    const { error } = await primaryClient
      .from('posts')
      .insert(buildPostPayload(index, primary, pet, now));
    if (error) throw error;
  }

  const fixturePosts = await listFixturePosts(service);
  if (fixturePosts.length !== FIXTURE_COUNT) {
    throw new Error(`fixture 게시글 수가 ${FIXTURE_COUNT}건과 일치하지 않습니다.`);
  }

  const { data: existingCommentRows, error: existingCommentsError } = await service
    .from('comments')
    .select('id, post_id, content, parent_comment_id')
    .in('post_id', fixturePosts.map(post => post.id));
  if (existingCommentsError) throw existingCommentsError;
  const existingComments = existingCommentRows || [];

  for (const post of fixturePosts) {
    const postNumberMatch = post.title.match(/#(\d{3})/);
    const postNumber = postNumberMatch ? Number(postNumberMatch[1]) : 0;
    const baseTime = new Date(post.created_at).getTime();
    const readerContent = `[QA 일반 댓글 #${String(postNumber).padStart(3, '0')}] 보호자 입장에서 참고가 됐어요.`;
    const authorContent = `[QA 글쓴이 댓글 #${String(postNumber).padStart(3, '0')}] 추가로 확인한 내용을 남깁니다.`;
    const replyContent = `[QA 글쓴이 답글 #${String(postNumber).padStart(3, '0')}] 함께 나눠 주셔서 고마워요.`;
    const postComments = existingComments.filter(comment => comment.post_id === post.id);

    let readerComment = postComments.find(comment => comment.content === readerContent);
    if (!readerComment) {
      const { data, error } = await secondaryClient
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: secondary.user_id,
          parent_comment_id: null,
          depth: 0,
          content: readerContent,
          status: 'active',
          created_at: new Date(baseTime + 60 * 1000).toISOString(),
          updated_at: new Date(baseTime + 60 * 1000).toISOString(),
        })
        .select('id, post_id, content, parent_comment_id')
        .single();
      if (error) throw error;
      readerComment = data;
    }

    if (!postComments.some(comment => comment.content === authorContent)) {
      const { error } = await primaryClient.from('comments').insert({
        post_id: post.id,
        user_id: primary.user_id,
        parent_comment_id: null,
        depth: 0,
        content: authorContent,
        status: 'active',
        created_at: new Date(baseTime + 2 * 60 * 1000).toISOString(),
        updated_at: new Date(baseTime + 2 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
    }

    if (!postComments.some(comment => comment.content === replyContent)) {
      if (!readerComment?.id) throw new Error('대댓글 대상 댓글을 찾지 못했습니다.');
      const { error } = await primaryClient.from('comments').insert({
        post_id: post.id,
        user_id: primary.user_id,
        parent_comment_id: readerComment.id,
        depth: 1,
        content: replyContent,
        status: 'active',
        created_at: new Date(baseTime + 3 * 60 * 1000).toISOString(),
        updated_at: new Date(baseTime + 3 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
    }
  }
}

async function setFixtureVisibility(client, service, primaryUserId, status) {
  const posts = await listFixturePosts(service);
  if (posts.length === 0) return;
  if (posts.some(post => post.user_id !== primaryUserId)) {
    throw new Error('QA prefix에 허용되지 않은 소유자의 게시글이 있어 중단했습니다.');
  }
  const { error } = await client
    .from('posts')
    .update({ status, deleted_at: null })
    .in('id', posts.map(post => post.id));
  if (error) throw error;
}

async function setSecondarySnapshotVisibility(client, status) {
  const { error } = await client
    .from('posts')
    .update({ status, deleted_at: null })
    .eq('title', SECONDARY_SNAPSHOT_TITLE);
  if (error) throw error;
}

async function main() {
  const action = readAction();
  const { url, anonKey, serviceRoleKey } = readEnvironment();
  const service = buildClient(url, serviceRoleKey);

  if (action === 'audit') {
    await auditFixtures(service);
    return;
  }
  if (process.env.NURI_ENABLE_COMMUNITY_DESIGN_QA !== 'true') {
    throw new Error('write 작업에는 NURI_ENABLE_COMMUNITY_DESIGN_QA=true가 필요합니다.');
  }

  const { primary, secondary } = await getControlledProfiles(service);
  const [primaryClient, secondaryClient, pet] = await Promise.all([
    createControlledSession(service, url, anonKey, primary.user_id),
    createControlledSession(service, url, anonKey, secondary.user_id),
    getPrimaryPet(service, primary.user_id),
  ]);

  if (action === 'seed') {
    await seedFixtures(
      service,
      primaryClient,
      secondaryClient,
      primary,
      secondary,
      pet,
    );
  } else {
    const status = action === 'restore' ? 'active' : 'hidden';
    await Promise.all([
      setFixtureVisibility(primaryClient, service, primary.user_id, status),
      setSecondarySnapshotVisibility(secondaryClient, status),
    ]);
  }
  const audit = await auditFixtures(service);
  if (action === 'seed' && !audit.fixtureContractComplete) {
    throw new Error('게시글별 댓글·답글 fixture 계약이 완성되지 않았습니다.');
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'QA fixture 작업에 실패했습니다.');
  process.exitCode = 1;
});
