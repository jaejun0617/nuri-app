const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

const PRIMARY_NICKNAME = 'adminQA';
const FIXTURE_PREFIX = '[QA 커뮤니티 리디자인';
const QA_COMMENT_PREFIX = '[QA 댓글 알림 E2E]';
const STATE_PATH = '/tmp/nuri-qa/community-view-notification-state.json';

function requireEnvironment() {
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
    throw new Error('controlled QA 계정 조회에 실패했습니다.');
  }

  const { data: linkData, error: linkError } =
    await service.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
    });
  if (linkError || !linkData.properties.hashed_token) {
    throw new Error('controlled QA session 발급에 실패했습니다.');
  }

  const verifier = buildClient(url, anonKey);
  const { data: sessionData, error: verifyError } =
    await verifier.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });
  if (verifyError || !sessionData.session?.access_token) {
    throw new Error('controlled QA session 검증에 실패했습니다.');
  }

  return buildClient(url, anonKey, sessionData.session.access_token);
}

async function loadControlledContext(service) {
  const { data: primary, error: primaryError } = await service
    .from('profiles')
    .select('user_id, nickname')
    .eq('nickname', PRIMARY_NICKNAME)
    .eq('nickname_confirmed', true)
    .maybeSingle();
  if (primaryError || !primary) {
    throw new Error('adminQA profile을 찾지 못했습니다.');
  }

  const { data: posts, error: postsError } = await service
    .from('posts')
    .select('id, user_id, title, view_count')
    .like('title', `${FIXTURE_PREFIX}%`)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);
  if (postsError || !posts || posts.length === 0) {
    throw new Error('controlled community fixture를 찾지 못했습니다.');
  }
  if (posts.some(post => post.user_id !== primary.user_id)) {
    throw new Error('fixture 소유자 계약이 일치하지 않습니다.');
  }

  const { data: comments, error: commentsError } = await service
    .from('comments')
    .select('user_id')
    .in('post_id', posts.map(post => post.id))
    .neq('user_id', primary.user_id)
    .eq('status', 'active')
    .is('deleted_at', null)
    .limit(1);
  if (commentsError || !comments?.[0]?.user_id) {
    throw new Error('분리된 controlled secondary QA 계정을 찾지 못했습니다.');
  }

  return {
    primary,
    secondaryUserId: comments[0].user_id,
    posts,
  };
}

