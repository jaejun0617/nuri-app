import { formatPetAgeLabelFromBirthDate } from '../../services/pets/age';
import type { Pet } from '../../store/petStore';
import type { CommunityPostCategory } from '../../types/community';

export const COMMUNITY_CATEGORY_OPTIONS: Array<{
  key: CommunityPostCategory;
  label: string;
}> = [
  { key: 'question', label: '질문' },
  { key: 'info', label: '팁 공유' },
  { key: 'daily', label: '일상' },
  { key: 'free', label: '정보' },
];

export function resolveCommunityPetMetaLabel(options: {
  breed: string | null | undefined;
  speciesDisplayName: string | null | undefined;
  showAge: boolean;
  birthDate: string | null | undefined;
}) {
  const parts: string[] = [];
  const breedLabel = `${options.breed ?? ''}`.trim();
  const speciesLabel = `${options.speciesDisplayName ?? ''}`.trim();
  const baseLabel = breedLabel || speciesLabel || '품종 미입력';
  parts.push(baseLabel);

  if (options.showAge) {
    const ageLabel = formatPetAgeLabelFromBirthDate(options.birthDate);
    if (ageLabel) {
      parts.push(ageLabel);
    }
  }

  return parts.join(' · ');
}

export function buildCommunityPetSnapshot(
  pet: Pet | null,
  showPetAge: boolean,
) {
  if (!pet) return null;

  return {
    name: pet.name,
    species: pet.speciesDisplayName ?? null,
    breed: pet.breed ?? null,
    ageLabel: showPetAge ? formatPetAgeLabelFromBirthDate(pet.birthDate) : null,
    avatarPath: pet.avatarPath ?? null,
    showPetAge,
  };
}

type CommunityEditorDraftState = {
  content: string;
  category: CommunityPostCategory;
  linkedPetId: string | null;
  showPetAge: boolean;
  hasPickedImage: boolean;
};

type CommunityEditorDraftBaseline = {
  content: string;
  category: CommunityPostCategory;
  linkedPetId: string | null;
  showPetAge: boolean;
  hasImage: boolean;
};

export function hasCommunityEditorDraftChanges(
  current: CommunityEditorDraftState,
  baseline: CommunityEditorDraftBaseline,
) {
  return (
    current.content.trim() !== baseline.content.trim() ||
    current.category !== baseline.category ||
    current.linkedPetId !== baseline.linkedPetId ||
    current.showPetAge !== baseline.showPetAge ||
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
