// 파일: src/services/supabase/community.ts
// 파일 목적:
// - 커뮤니티 도메인의 읽기 중심 Supabase 조회를 담당한다.
// 어디서 쓰이는지:
// - communityStore와 Community 목록/상세 화면에서 사용된다.
// 핵심 역할:
// - posts/comments raw row를 화면용 domain model로 정규화한다.
// - cursor 기반 페이지네이션과 댓글 조회를 제공한다.
// 수정 시 주의:
// - profiles는 posts에 직접 FK가 없으므로 별도 조회 후 매핑해야 한다.
// - 목록 fetch에서 signed URL 생성을 남발하면 스크롤 성능이 흔들릴 수 있으므로 상세 1건만 해석한다.

import type {
  CommunityComment,
  CommunityCommentRow,
  CommunityCommentStatus,
  CommunityPetRow,
  CommunityPost,
  CommunityPostCategory,
  CommunityPostRow,
  CommunityPostStatus,
  CommunityProfileRow,
  CreateCommunityCommentParams,
  CreateCommunityPostParams,
  CreateCommunityReportParams,
  FetchCommunityPostsParams,
  UpdateCommunityPostParams,
} from '../../types/community';
import { formatPetAgeLabelFromBirthDate } from '../pets/age';
import { supabase } from './client';
import { toPublicPetAvatarUrl } from './pets';

const COMMUNITY_PAGE_SIZE = 20;
const UNKNOWN_COMMUNITY_AUTHOR_NICKNAME = '알 수 없는 사용자';
const COMMUNITY_REPORT_RATE_LIMIT_MESSAGE =
  '신고는 10분에 5건, 하루에 20건까지 접수할 수 있어요.';
const COMMUNITY_POST_SELECT_LEGACY =
  'id, user_id, pet_id, visibility, content, image_url, status, category, like_count, comment_count, deleted_at, created_at, updated_at';
const COMMUNITY_POST_SELECT_TITLE =
  'id, user_id, pet_id, visibility, title, content, image_url, status, category, like_count, comment_count, deleted_at, created_at, updated_at';
const COMMUNITY_POST_SELECT_SNAPSHOT = `${COMMUNITY_POST_SELECT_TITLE}, image_urls, author_snapshot_nickname, author_snapshot_avatar_url, pet_snapshot_name, pet_snapshot_species, pet_snapshot_breed, pet_snapshot_age_label, pet_snapshot_avatar_path, show_pet_age`;

type CommunityAuthorSnapshot = {
  nickname: string | null;
  avatarUrl: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCommunityPostStatus(value: unknown): value is CommunityPostStatus {
  return (
    value === 'active' ||
    value === 'hidden' ||
    value === 'auto_hidden' ||
    value === 'banned' ||
    value === 'deleted'
  );
}

function isCommunityCommentStatus(
  value: unknown,
): value is CommunityCommentStatus {
  return (
    value === 'active' ||
    value === 'hidden' ||
    value === 'auto_hidden' ||
    value === 'deleted'
  );
}

function isCommunityPostCategory(
  value: unknown,
): value is CommunityPostCategory {
  return (
    value === 'free' ||
    value === 'question' ||
    value === 'info' ||
    value === 'daily'
  );
}

function isCommunityPostRow(value: unknown): value is CommunityPostRow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.user_id === 'string' &&
    typeof value.content === 'string' &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string'
  );
}

function isCommunityCommentRow(value: unknown): value is CommunityCommentRow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.post_id === 'string' &&
    typeof value.user_id === 'string' &&
    typeof value.content === 'string' &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string'
  );
}

function toCommentDepth(value: unknown): 0 | 1 {
  return value === 1 ? 1 : 0;
}

function isCommunityProfileRow(value: unknown): value is CommunityProfileRow {
  return (
    isRecord(value) &&
    typeof value.user_id === 'string' &&
    (typeof value.nickname === 'string' || value.nickname === null) &&
    (typeof value.avatar_url === 'string' || value.avatar_url === null)
  );
}

