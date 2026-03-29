import {
  getBrandedErrorMeta,
  getErrorMessage,
  getStableAppErrorCode,
} from '../app/errors';
import type { CommunityMutationErrorCode } from '../../types/community';

export type CommunityMutationContext =
  | 'post-create'
  | 'post-update'
  | 'comment-create';

const COMMUNITY_MUTATION_MESSAGES: Record<CommunityMutationErrorCode, string> = {
  community_content_policy_violation:
    '운영 정책상 등록할 수 없는 표현이 포함되어 있어요. 표현을 조금만 수정해 다시 시도해 주세요.',
  community_post_rate_limited:
    '게시글은 짧은 시간에 너무 많이 등록할 수 없어요. 잠시 후 다시 시도해 주세요.',
  community_post_duplicate_recent:
    '같은 제목과 본문은 잠시 후 다시 등록할 수 있어요. 내용을 조금 바꾸거나 잠시 뒤 시도해 주세요.',
  community_post_write_forbidden:
    '본인이 작성 중인 게시글만 등록하거나 수정할 수 있어요. 로그인 상태를 확인한 뒤 다시 시도해 주세요.',
  community_comment_rate_limited:
    '댓글은 짧은 시간에 너무 많이 등록할 수 없어요. 잠시 후 다시 시도해 주세요.',
  community_comment_duplicate_recent:
    '같은 댓글은 잠시 후 다시 등록할 수 있어요. 내용을 조금 바꾸거나 잠시 뒤 시도해 주세요.',
  community_comment_write_forbidden:
    '본인이 작성 중인 댓글만 등록할 수 있어요. 로그인 상태를 확인한 뒤 다시 시도해 주세요.',
};

function getCommunityMutationTitle(context: CommunityMutationContext) {
  switch (context) {
    case 'post-create':
      return '게시글 등록이 잠시 멈췄어요';
    case 'post-update':
      return '게시글 수정을 반영하지 못했어요';
    case 'comment-create':
      return '댓글 등록이 잠시 멈췄어요';
    default:
      return '요청을 처리하지 못했어요';
  }
}

function getCommunityMutationFallbackMessage(
  context: CommunityMutationContext,
) {
  switch (context) {
    case 'post-create':
      return '게시글을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.';
    case 'post-update':
      return '게시글 수정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
    case 'comment-create':
      return '댓글을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.';
    default:
      return '잠시 후 다시 시도해 주세요.';
  }
}

export function getCommunityMutationErrorMeta(
  error: unknown,
  context: CommunityMutationContext,
): { title: string; message: string } {
  const title = getCommunityMutationTitle(context);
  const stableCode = getStableAppErrorCode(error);

  if (
    stableCode &&
    Object.prototype.hasOwnProperty.call(COMMUNITY_MUTATION_MESSAGES, stableCode)
  ) {
    const code = stableCode as CommunityMutationErrorCode;
    return {
      title,
      message: COMMUNITY_MUTATION_MESSAGES[code],
    };
  }

  const branded = getBrandedErrorMeta(error, 'generic');
  const raw = getErrorMessage(error).trim();
  const fallback = getCommunityMutationFallbackMessage(context);

  if (!raw || branded.message === raw) {
    return {
      title,
      message: fallback,
    };
  }

  return {
    title,
    message: branded.message,
  };
}
