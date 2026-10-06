// 파일: src/services/local/recordDraft.ts
// 역할:
// - RecordCreate 작성 중 상태를 AsyncStorage에 저장/복원
// - 앱 종료나 탭 이탈 후에도 작성 중인 기록을 되살리는 draft 레이어

import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  PickedRecordImage,
  RecordMainCategoryKey,
  RecordOtherSubCategoryKey,
} from '../records/form';
import type { GroomingCareType, HealthCondition } from '../records/metadata';
import type { EmotionTag } from '../supabase/memories';

const RECORD_DRAFT_STORAGE_KEY = 'nuri.record-create-draft.v1';

export type ScheduleRecordDraftScope = {
  userId: string;
  petId: string;
  scheduleId: string;
};

function draftStorageKey(scope?: ScheduleRecordDraftScope): string {
  if (!scope) return RECORD_DRAFT_STORAGE_KEY;
  return `${RECORD_DRAFT_STORAGE_KEY}.schedule.${[scope.userId, scope.petId, scope.scheduleId].map(encodeURIComponent).join('.')}`;
}

// A saved record survives a failed link separately from the editable form draft.
export async function saveScheduleRecordRecovery(
  scope: ScheduleRecordDraftScope,
  memoryId: string,
): Promise<void> {
  await AsyncStorage.setItem(`${draftStorageKey(scope)}.pending-memory`, memoryId);
}

export async function loadScheduleRecordRecovery(
  scope: ScheduleRecordDraftScope,
): Promise<string | null> {
  const value = await AsyncStorage.getItem(`${draftStorageKey(scope)}.pending-memory`);
  return value?.trim() || null;
}

export async function clearScheduleRecordRecovery(
  scope: ScheduleRecordDraftScope,
): Promise<void> {
  await AsyncStorage.removeItem(`${draftStorageKey(scope)}.pending-memory`);
}

export type RecordCreateDraft = {
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
  groomingCareTypes?: GroomingCareType[];
  selectedEmotion: EmotionTag | null;
  selectedImages: PickedRecordImage[];
  updatedAt: string;
};

export async function saveRecordCreateDraft(
  draft: RecordCreateDraft,
  scope?: ScheduleRecordDraftScope,
): Promise<void> {
  await AsyncStorage.setItem(draftStorageKey(scope), JSON.stringify(draft));
}

export async function loadRecordCreateDraft(scope?: ScheduleRecordDraftScope): Promise<RecordCreateDraft | null> {
  const raw = await AsyncStorage.getItem(draftStorageKey(scope));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as RecordCreateDraft;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearRecordCreateDraft(scope?: ScheduleRecordDraftScope): Promise<void> {
  await AsyncStorage.removeItem(draftStorageKey(scope));
}