function isCommunityPetRow(value: unknown): value is CommunityPetRow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (typeof value.name === 'string' || value.name === null) &&
    (typeof value.breed === 'string' || value.breed === null) &&
    (typeof value.birth_date === 'string' || value.birth_date === null) &&
    (typeof value.profile_image_url === 'string' ||
      value.profile_image_url === null) &&
    (typeof value.species_group === 'string' || value.species_group === null) &&
    (typeof value.species_display_name === 'string' ||
      value.species_display_name === null)
  );
}

function isCommunityReportRateLimitError(error: unknown) {
  if (!isRecord(error)) return false;
  if (typeof error.message !== 'string') return false;
  return error.message.includes(COMMUNITY_REPORT_RATE_LIMIT_MESSAGE);
}

async function persistCommunityReportRateLimitTrace(reporterId: string) {
  const { error } = await supabase.rpc('bump_community_reporter_rate_limit', {
    target_reporter_id: reporterId,
  });

  if (error) {
    console.warn('community_report_rate_limit_trace_failed', error);
  }
}

function toCommunityPostRows(data: unknown): CommunityPostRow[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isCommunityPostRow);
}

function toCommunityCommentRows(data: unknown): CommunityCommentRow[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isCommunityCommentRow);
}

function toCommunityProfileRows(data: unknown): CommunityProfileRow[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isCommunityProfileRow);
}

function toCommunityPetRows(data: unknown): CommunityPetRow[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isCommunityPetRow);
}

function normalizePostStatus(value: string): CommunityPostStatus {
  return isCommunityPostStatus(value) ? value : 'active';
}

function normalizeCommentStatus(value: string): CommunityCommentStatus {
  return isCommunityCommentStatus(value) ? value : 'active';
}

function normalizeCategory(value: string | null): CommunityPostCategory | null {
  return isCommunityPostCategory(value) ? value : null;
}

function looksLikeRemoteUrl(value: string | null | undefined) {
  const raw = `${value ?? ''}`.trim();
  return raw.startsWith('https://') || raw.startsWith('http://');
}

function normalizeImagePaths(row: CommunityPostRow): string[] {
  const rawPaths = Array.isArray(row.image_urls)
    ? row.image_urls
    : row.image_url
    ? [row.image_url]
    : [];

  return rawPaths
    .map(path => `${path ?? ''}`.trim())
    .filter(path => path.length > 0);
}

