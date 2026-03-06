// 파일: src/services/pets/memorial.ts
// 역할:
// - 펫 추모 상태를 한 곳에서 해석
// - 홈 프로필 이름/메시지/생성-수정 화면 문구를 공용으로 유지

import { getTimePhase } from '../../utils/date';

export type PetMemorialChoice = 'together' | 'memorial';

export const PET_MEMORIAL_OPTIONS: ReadonlyArray<{
  key: PetMemorialChoice;
  label: string;
  helper: string;
}> = [
  {
    key: 'together',
    label: '지금도 함께하고 있어요',
    helper: '추모 날짜 입력 없이 일반 프로필로 유지돼요.',
  },
  {
    key: 'memorial',
    label: '추억으로 함께하고 있어요',
    helper: '추모 프로필로 표시되고, 무지개다리를 건넌 날짜를 함께 남겨요.',
  },
] as const;

export function isMemorialPet(deathDate: string | null | undefined): boolean {
  return Boolean((deathDate ?? '').trim());
}

export function getPetMemorialChoice(
  deathDate: string | null | undefined,
): PetMemorialChoice {
  return isMemorialPet(deathDate) ? 'memorial' : 'together';
}

export function formatMemorialPetName(
  name: string | null | undefined,
  deathDate: string | null | undefined,
): string {
  const safeName = (name ?? '').trim() || '우리 아이';
  if (!isMemorialPet(deathDate)) return safeName;
  return `🌈 ${safeName} 🌈`;
}

export function buildPetTimeMessage(input: {
  name?: string | null;
  deathDate?: string | null;
}): string {
  const name = (input.name ?? '').trim() || '우리 아이';
  const phase = getTimePhase();

  if (isMemorialPet(input.deathDate)) {
    if (phase === 'morning') {
      return `${name}는 오늘 아침에도 마음 곁에 있어요. 그리움도 사랑도 천천히 안아줘요.`;
    }
    if (phase === 'noon') {
      return `${name}와 함께한 반짝이는 순간들을 잠깐 떠올려봐요. 언제나 우리 안에 살아 있어요.`;
    }
    return `${name}에게 오늘 하루를 조용히 들려주세요. 사랑은 여전히 곁에 머물고 있어요.`;
  }

  if (phase === 'morning') {
    return `${name}와 눈 맞추는 아침이에요. 오늘도 천천히, 포근하게 시작해요.`;
  }
  if (phase === 'noon') {
    return `${name}가 웃던 순간을 살짝 떠올려볼까요? 작은 행복 충전 시간이에요.`;
  }
  return `${name}와 보낸 하루를 꼭 안고, 따뜻하게 마무리해요.`;
}

export function getPetTimeMessageEmoji(
  deathDate: string | null | undefined,
): string {
  if (isMemorialPet(deathDate)) {
    return '🌈';
  }

  const phase = getTimePhase();
  if (phase === 'morning') return '🌤️';
  if (phase === 'noon') return '☀️';
  return '🌙';
}
