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

import { supabase } from './client';
import { formatPetAgeLabelFromBirthDate } from '../pets/age';
import { toPublicPetAvatarUrl } from './pets';
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
  CreateCommunityPostParams,
  CreateCommunityCommentParams,
  CreateCommunityReportParams,
  FetchCommunityPostsParams,
  UpdateCommunityPostParams,
} from '../../types/community';

const COMMUNITY_PAGE_SIZE = 20;
const COMMUNITY_POST_SELECT_LEGACY =
  'id, user_id, pet_id, visibility, content, image_url, status, category, like_count, comment_count, deleted_at, created_at, updated_at';
const COMMUNITY_POST_SELECT_SNAPSHOT =
  `${COMMUNITY_POST_SELECT_LEGACY}, author_snapshot_nickname, author_snapshot_avatar_url, pet_snapshot_name, pet_snapshot_species, pet_snapshot_breed, pet_snapshot_age_label, pet_snapshot_avatar_path, show_pet_age`;

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

function isCommunityCommentStatus(value: unknown): value is CommunityCommentStatus {
  return value === 'active' || value === 'hidden' || value === 'deleted';
}

function isCommunityPostCategory(value: unknown): value is CommunityPostCategory {
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
    (typeof value.profile_image_url === 'string' || value.profile_image_url === null) &&
    (typeof value.species_group === 'string' || value.species_group === null) &&
    (typeof value.species_display_name === 'string' ||
      value.species_display_name === null)
  );
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

function normalizePost(
  row: CommunityPostRow,
  profilesByUserId: Map<string, CommunityProfileRow>,
  petsById: Map<string, CommunityPetRow>,
  likedPostIds: Set<string>,
  likeCountsByPostId: Map<string, number>,
  resolvedImageUrl?: string | null,
): CommunityPost {
  const profile = profilesByUserId.get(row.user_id) ?? null;
  const pet = row.pet_id ? petsById.get(row.pet_id) ?? null : null;
  const rawImage = `${row.image_url ?? ''}`.trim();
  const inlineRemoteImageUrl = looksLikeRemoteUrl(rawImage) ? rawImage : null;
  const snapshotAuthorNickname = `${row.author_snapshot_nickname ?? ''}`.trim() || null;
  const snapshotAuthorAvatarUrl = `${row.author_snapshot_avatar_url ?? ''}`.trim() || null;
  const snapshotName = `${row.pet_snapshot_name ?? ''}`.trim() || null;
  const snapshotSpecies = `${row.pet_snapshot_species ?? ''}`.trim() || null;
  const snapshotBreed = `${row.pet_snapshot_breed ?? ''}`.trim() || null;
  const snapshotAgeLabel = `${row.pet_snapshot_age_label ?? ''}`.trim() || null;
  const snapshotAvatarPath = `${row.pet_snapshot_avatar_path ?? ''}`.trim() || null;
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
      ? snapshotAgeLabel ?? formatPetAgeLabelFromBirthDate(pet?.birth_date ?? null)
      : null,
    petAvatarUrl: snapshotAvatarUrl ?? liveAvatarUrl,
    showPetAge,
    content: row.content,
    imagePath: rawImage || null,
    imageUrl: resolvedImageUrl ?? inlineRemoteImageUrl,
    hasImage: rawImage.length > 0,
    status: normalizePostStatus(row.status),
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
): CommunityComment {
  const profile = profilesByUserId.get(row.user_id) ?? null;
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.user_id,
    authorNickname: profile?.nickname?.trim() || '알 수 없는 사용자',
    authorAvatarUrl: profile?.avatar_url ?? null,
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

async function fetchPetsByIds(petIds: string[]) {
  const ids = Array.from(new Set(petIds.filter(Boolean)));
  if (ids.length === 0) return new Map<string, CommunityPetRow>();

  const { data, error } = await supabase
    .from('pets')
    .select('id, name, breed, birth_date, profile_image_url, species_group, species_display_name')
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
    return { likedPostIds: new Set<string>(), likeCountsByPostId: new Map<string, number>() };
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
    message.includes('author_snapshot_') ||
    message.includes('pet_snapshot_') ||
    message.includes('show_pet_age')
  );
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
    typeof data?.avatar_url === 'string' ? data.avatar_url.trim() || null : null;

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
    normalizePost(row, profilesByUserId, petsById, likedPostIds, likeCountsByPostId),
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

  const [profilesByUserId, petsById, imageUrl] = await Promise.all([
    fetchProfilesByUserIds([data.user_id]),
    fetchPetsByIds([data.pet_id ?? ''].filter(Boolean)),
    resolveCommunityImageUrl(data.image_url ?? null),
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
    imageUrl,
  );
}

export async function fetchCommunityComments(postId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('id, post_id, user_id, content, status, deleted_at, created_at, updated_at')
    .eq('post_id', postId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw error;

  const rows = toCommunityCommentRows(data);
  const profilesByUserId = await fetchProfilesByUserIds(
    rows.map(row => row.user_id),
  );
  return rows.map(row => normalizeComment(row, profilesByUserId));
}

export async function createCommunityPost(
  params: CreateCommunityPostParams,
  userId: string,
) {
  const authorSnapshot =
    params.authorSnapshot ??
    (await fetchCurrentAuthorSnapshot(userId));

  const basePayload = {
    user_id: userId,
    pet_id: params.petId ?? null,
    visibility: 'public' as const,
    content: params.content.trim(),
    image_url: params.imagePath ?? null,
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
    const fallback = await supabase
      .from('posts')
      .insert(basePayload)
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
  if (params.content !== undefined) patch.content = params.content.trim();
  if (params.category !== undefined) patch.category = params.category;
  if (params.petId !== undefined) patch.pet_id = params.petId;
  if (params.imagePath !== undefined) patch.image_url = params.imagePath;
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
    params.petSnapshot !== undefined &&
    isMissingSnapshotColumnsError(primary.error)
  ) {
    const fallbackPatch = { ...patch };
    delete fallbackPatch.pet_snapshot_name;
    delete fallbackPatch.pet_snapshot_species;
    delete fallbackPatch.pet_snapshot_breed;
    delete fallbackPatch.pet_snapshot_age_label;
    delete fallbackPatch.pet_snapshot_avatar_path;
    delete fallbackPatch.show_pet_age;
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
  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: params.postId,
      user_id: userId,
      content: params.content.trim(),
      status: 'active',
    })
    .select('id, post_id, user_id, content, status, deleted_at, created_at, updated_at')
    .single();

  if (error) throw error;
  if (!isCommunityCommentRow(data)) {
    throw new Error('댓글 저장 결과를 읽지 못했어요.');
  }

  const profilesByUserId = await fetchProfilesByUserIds([data.user_id]);
  return normalizeComment(data, profilesByUserId);
}

export async function deleteCommunityComment(commentId: string) {
  const deletedAt = new Date().toISOString();
  const { error } = await supabase
    .from('comments')
    .update({ status: 'deleted', deleted_at: deletedAt })
    .eq('id', commentId);

  if (error) throw error;
  return deletedAt;
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
  throw error;
}