function firstRpcRow(data) {
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

async function findCountablePost(secondaryClient, posts) {
  for (const post of posts) {
    const baseline = Number(post.view_count || 0);
    const { data, error } = await secondaryClient.rpc(
      'record_community_post_view',
      { p_post_id: post.id, p_guest_session_id: null },
    );
    if (error) throw new Error('타인 조회수 RPC 실행에 실패했습니다.');
    const result = firstRpcRow(data);
    if (result?.counted === true) {
      return { post, baseline, firstResult: result };
    }
  }
  throw new Error('현재 6시간 창에서 신규 조회 가능한 fixture가 없습니다.');
}

async function verifyFlow(service, url, anonKey) {
  if (process.env.NURI_ENABLE_COMMUNITY_INTERACTION_QA !== 'true') {
    throw new Error('write QA에는 NURI_ENABLE_COMMUNITY_INTERACTION_QA=true가 필요합니다.');
  }

  const context = await loadControlledContext(service);
  const [primaryClient, secondaryClient] = await Promise.all([
    createControlledSession(
      service,
      url,
      anonKey,
      context.primary.user_id,
    ),
    createControlledSession(
      service,
      url,
      anonKey,
      context.secondaryUserId,
    ),
  ]);

  const { data: unreadBeforeData, error: unreadBeforeError } =
    await primaryClient.rpc('get_user_notification_unread_count_v1');
  if (unreadBeforeError) {
    throw new Error('알림 unread baseline 조회에 실패했습니다.');
  }
  const unreadBefore = Number(unreadBeforeData || 0);

  const countable = await findCountablePost(secondaryClient, context.posts);
  const firstCount = Number(countable.firstResult.view_count || 0);
  if (firstCount !== countable.baseline + 1) {
    throw new Error('타인 첫 조회에서 조회수가 정확히 1 증가하지 않았습니다.');
  }

  const { data: secondViewData, error: secondViewError } =
    await secondaryClient.rpc('record_community_post_view', {
      p_post_id: countable.post.id,
      p_guest_session_id: null,
    });
  if (secondViewError) {
    throw new Error('동일 사용자 재조회 RPC 실행에 실패했습니다.');
  }
  const secondView = firstRpcRow(secondViewData);
  if (
    secondView?.counted !== false ||
    secondView?.reason !== 'deduped' ||
    Number(secondView?.view_count || 0) !== firstCount
  ) {
    throw new Error('동일 사용자 6시간 중복 조회 방지가 동작하지 않습니다.');
  }

  const createdAt = new Date().toISOString();
  const { data: comment, error: commentError } = await secondaryClient
    .from('comments')
    .insert({
      post_id: countable.post.id,
      user_id: context.secondaryUserId,
      parent_comment_id: null,
      depth: 0,
      content: `${QA_COMMENT_PREFIX} 다른 보호자의 댓글 알림을 확인합니다.`,
      status: 'active',
      created_at: createdAt,
      updated_at: createdAt,
    })
    .select('id')
    .single();
  if (commentError || !comment) {
    throw new Error('controlled secondary 댓글 생성에 실패했습니다.');
  }

  const { data: notification, error: notificationError } = await service
    .from('user_notifications')
    .select('id, title, body, read_at, metadata')
    .eq('user_id', context.primary.user_id)
    .contains('metadata', { comment_id: comment.id })
    .maybeSingle();
  if (notificationError || !notification) {
    throw new Error('댓글 인앱 알림 row가 생성되지 않았습니다.');
  }

  const { data: secondaryProfile, error: secondaryProfileError } =
    await service
      .from('profiles')
      .select('nickname')
      .eq('user_id', context.secondaryUserId)
      .maybeSingle();
  if (secondaryProfileError || !secondaryProfile?.nickname) {
    throw new Error('댓글 작성자 표시 계약을 확인하지 못했습니다.');
  }

  const { data: unreadAfterData, error: unreadAfterError } =
    await primaryClient.rpc('get_user_notification_unread_count_v1');
  if (unreadAfterError) {
    throw new Error('알림 unread 결과 조회에 실패했습니다.');
  }
  const unreadAfter = Number(unreadAfterData || 0);

  const { data: inboxRows, error: inboxError } = await primaryClient.rpc(
    'get_user_notifications_v2',
    { p_limit: 100 },
  );
  if (inboxError || !Array.isArray(inboxRows)) {
    throw new Error('앱 알림함 read RPC 검증에 실패했습니다.');
  }
  const inboxVisible = inboxRows.some(
    row => row.notification_id === notification.id && row.notification_source === 'user',
  );
  const navigationTargetMatched = inboxRows.some(
    row =>
      row.notification_id === notification.id &&
      row.target_post_id === countable.post.id &&
      row.target_comment_id === comment.id,
  );
  const actorCopyMatched = notification.title.startsWith(
    `${secondaryProfile.nickname}님이 댓글을`,
  );
  const postCopyMatched = notification.body.includes('게시글에 새 댓글이 달렸어요');
  if (
    !inboxVisible ||
    !navigationTargetMatched ||
    !actorCopyMatched ||
    !postCopyMatched
  ) {
    throw new Error('댓글 알림 문구 또는 앱 read-path 계약이 일치하지 않습니다.');
  }
  if (unreadAfter !== unreadBefore + 1) {
    throw new Error('댓글 알림 unread count가 정확히 1 증가하지 않았습니다.');
  }

  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(
    STATE_PATH,
    JSON.stringify({
      postId: countable.post.id,
      commentId: comment.id,
      notificationId: notification.id,
      secondaryUserId: context.secondaryUserId,
    }),
    { mode: 0o600 },
  );

  console.log(
    JSON.stringify(
      {
        viewCount: {
          firstDifferentUserView: 'counted',
          delta: firstCount - countable.baseline,
          repeatedView: secondView.reason,
          repeatedDelta: Number(secondView.view_count || 0) - firstCount,
        },
        commentNotification: {
          unreadDelta: unreadAfter - unreadBefore,
          actorCopyMatched,
          postCopyMatched,
          appInboxVisible: inboxVisible,
          navigationTargetMatched,
          pushDispatched: false,
        },
        stateFile: STATE_PATH,
      },
      null,
      2,
    ),
  );
}

async function cleanupFlow(service, url, anonKey) {
  if (!fs.existsSync(STATE_PATH)) {
    throw new Error('정리할 QA 상태 파일이 없습니다.');
  }
  const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  const context = await loadControlledContext(service);
  if (state.secondaryUserId !== context.secondaryUserId) {
    throw new Error('QA 상태 파일의 controlled account 계약이 일치하지 않습니다.');
  }
  const [primaryClient, secondaryClient] = await Promise.all([
    createControlledSession(
      service,
      url,
      anonKey,
      context.primary.user_id,
    ),
    createControlledSession(
      service,
      url,
      anonKey,
      context.secondaryUserId,
    ),
  ]);
  const deletedAt = new Date().toISOString();
  const { error: commentError } = await secondaryClient
    .from('comments')
    .update({ status: 'deleted', deleted_at: deletedAt })
    .eq('id', state.commentId)
    .eq('user_id', context.secondaryUserId);
  if (commentError) {
    throw new Error('QA 댓글 soft cleanup에 실패했습니다.');
  }
  const { error: readError } = await primaryClient.rpc(
    'mark_user_notification_read_v1',
    { p_notification_id: state.notificationId, p_notification_source: 'user' },
  );
  if (readError) {
    throw new Error('QA 알림 읽음 정리에 실패했습니다.');
  }
  fs.rmSync(STATE_PATH);
  console.log(
    JSON.stringify(
      {
        commentCleanup: 'soft-deleted',
        notificationCleanup: 'marked-read',
        sourceContentDestroyed: false,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const mode = process.argv[2] || 'verify';
  if (!['verify', 'cleanup'].includes(mode)) {
    throw new Error('verify 또는 cleanup만 허용합니다.');
  }
  const { url, anonKey, serviceRoleKey } = requireEnvironment();
  const service = buildClient(url, serviceRoleKey);
  if (mode === 'verify') {
    await verifyFlow(service, url, anonKey);
  } else {
    await cleanupFlow(service, url, anonKey);
  }
}

main().catch(error => {
  console.error(
    error instanceof Error
      ? error.message
      : '커뮤니티 조회수·댓글 알림 QA에 실패했습니다.',
  );
  process.exitCode = 1;
});
