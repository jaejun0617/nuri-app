// 파일: src/services/local/recordDraft.ts
// 역할:
// - RecordCreate 작성 중 상태를 AsyncStorage에 저장/복원
// - 앱 종료나 탭 이탈 후에도 작성 중인 기록을 되살리는 draft 레이어

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRequestId } from '../../utils/requestId';
import {
  RECORD_MAIN_CATEGORIES,
  RECORD_OTHER_SUBCATEGORIES,
  RECORD_EMOTION_OPTIONS,
} from '../records/form';
import {
  GROOMING_CARE_OPTIONS,
  HEALTH_CONDITION_OPTIONS,
  normalizeHealthCareDetails,
} from '../records/metadata';

import type {
  PickedRecordImage,
  RecordMainCategoryKey,
  RecordOtherSubCategoryKey,
} from '../records/form';
import type {
  GroomingCareType,
  HealthCondition,
  HealthCareDetails,
} from '../records/metadata';
import type { EmotionTag } from '../supabase/memories';

const RECORD_DRAFT_STORAGE_KEY = 'nuri.record-create-draft.v1';

export type RecordDraftScope = {
  userId: string;
  petId: string;
};
export type ScheduleRecordDraftScope = RecordDraftScope & {
  scheduleId: string;
};

function draftStorageKey(
  scope?: RecordDraftScope | ScheduleRecordDraftScope,
): string {
  if (!scope) return RECORD_DRAFT_STORAGE_KEY;
  if ('scheduleId' in scope)
    return `${RECORD_DRAFT_STORAGE_KEY}.schedule.${[
      scope.userId,
      scope.petId,
      scope.scheduleId,
    ]
      .map(encodeURIComponent)
      .join('.')}`;
  return `${RECORD_DRAFT_STORAGE_KEY}.owner-pet.${[scope.userId, scope.petId]
    .map(encodeURIComponent)
    .join('.')}`;
}

const pendingWrites = new Map<string, Promise<void>>();
function writeDraft(
  key: string,
  operation: () => Promise<void>,
): Promise<void> {
  const next = (pendingWrites.get(key) ?? Promise.resolve())
    .catch(() => undefined)
    .then(operation);
  pendingWrites.set(key, next);
  const release = () => {
    if (pendingWrites.get(key) === next) pendingWrites.delete(key);
  };
  next.then(release, release);
  return next;
}

// A saved record survives a failed link separately from the editable form draft.
export async function saveScheduleRecordRecovery(
  scope: ScheduleRecordDraftScope,
  memoryId: string,
): Promise<void> {
  await AsyncStorage.setItem(
    `${draftStorageKey(scope)}.pending-memory`,
    memoryId,
  );
}

export async function loadScheduleRecordRecovery(
  scope: ScheduleRecordDraftScope,
): Promise<string | null> {
  const value = await AsyncStorage.getItem(
    `${draftStorageKey(scope)}.pending-memory`,
  );
  return value?.trim() || null;
}

export async function clearScheduleRecordRecovery(
  scope: ScheduleRecordDraftScope,
): Promise<void> {
  await AsyncStorage.removeItem(`${draftStorageKey(scope)}.pending-memory`);
}

export type RecordCreateDraft = {
  submissionId?: string;
  petId: string | null;
  title: string;
  content: string;
  occurredAt: string;
  selectedTags: string[];
  mainCategoryKey: RecordMainCategoryKey;
  otherSubCategoryKey: RecordOtherSubCategoryKey | null;
  priceText?: string;
  mealAmountText?: string;
  useDefaultMealAmount?: boolean;
  saveMealAmountAsDefault?: boolean;
  healthCondition?: HealthCondition | null;
  healthWeightText?: string;
  healthCare?: HealthCareDetails;
  groomingCareTypes?: GroomingCareType[];
  selectedEmotion: EmotionTag | null;
  selectedImages: PickedRecordImage[];
  updatedAt: string;
};

