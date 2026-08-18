export const COMMUNITY_BLOCK_CONFIRMATION_MESSAGE =
  '이 사용자의 게시글이 내 피드에서 보이지 않게 됩니다.';

export function canShowCommunityBlockAction(
  authorId: string | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  return Boolean(
    authorId && currentUserId && authorId !== currentUserId,
  );
}
