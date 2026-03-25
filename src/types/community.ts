// 파일: src/types/community.ts
// 파일 목적:
// - 커뮤니티 도메인의 타입 source of truth를 정의한다.
// 어디서 쓰이는지:
// - community service, communityStore, Community 화면에서 공통으로 사용된다.
// 핵심 역할:
// - Supabase raw row와 UI domain model을 분리해 nullable 안전성과 화면 모델 일관성을 보장한다.
// 수정 시 주의:
// - status/category 집합이 바뀌면 SQL check constraint와 함께 맞춰야 한다.

export type CommunityPostStatus =
  | 'active'
  | 'hidden'
  | 'auto_hidden'
  | 'banned'
  | 'deleted';

export type CommunityPostCategory = 'free' | 'question' | 'info' | 'daily';

export type CommunityCommentStatus =
  | 'active'
  | 'hidden'
  | 'auto_hidden'
  | 'deleted';
export type CommunityReportReasonCategory =
  | 'spam'
  | 'hate'
  | 'advertising'
  | 'misinformation'
  | 'personal_info'
  | 'other';
export type CommunityReportTargetType = 'post' | 'comment';

export type CommunityPostRow = {
  id: string;
  user_id: string;
  pet_id: string | null;
  visibility: 'public' | 'private';
  title?: string | null;
  content: string;
  image_url: string | null;
  image_urls?: string[] | null;
  status: string;
  category: string | null;
  like_count: number | null;
  comment_count: number | null;
  view_count?: number | null;
  author_snapshot_nickname?: string | null;
  author_snapshot_avatar_url?: string | null;
  pet_snapshot_name?: string | null;
  pet_snapshot_species?: string | null;
  pet_snapshot_breed?: string | null;
  pet_snapshot_age_label?: string | null;
  pet_snapshot_avatar_path?: string | null;
  show_pet_age?: boolean | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunityCommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id?: string | null;
  depth?: number | null;
  reply_count?: number | null;
  like_count?: number | null;
  content: string;
  status: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunityProfileRow = {
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
};

export type CommunityPetRow = {
  id: string;
  name: string | null;
  breed: string | null;
  birth_date: string | null;
  profile_image_url: string | null;
  species_group: string | null;
  species_display_name: string | null;
};

export type CommunityPost = {
  id: string;
  authorId: string;
  authorNickname: string;
  authorAvatarUrl: string | null;
  petId: string | null;
  petName: string | null;
  petBreed: string | null;
  petSpecies: string | null;
  petAgeLabel: string | null;
  petAvatarUrl: string | null;
  showPetAge: boolean;
  title: string | null;
  content: string;
  imagePath: string | null;
  imageUrl: string | null;
  imagePaths?: string[];
  imageUrls?: string[];
  hasImage: boolean;
  status: CommunityPostStatus;
  category: CommunityPostCategory | null;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isLikedByMe: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommunityComment = {
  id: string;
  postId: string;
  authorId: string;
  authorNickname: string;
  authorAvatarUrl: string | null;
  parentCommentId: string | null;
  depth: 0 | 1;
  replyCount: number;
  likeCount: number;
  isLikedByMe: boolean;
  content: string;
  status: CommunityCommentStatus;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommunityListStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'refreshing'
  | 'loadingMore'
  | 'error';

export type CommunityDetailStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error'
  | 'not_found'
  | 'deleted'
  | 'moderated';

export type FetchCommunityPostsParams = {
  category?: CommunityPostCategory | null;
  cursor?: string | null;
  limit?: number;
};

export type CreateCommunityPostParams = {
  title: string;
  content: string;
  category: CommunityPostCategory;
  petId?: string | null;
  imagePath?: string | null;
  imagePaths?: string[];
  authorSnapshot?: {
    nickname: string | null;
    avatarUrl: string | null;
  } | null;
  petSnapshot?: {
    name: string | null;
    species: string | null;
    breed: string | null;
    ageLabel: string | null;
    avatarPath: string | null;
    showPetAge: boolean;
  } | null;
};

export type UpdateCommunityPostParams = {
  title?: string;
  content?: string;
  category?: CommunityPostCategory;
  petId?: string | null;
  imagePath?: string | null;
  imagePaths?: string[];
  petSnapshot?: {
    name: string | null;
    species: string | null;
    breed: string | null;
    ageLabel: string | null;
    avatarPath: string | null;
    showPetAge: boolean;
  } | null;
};

export type CreateCommunityCommentParams = {
  postId: string;
  content: string;
  parentCommentId?: string | null;
};

export type CreateCommunityReportParams = {
  targetType: CommunityReportTargetType;
  targetId: string;
  reasonCategory: CommunityReportReasonCategory;
  reason: string;
};