export async function saveRecordCreateDraft(
  draft: RecordCreateDraft,
  scope?: RecordDraftScope | ScheduleRecordDraftScope,
): Promise<void> {
  if (scope && draft.petId !== scope.petId)
    throw new Error('RECORD_DRAFT_SCOPE_MISMATCH');
  const key = draftStorageKey(scope);
  const value = JSON.stringify(draft);
  await writeDraft(key, () => AsyncStorage.setItem(key, value));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDraftHealthCare(value: unknown): value is HealthCareDetails {
  return (
    isObject(value) &&
    Boolean(normalizeHealthCareDetails(value)) &&
    ['hospitalName', 'diagnosis', 'medication'].every(
      key => typeof value[key] === 'string',
    )
  );
}

function isDraft(value: unknown): value is RecordCreateDraft {
  if (!isObject(value)) return false;
  return (
    (value.petId === null || typeof value.petId === 'string') &&
    typeof value.title === 'string' &&
    typeof value.content === 'string' &&
    typeof value.occurredAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    Array.isArray(value.selectedTags) &&
    value.selectedTags.every(tag => typeof tag === 'string') &&
    RECORD_MAIN_CATEGORIES.some(
      option => option.key === value.mainCategoryKey,
    ) &&
    (value.otherSubCategoryKey === null ||
      RECORD_OTHER_SUBCATEGORIES.some(
        option => option.key === value.otherSubCategoryKey,
      )) &&
    (value.selectedEmotion === null ||
      RECORD_EMOTION_OPTIONS.some(
        option => option.value === value.selectedEmotion,
      )) &&
    Array.isArray(value.selectedImages) &&
    value.selectedImages.every(
      image =>
        isObject(image) &&
        typeof image.key === 'string' &&
        typeof image.uri === 'string' &&
        (image.mimeType === null || typeof image.mimeType === 'string'),
    ) &&
    ['priceText', 'mealAmountText', 'healthWeightText'].every(
      key => value[key] === undefined || typeof value[key] === 'string',
    ) &&
    ['useDefaultMealAmount', 'saveMealAmountAsDefault'].every(
      key => value[key] === undefined || typeof value[key] === 'boolean',
    ) &&
    (value.healthCondition === undefined ||
      value.healthCondition === null ||
      HEALTH_CONDITION_OPTIONS.some(
        option => option.value === value.healthCondition,
      )) &&
    (value.healthCare === undefined || isDraftHealthCare(value.healthCare)) &&
    (value.groomingCareTypes === undefined ||
      (Array.isArray(value.groomingCareTypes) &&
        value.groomingCareTypes.every(code =>
          GROOMING_CARE_OPTIONS.some(option => option.value === code),
        ))) &&
    (value.submissionId === undefined || isRequestId(value.submissionId))
  );
}

function parseDraft(
  raw: string,
  scope?: RecordDraftScope | ScheduleRecordDraftScope,
): RecordCreateDraft {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('RECORD_DRAFT_INVALID');
  }
  if (!isDraft(parsed)) throw new Error('RECORD_DRAFT_INVALID');
  if (scope && parsed.petId !== scope.petId)
    throw new Error('RECORD_DRAFT_SCOPE_MISMATCH');
  return parsed;
}

export async function loadRecordCreateDraft(
  scope?: RecordDraftScope | ScheduleRecordDraftScope,
): Promise<RecordCreateDraft | null> {
  const key = draftStorageKey(scope);
  await pendingWrites.get(key);
  const raw = await AsyncStorage.getItem(key);
  return raw ? parseDraft(raw, scope) : null;
}

/** Only call after the current owner's server pet list confirms this pet. */
export async function adoptLegacyRecordCreateDraft(
  scope: RecordDraftScope,
): Promise<RecordCreateDraft | null> {
  await pendingWrites.get(RECORD_DRAFT_STORAGE_KEY);
  const original = await AsyncStorage.getItem(RECORD_DRAFT_STORAGE_KEY);
  const legacy = original ? parseDraft(original) : null;
  if (!legacy || legacy.petId !== scope.petId) return null;
  const current = await loadRecordCreateDraft(scope);
  if (current) return current;
  await saveRecordCreateDraft(legacy, scope);
  // Do not remove a legacy value changed by another mounted form meanwhile.
  await writeDraft(RECORD_DRAFT_STORAGE_KEY, async () => {
    if ((await AsyncStorage.getItem(RECORD_DRAFT_STORAGE_KEY)) === original) {
      await AsyncStorage.removeItem(RECORD_DRAFT_STORAGE_KEY);
    }
  });
  return legacy;
}

export async function clearRecordCreateDraft(
  scope?: RecordDraftScope | ScheduleRecordDraftScope,
): Promise<void> {
  const key = draftStorageKey(scope);
  await writeDraft(key, () => AsyncStorage.removeItem(key));
}