function normalizePost(
  row: CommunityPostRow,
  profilesByUserId: Map<string, CommunityProfileRow>,
  petsById: Map<string, CommunityPetRow>,
  likedPostIds: Set<string>,
  likeCountsByPostId: Map<string, number>,
  resolvedImageUrl?: string | null,
  resolvedImageUrls?: Array<string | null>,
): CommunityPost {
  const profile = profilesByUserId.get(row.user_id) ?? null;
  const pet = row.pet_id ? petsById.get(row.pet_id) ?? null : null;
  const normalizedStatus = normalizePostStatus(row.status);
  const canExposeImages = normalizedStatus === 'active' && row.deleted_at === null;
  const imagePaths = normalizeImagePaths(row);
  const rawImage = imagePaths[0] ?? `${row.image_url ?? ''}`.trim();
  const inlineRemoteImageUrls = imagePaths.filter(path =>
    looksLikeRemoteUrl(path),
  );
  const inlineRemoteImageUrl = inlineRemoteImageUrls[0] ?? null;
  const snapshotAuthorNickname =
    `${row.author_snapshot_nickname ?? ''}`.trim() || null;
  const snapshotAuthorAvatarUrl =
    `${row.author_snapshot_avatar_url ?? ''}`.trim() || null;
  const snapshotName = `${row.pet_snapshot_name ?? ''}`.trim() || null;
  const snapshotSpecies = `${row.pet_snapshot_species ?? ''}`.trim() || null;
  const snapshotBreed = `${row.pet_snapshot_breed ?? ''}`.trim() || null;
  const snapshotAgeLabel = `${row.pet_snapshot_age_label ?? ''}`.trim() || null;
  const snapshotAvatarPath =
    `${row.pet_snapshot_avatar_path ?? ''}`.trim() || null;
  const showPetAge = row.show_pet_age !== false;
  const liveAvatarUrl = toPublicPetAvatarUrl(
    pet?.profile_image_url?.replace(/^\/+/, '') ?? null,
  );
  const snapshotAvatarUrl = toPublicPetAvatarUrl(snapshotAvatarPath);

  return {
    id: row.id,
    authorId: row.user_id,
    authorNickname:
      snapshotAuthorNickname ??
      profile?.nickname?.trim() ??
      '알 수 없는 사용자',
    authorAvatarUrl: snapshotAuthorAvatarUrl ?? profile?.avatar_url ?? null,
    petId: row.pet_id ?? null,
    petName: snapshotName ?? pet?.name?.trim() ?? null,
    petBreed: snapshotBreed ?? pet?.breed?.trim() ?? null,
    petSpecies:
      snapshotSpecies ??
      pet?.species_display_name?.trim() ??
      pet?.species_group?.trim() ??
      null,
    petAgeLabel: showPetAge
      ? snapshotAgeLabel ??
        formatPetAgeLabelFromBirthDate(pet?.birth_date ?? null)
      : null,
    petAvatarUrl: snapshotAvatarUrl ?? liveAvatarUrl,
    showPetAge,
    title: `${row.title ?? ''}`.trim() || null,
    content: row.content,
    imagePath: rawImage || null,
    imageUrl: canExposeImages ? (resolvedImageUrl ?? inlineRemoteImageUrl) : null,
    imagePaths,
    imageUrls: canExposeImages
      ? resolvedImageUrls && resolvedImageUrls.length > 0
        ? resolvedImageUrls.filter(
            (value): value is string => typeof value === 'string' && value.length > 0,
          )
        : resolvedImageUrl && imagePaths.length > 0
          ? [resolvedImageUrl, ...inlineRemoteImageUrls.slice(1)]
          : inlineRemoteImageUrls
      : [],
    hasImage: canExposeImages && rawImage.length > 0,
    status: normalizedStatus,
    category: normalizeCategory(row.category),
    likeCount:
      likeCountsByPostId.get(row.id) ??
      (typeof row.like_count === 'number' ? row.like_count : 0),
    commentCount: typeof row.comment_count === 'number' ? row.comment_count : 0,
    viewCount: typeof row.view_count === 'number' ? row.view_count : 0,
    isLikedByMe: likedPostIds.has(row.id),
    deletedAt: row.deleted_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeComment(
  row: CommunityCommentRow,
  profilesByUserId: Map<string, CommunityProfileRow>,
  authorSnapshotsByUserId: Map<string, CommunityAuthorSnapshot>,
  likedCommentIds: Set<string>,
  likeCountsByCommentId: Map<string, number>,
): CommunityComment {
  const profile = profilesByUserId.get(row.user_id) ?? null;
  const authorSnapshot = authorSnapshotsByUserId.get(row.user_id) ?? null;
  const profileNickname = profile?.nickname?.trim() || null;
  const profileAvatarUrl =
    typeof profile?.avatar_url === 'string'
      ? profile.avatar_url.trim() || null
      : null;
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.user_id,
    authorNickname:
      profileNickname ??
      authorSnapshot?.nickname ??
      UNKNOWN_COMMUNITY_AUTHOR_NICKNAME,
    authorAvatarUrl: profileAvatarUrl ?? authorSnapshot?.avatarUrl ?? null,
    parentCommentId: row.parent_comment_id ?? null,
    depth: toCommentDepth(row.depth),
    replyCount:
      typeof row.reply_count === 'number' ? Math.max(row.reply_count, 0) : 0,
    likeCount:
      likeCountsByCommentId.get(row.id) ??
      (typeof row.like_count === 'number' ? Math.max(row.like_count, 0) : 0),
    isLikedByMe: likedCommentIds.has(row.id),
    content: row.content,
    status: normalizeCommentStatus(row.status),
    deletedAt: row.deleted_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchProfilesByUserIds(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return new Map<string, CommunityProfileRow>();

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, nickname, avatar_url')
    .in('user_id', ids);

  if (error) throw error;

  return new Map(
    toCommunityProfileRows(data).map(row => [row.user_id, row] as const),
  );
}

async function fetchPublicPostAuthorSnapshotsByUserIds(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return new Map<string, CommunityAuthorSnapshot>();

  const { data, error } = await supabase
    .from('posts')
    .select(
      'id, user_id, author_snapshot_nickname, author_snapshot_avatar_url, created_at',
    )
    .in('user_id', ids)
    .eq('visibility', 'public')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (error) throw error;

  const snapshotsByUserId = new Map<string, CommunityAuthorSnapshot>();

  (Array.isArray(data) ? data : []).forEach(item => {
    if (!isRecord(item) || typeof item.user_id !== 'string') return;
    if (snapshotsByUserId.has(item.user_id)) return;

    const nickname =
      typeof item.author_snapshot_nickname === 'string'
        ? item.author_snapshot_nickname.trim() || null
        : null;
    const avatarUrl =
      typeof item.author_snapshot_avatar_url === 'string'
        ? item.author_snapshot_avatar_url.trim() || null
        : null;

    if (!nickname && !avatarUrl) return;
    snapshotsByUserId.set(item.user_id, { nickname, avatarUrl });
  });

  return snapshotsByUserId;
}

async function fetchPetsByIds(petIds: string[]) {
  const ids = Array.from(new Set(petIds.filter(Boolean)));
  if (ids.length === 0) return new Map<string, CommunityPetRow>();

  const { data, error } = await supabase
    .from('pets')
    .select(
      'id, name, breed, birth_date, profile_image_url, species_group, species_display_name',
    )
    .in('id', ids);

  if (error) throw error;

  return new Map(toCommunityPetRows(data).map(row => [row.id, row] as const));
}

async function resolveCommunityImageUrl(imagePath: string | null) {
  const raw = `${imagePath ?? ''}`.trim();
  if (!raw) return null;
  if (looksLikeRemoteUrl(raw)) return raw;

  const { data, error } = await supabase.storage
    .from('community-images')
    .createSignedUrl(raw, 60 * 60);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function getCommunityCurrentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

async function fetchLikeMetaForPosts(
  postIds: string[],
  currentUserId: string | null,
): Promise<{
  likedPostIds: Set<string>;
  likeCountsByPostId: Map<string, number>;
}> {
  const ids = Array.from(new Set(postIds.filter(Boolean)));
  if (ids.length === 0) {
    return {
      likedPostIds: new Set<string>(),
      likeCountsByPostId: new Map<string, number>(),
    };
  }

  const { data, error } = await supabase
    .from('likes')
    .select('post_id, user_id')
    .in('post_id', ids);

  if (error) throw error;

  const likeCountsByPostId = new Map<string, number>();
  const likedPostIds = new Set<string>();

  (Array.isArray(data) ? data : []).forEach(item => {
    if (!isRecord(item) || typeof item.post_id !== 'string') return;
    likeCountsByPostId.set(
      item.post_id,
      (likeCountsByPostId.get(item.post_id) ?? 0) + 1,
    );

    if (currentUserId && item.user_id === currentUserId) {
      likedPostIds.add(item.post_id);
    }
  });

  return { likedPostIds, likeCountsByPostId };
}

async function fetchLikeMetaForComments(
  commentIds: string[],
  currentUserId: string | null,
): Promise<{
  likedCommentIds: Set<string>;
  likeCountsByCommentId: Map<string, number>;
}> {
  const ids = Array.from(new Set(commentIds.filter(Boolean)));
  if (ids.length === 0) {
    return {
      likedCommentIds: new Set<string>(),
      likeCountsByCommentId: new Map<string, number>(),
    };
  }

  const { data, error } = await supabase
    .from('comment_likes')
    .select('comment_id, user_id')
    .in('comment_id', ids);

  if (error) {
    const code = `${error.code ?? ''}`.toUpperCase();
    const message = `${error.message ?? ''}`.toLowerCase();
    if (code === '42P01' || code === 'PGRST205' || message.includes('comment_likes')) {
      return {
        likedCommentIds: new Set<string>(),
        likeCountsByCommentId: new Map<string, number>(),
      };
    }
    throw error;
  }

  const likeCountsByCommentId = new Map<string, number>();
  const likedCommentIds = new Set<string>();

  (Array.isArray(data) ? data : []).forEach(item => {
    if (!isRecord(item) || typeof item.comment_id !== 'string') return;
    likeCountsByCommentId.set(
      item.comment_id,
      (likeCountsByCommentId.get(item.comment_id) ?? 0) + 1,
    );

    if (currentUserId && item.user_id === currentUserId) {
      likedCommentIds.add(item.comment_id);
    }
  });

  return { likedCommentIds, likeCountsByCommentId };
}

export function encodeCommunityCursor(createdAt: string, id: string) {
  return `${createdAt}::${id}`;
}

function decodeCommunityCursor(cursor: string | null | undefined) {
  const raw = `${cursor ?? ''}`.trim();
  if (!raw) return null;
  const [createdAt, id] = raw.split('::');
  if (!createdAt || !id) return null;
  return { createdAt, id };
}

function isMissingSnapshotColumnsError(error: unknown) {
  if (!isRecord(error)) return false;
  const message = `${error.message ?? ''}`.toLowerCase();
  const code = `${error.code ?? ''}`.toUpperCase();
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    message.includes('title') ||
    message.includes('author_snapshot_') ||
    message.includes('pet_snapshot_') ||
    message.includes('show_pet_age')
  );
}

function isMissingCommentColumnsError(error: unknown) {
  if (!isRecord(error)) return false;
  const message = `${error.message ?? ''}`.toLowerCase();
  const code = `${error.code ?? ''}`.toUpperCase();
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    message.includes('parent_comment_id') ||
    message.includes('reply_count') ||
    message.includes('like_count') ||
    message.includes('updated_at') ||
    message.includes('deleted_at') ||
    message.includes('comment_likes') ||
    message.includes('depth')
  );
}

function normalizeLegacyCommentRow(data: unknown): CommunityCommentRow | null {
  if (!isRecord(data)) return null;
  if (
    typeof data.id !== 'string' ||
    typeof data.post_id !== 'string' ||
    typeof data.user_id !== 'string' ||
    typeof data.content !== 'string' ||
    typeof data.created_at !== 'string'
  ) {
    return null;
  }

  return {
    id: data.id,
    post_id: data.post_id,
    user_id: data.user_id,
    parent_comment_id: null,
    depth: 0,
    reply_count: 0,
    like_count: 0,
    content: data.content,
    status:
      typeof data.status === 'string' && data.status.trim().length > 0
        ? data.status
        : 'active',
    deleted_at: typeof data.deleted_at === 'string' ? data.deleted_at : null,
    created_at: data.created_at,
    updated_at:
      typeof data.updated_at === 'string' && data.updated_at.trim().length > 0
        ? data.updated_at
        : data.created_at,
  };
}

async function fetchCurrentAuthorSnapshot(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('nickname, avatar_url')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return { nickname: null, avatarUrl: null };
  }

  const nickname =
    typeof data?.nickname === 'string' ? data.nickname.trim() || null : null;
  const avatarUrl =
    typeof data?.avatar_url === 'string'
      ? data.avatar_url.trim() || null
      : null;

  return { nickname, avatarUrl };
}

async function selectCommunityPostsWithFallback(params: {
  category?: CommunityPostCategory | null;
  cursor?: string | null;
  limit: number;
}) {
  const buildQuery = (columns: string) => {
    let query = supabase
      .from('posts')
      .select(columns)
      .eq('visibility', 'public')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(params.limit + 1);

    if (params.category) {
      query = query.eq('category', params.category);
    }

    if (params.cursor) {
      const decoded = decodeCommunityCursor(params.cursor);
      if (decoded) {
        query = query.or(
          `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`,
        );
      }
    }

    return query;
  };

  const primary = await buildQuery(COMMUNITY_POST_SELECT_SNAPSHOT);
  if (!primary.error) {
    return primary.data;
  }
  if (!isMissingSnapshotColumnsError(primary.error)) {
    throw primary.error;
  }

  const fallback = await buildQuery(COMMUNITY_POST_SELECT_LEGACY);
  if (fallback.error) throw fallback.error;
  return fallback.data;
}

async function selectCommunityPostByIdWithFallback(postId: string) {
  const primary = await supabase
    .from('posts')
    .select(COMMUNITY_POST_SELECT_SNAPSHOT)
    .eq('id', postId)
    .maybeSingle();

  if (!primary.error) {
    return primary.data;
  }
  if (!isMissingSnapshotColumnsError(primary.error)) {
    throw primary.error;
  }

  const fallback = await supabase
    .from('posts')
    .select(COMMUNITY_POST_SELECT_LEGACY)
    .eq('id', postId)
    .maybeSingle();
  if (fallback.error) throw fallback.error;
  return fallback.data;
}

export async function fetchCommunityPosts(
  params: FetchCommunityPostsParams,
): Promise<{
  items: CommunityPost[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const limit = params.limit ?? COMMUNITY_PAGE_SIZE;
  const rows = toCommunityPostRows(
    await selectCommunityPostsWithFallback({
      category: params.category ?? null,
      cursor: params.cursor ?? null,
      limit,
    }),
  );
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const profilesByUserId = await fetchProfilesByUserIds(
    pageRows.map(row => row.user_id),
  );
  const petsById = await fetchPetsByIds(
    pageRows.map(row => row.pet_id ?? '').filter(Boolean),
  );
  const currentUserId = await getCommunityCurrentUserId();
  const { likedPostIds, likeCountsByPostId } = await fetchLikeMetaForPosts(
    pageRows.map(row => row.id),
    currentUserId,
  );

  const items = pageRows.map(row =>
    normalizePost(
      row,
      profilesByUserId,
      petsById,
      likedPostIds,
      likeCountsByPostId,
    ),
  );
  const last = pageRows[pageRows.length - 1];

  return {
    items,
    nextCursor: last ? encodeCommunityCursor(last.created_at, last.id) : null,
    hasMore,
  };
}

export async function fetchCommunityPostById(postId: string) {
  const data = await selectCommunityPostByIdWithFallback(postId);
  if (!data || !isCommunityPostRow(data)) return null;
  const canExposeImages = data.deleted_at === null && data.status === 'active';

  const imagePaths =
    Array.isArray(data.image_urls) && data.image_urls.length > 0
      ? data.image_urls
      : data.image_url
        ? [data.image_url]
        : [];

  const [profilesByUserId, petsById, resolvedImageUrls] = await Promise.all([
    fetchProfilesByUserIds([data.user_id]),
    fetchPetsByIds([data.pet_id ?? ''].filter(Boolean)),
    canExposeImages
      ? Promise.all(imagePaths.map(path => resolveCommunityImageUrl(path)))
      : Promise.resolve([]),
  ]);
  const currentUserId = await getCommunityCurrentUserId();
  const { likedPostIds, likeCountsByPostId } = await fetchLikeMetaForPosts(
    [data.id],
    currentUserId,
  );

  return normalizePost(
    data,
    profilesByUserId,
    petsById,
    likedPostIds,
    likeCountsByPostId,
    resolvedImageUrls[0] ?? null,
    resolvedImageUrls,
  );
}

export async function fetchCommunityComments(postId: string) {
  const primary = await supabase
    .from('comments')
    .select(
      'id, post_id, user_id, parent_comment_id, depth, reply_count, like_count, content, status, deleted_at, created_at, updated_at',
    )
    .eq('post_id', postId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  let rows = toCommunityCommentRows(primary.data);

  if (primary.error) {
    if (!isMissingCommentColumnsError(primary.error)) {
      throw primary.error;
    }

    const fallback = await supabase
      .from('comments')
      .select('id, post_id, user_id, content, created_at, status, deleted_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (fallback.error) throw fallback.error;
    rows = (Array.isArray(fallback.data) ? fallback.data : [])
      .map(normalizeLegacyCommentRow)
      .filter((row): row is CommunityCommentRow => row !== null)
      .filter(row => row.deleted_at === null && row.status === 'active');
  }

  const currentUserId = await getCommunityCurrentUserId();
  const [
    profilesByUserId,
    authorSnapshotsByUserId,
    { likedCommentIds, likeCountsByCommentId },
  ] = await Promise.all([
    fetchProfilesByUserIds(rows.map(row => row.user_id)),
    fetchPublicPostAuthorSnapshotsByUserIds(rows.map(row => row.user_id)),
    fetchLikeMetaForComments(
      rows.map(row => row.id),
      currentUserId,
    ),
  ]);
  return rows.map(row =>
    normalizeComment(
      row,
      profilesByUserId,
      authorSnapshotsByUserId,
      likedCommentIds,
      likeCountsByCommentId,
    ),
  );
}

export async function createCommunityPost(
  params: CreateCommunityPostParams,
  userId: string,
) {
  const authorSnapshot =
    params.authorSnapshot ?? (await fetchCurrentAuthorSnapshot(userId));

  const basePayload = {
    user_id: userId,
    pet_id: params.petId ?? null,
    visibility: 'public' as const,
    title: params.title.trim(),
    content: params.content.trim(),
    image_url: params.imagePath ?? null,
    image_urls:
      params.imagePaths && params.imagePaths.length > 0
        ? params.imagePaths
        : [],
    category: params.category,
    status: 'active' as const,
  };
  const snapshotPayload = params.petSnapshot
    ? {
        author_snapshot_nickname: authorSnapshot.nickname,
        author_snapshot_avatar_url: authorSnapshot.avatarUrl,
        pet_snapshot_name: params.petSnapshot.name,
        pet_snapshot_species: params.petSnapshot.species,
        pet_snapshot_breed: params.petSnapshot.breed,
        pet_snapshot_age_label: params.petSnapshot.ageLabel,
        pet_snapshot_avatar_path: params.petSnapshot.avatarPath,
        show_pet_age: params.petSnapshot.showPetAge,
      }
    : {
        author_snapshot_nickname: authorSnapshot.nickname,
        author_snapshot_avatar_url: authorSnapshot.avatarUrl,
      };

  let data: unknown = null;
  let error: unknown = null;

  const primary = await supabase
    .from('posts')
    .insert({
      ...basePayload,
      ...snapshotPayload,
    })
    .select(COMMUNITY_POST_SELECT_SNAPSHOT)
    .single();

  if (!primary.error) {
    data = primary.data;
  } else if (isMissingSnapshotColumnsError(primary.error)) {
    const fallbackPayload: Record<string, unknown> = { ...basePayload };
    delete fallbackPayload.title;
    const fallback = await supabase
      .from('posts')
      .insert(fallbackPayload)
      .select(COMMUNITY_POST_SELECT_LEGACY)
      .single();
    data = fallback.data;
    error = fallback.error;
  } else {
    error = primary.error;
  }

  if (error) throw error;
  if (!isCommunityPostRow(data)) {
    throw new Error('게시글 저장 결과를 읽지 못했어요.');
  }

  const [profilesByUserId, petsById] = await Promise.all([
    fetchProfilesByUserIds([data.user_id]),
    fetchPetsByIds([data.pet_id ?? ''].filter(Boolean)),
  ]);

  return normalizePost(
    data,
    profilesByUserId,
    petsById,
    new Set(),
    new Map<string, number>(),
  );
}

export async function updateCommunityPost(
  postId: string,
  params: UpdateCommunityPostParams,
) {
  const patch: Record<string, unknown> = {};
  if (params.title !== undefined) patch.title = params.title.trim();
  if (params.content !== undefined) patch.content = params.content.trim();
  if (params.category !== undefined) patch.category = params.category;
  if (params.petId !== undefined) patch.pet_id = params.petId;
  if (params.imagePath !== undefined) patch.image_url = params.imagePath;
  if (params.imagePaths !== undefined) patch.image_urls = params.imagePaths;
  if (params.petSnapshot !== undefined) {
    patch.pet_snapshot_name = params.petSnapshot?.name ?? null;
    patch.pet_snapshot_species = params.petSnapshot?.species ?? null;
    patch.pet_snapshot_breed = params.petSnapshot?.breed ?? null;
    patch.pet_snapshot_age_label = params.petSnapshot?.ageLabel ?? null;
    patch.pet_snapshot_avatar_path = params.petSnapshot?.avatarPath ?? null;
    patch.show_pet_age = params.petSnapshot?.showPetAge ?? true;
  }

  if (Object.keys(patch).length === 0) return;

  const primary = await supabase.from('posts').update(patch).eq('id', postId);
  if (!primary.error) return;

  if (
    (params.petSnapshot !== undefined || params.title !== undefined) &&
    isMissingSnapshotColumnsError(primary.error)
  ) {
    const fallbackPatch = { ...patch };
    delete fallbackPatch.title;
    delete fallbackPatch.pet_snapshot_name;
    delete fallbackPatch.pet_snapshot_species;
    delete fallbackPatch.pet_snapshot_breed;
    delete fallbackPatch.pet_snapshot_age_label;
    delete fallbackPatch.pet_snapshot_avatar_path;
    delete fallbackPatch.show_pet_age;
    delete fallbackPatch.image_urls;
    const fallback = await supabase
      .from('posts')
      .update(fallbackPatch)
      .eq('id', postId);
    if (fallback.error) throw fallback.error;
    return;
  }

  throw primary.error;
}

export async function deleteCommunityPost(postId: string) {
  const deletedAt = new Date().toISOString();
  const { error } = await supabase
    .from('posts')
    .update({ status: 'deleted', deleted_at: deletedAt })
    .eq('id', postId);

  if (error) throw error;
  return deletedAt;
}

export async function toggleCommunityPostLike(
  postId: string,
  userId: string,
  isLikedByMe: boolean,
) {
  if (isLikedByMe) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('likes')
    .insert({ post_id: postId, user_id: userId });
  if (error && error.code !== '23505') throw error;
}

export async function createCommunityComment(
  params: CreateCommunityCommentParams,
  userId: string,
) {
  const primary = await supabase
    .from('comments')
    .insert({
      post_id: params.postId,
      user_id: userId,
      parent_comment_id: params.parentCommentId ?? null,
      depth: params.parentCommentId ? 1 : 0,
      content: params.content.trim(),
      status: 'active',
    })
    .select(
      'id, post_id, user_id, parent_comment_id, depth, reply_count, like_count, content, status, deleted_at, created_at, updated_at',
    )
    .single();

  let data: CommunityCommentRow | null = null;

  if (!primary.error) {
    data = isCommunityCommentRow(primary.data) ? primary.data : null;
  } else if (isMissingCommentColumnsError(primary.error)) {
    if (params.parentCommentId) {
      throw new Error('답글 기능 적용이 아직 완료되지 않았어요.');
    }

    const fallback = await supabase
      .from('comments')
      .insert({
        post_id: params.postId,
        user_id: userId,
        content: params.content.trim(),
      })
      .select('id, post_id, user_id, content, created_at')
      .single();

    if (fallback.error) throw fallback.error;
    data = normalizeLegacyCommentRow(fallback.data);
  } else {
    throw primary.error;
  }

  if (!data) {
    throw new Error('댓글 저장 결과를 읽지 못했어요.');
  }

  const profilesByUserId = await fetchProfilesByUserIds([data.user_id]);
  return normalizeComment(
    data,
    profilesByUserId,
    new Map<string, CommunityAuthorSnapshot>(),
    new Set<string>(),
    new Map<string, number>(),
  );
}

export async function deleteCommunityComment(commentId: string) {
  const deletedAt = new Date().toISOString();
  const primary = await supabase
    .from('comments')
    .update({ status: 'deleted', deleted_at: deletedAt })
    .eq('id', commentId);

  if (!primary.error) {
    return deletedAt;
  }

  if (!isMissingCommentColumnsError(primary.error)) {
    throw primary.error;
  }

  const fallback = await supabase.from('comments').delete().eq('id', commentId);
  if (fallback.error) throw fallback.error;
  return deletedAt;
}

export async function toggleCommunityCommentLike(
  commentId: string,
  userId: string,
  isLikedByMe: boolean,
) {
  if (isLikedByMe) {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId);

    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('comment_likes')
    .insert({ comment_id: commentId, user_id: userId });
  if (error && error.code !== '23505') throw error;
}

export async function createCommunityReport(
  params: CreateCommunityReportParams,
  reporterId: string,
) {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    target_type: params.targetType,
    target_id: params.targetId,
    reason_category: params.reasonCategory,
    reason: params.reason.trim(),
    status: 'open',
  });

  if (!error) return 'created' as const;
  if (error.code === '23505') return 'duplicate' as const;
  if (isCommunityReportRateLimitError(error)) {
    await persistCommunityReportRateLimitTrace(reporterId);
  }
  throw error;
}
