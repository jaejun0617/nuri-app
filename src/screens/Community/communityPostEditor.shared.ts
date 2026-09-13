import type { CommunityPostCategory } from '../../types/community';

export const COMMUNITY_CATEGORY_OPTIONS: Array<{
  key: CommunityPostCategory;
  label: string;
}> = [
  { key: 'question', label: '질문' },
  { key: 'info', label: '정보' },
  { key: 'daily', label: '일상' },
  { key: 'free', label: '자유' },
];

type CommunityEditorDraftState = {
  title: string;
  content: string;
  category: CommunityPostCategory;
  hasPickedImage: boolean;
};

type CommunityEditorDraftBaseline = {
  title: string;
  content: string;
  category: CommunityPostCategory;
  hasImage: boolean;
};

export function hasCommunityEditorDraftChanges(
  current: CommunityEditorDraftState,
  baseline: CommunityEditorDraftBaseline,
) {
  const currentTitle = `${current.title ?? ''}`.trim();
  const baselineTitle = `${baseline.title ?? ''}`.trim();
  const currentContent = `${current.content ?? ''}`.trim();
  const baselineContent = `${baseline.content ?? ''}`.trim();

  return (
    currentTitle !== baselineTitle ||
    currentContent !== baselineContent ||
    current.category !== baseline.category ||
    current.hasPickedImage !== baseline.hasImage
  );
}

export function getCommunityEditorExitDialogCopy(mode: 'create' | 'edit') {
  if (mode === 'edit') {
    return {
      title: '수정 중인 글을 나갈까요?',
      message: '변경한 내용은 저장되지 않아요.\n지금 나가면 수정 전 내용으로 남습니다.',
      confirmLabel: '나가기',
      cancelLabel: '계속 수정',
    };
  }

  return {
    title: '작성 중인 글을 나갈까요?',
    message: '입력 중인 내용은 임시저장으로 남겨둘게요.\n다음에 이어서 작성할 수 있어요.',
    confirmLabel: '나가기',
    cancelLabel: '계속 작성',
  };
}
