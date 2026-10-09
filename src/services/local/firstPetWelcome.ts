// 최초 펫 온보딩 완료 신호와 Welcome Modal 소비 상태를 사용자별로 분리해 저장한다.
// 서버 데이터가 아닌 1회성 presentation 상태이므로 user-scoped AsyncStorage를 사용한다.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { appendKoreanParticle } from '../../utils/koreanParticle';

const PENDING_STORAGE_PREFIX = 'nuri.firstPetWelcome.pending.v1';
const CONSUMED_STORAGE_PREFIX = 'nuri.firstPetWelcome.consumed.v1';

export type FirstPetWelcomePending = {
  version: 1;
  petId: string;
  petName: string | null;
  createdAt: number;
};

type FirstPetOnboardingEntry = {
  entrySource: 'auto' | 'cta' | 'header_plus' | null;
  previousRouteName: string | null;
};

export type FirstPetWelcomeCopy = {
  body: string;
  cta: string;
};

const INVALID_PET_NAME_VALUES = new Set(['null', 'undefined']);

function normalizePetName(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized || INVALID_PET_NAME_VALUES.has(normalized.toLowerCase())) {
    return null;
  }
  return normalized;
}

export function buildFirstPetWelcomeCopy(
  petName: string | null | undefined,
): FirstPetWelcomeCopy {
  const normalizedPetName = normalizePetName(petName);
  const nameWithParticle = normalizedPetName
    ? appendKoreanParticle(normalizedPetName, '와', '과')
    : '반려동물과';

  return {
    body: `${nameWithParticle} 함께할 소중한 공간이 준비됐어요.`,
    cta: `${nameWithParticle} 함께하기`,
  };
}

function normalizeRequiredId(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }
  return normalized;
}

function buildStorageKey(prefix: string, userId: string): string {
  return `${prefix}:${normalizeRequiredId(userId, 'userId')}`;
}

function normalizePending(value: unknown): FirstPetWelcomePending | null {
  if (typeof value !== 'object' || value === null) return null;

  const candidate = value as Record<string, unknown>;
  const petId = typeof candidate.petId === 'string' ? candidate.petId.trim() : '';
  const petName =
    typeof candidate.petName === 'string' ? candidate.petName.trim() : '';
  const createdAt = candidate.createdAt;

  if (
    candidate.version !== 1 ||
    !petId ||
    typeof createdAt !== 'number' ||
    !Number.isFinite(createdAt) ||
    createdAt <= 0
  ) {
    return null;
  }

  return {
    version: 1,
    petId,
    petName: petName || null,
    createdAt,
  };
}

function parsePending(raw: string | null): FirstPetWelcomePending | null {
  if (!raw) return null;

  try {
    return normalizePending(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function isFirstPetOnboardingEntry({
  entrySource,
  previousRouteName,
}: FirstPetOnboardingEntry): boolean {
  return entrySource === 'auto' && previousRouteName === 'NicknameSetup';
}

export async function markFirstPetWelcomePending(input: {
  userId: string;
  petId: string;
  petName?: string | null;
  now?: number;
}): Promise<void> {
  const pendingKey = buildStorageKey(PENDING_STORAGE_PREFIX, input.userId);
  const consumedKey = buildStorageKey(CONSUMED_STORAGE_PREFIX, input.userId);
  const consumed = await AsyncStorage.getItem(consumedKey);

  // 이미 소비한 사용자에게는 새 pending 상태를 다시 열지 않는다.
  if (consumed) return;

  const pending: FirstPetWelcomePending = {
    version: 1,
    petId: normalizeRequiredId(input.petId, 'petId'),
    petName: input.petName?.trim() || null,
    createdAt: input.now ?? Date.now(),
  };

  await AsyncStorage.setItem(pendingKey, JSON.stringify(pending));
}

export async function loadFirstPetWelcomePending(
  userId: string,
): Promise<FirstPetWelcomePending | null> {
  const pendingKey = buildStorageKey(PENDING_STORAGE_PREFIX, userId);
  const consumedKey = buildStorageKey(CONSUMED_STORAGE_PREFIX, userId);
  const [pendingRaw, consumed] = await Promise.all([
    AsyncStorage.getItem(pendingKey),
    AsyncStorage.getItem(consumedKey),
  ]);

  if (consumed) return null;
  return parsePending(pendingRaw);
}

export async function consumeFirstPetWelcome(userId: string): Promise<void> {
  const pendingKey = buildStorageKey(PENDING_STORAGE_PREFIX, userId);
  const consumedKey = buildStorageKey(CONSUMED_STORAGE_PREFIX, userId);

  // consumed를 먼저 기록해 pending 정리 실패나 프로세스 종료에도 재노출을 막는다.
  await AsyncStorage.setItem(consumedKey, `${Date.now()}`);
  await AsyncStorage.removeItem(pendingKey);
}

export const FIRST_PET_WELCOME_STORAGE_PREFIXES_FOR_TEST = {
  pending: PENDING_STORAGE_PREFIX,
  consumed: CONSUMED_STORAGE_PREFIX,
} as const;
