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
import type { EmotionTag } from '../supabase/memories';

const RECORD_DRAFT_STORAGE_KEY = 'nuri.record-create-draft.v1';

export type RecordCreateDraft = {
  petId: string | null;
  title: string;
  content: string;
  occurredAt: string;
  selectedTags: string[];
  mainCategoryKey: RecordMainCategoryKey;
  otherSubCategoryKey: RecordOtherSubCategoryKey | null;
  selectedEmotion: EmotionTag | null;
  selectedImages: PickedRecordImage[];
  updatedAt: string;
};

export async function saveRecordCreateDraft(
  draft: RecordCreateDraft,
): Promise<void> {
  await AsyncStorage.setItem(RECORD_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export async function loadRecordCreateDraft(): Promise<RecordCreateDraft | null> {
  const raw = await AsyncStorage.getItem(RECORD_DRAFT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as RecordCreateDraft;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearRecordCreateDraft(): Promise<void> {
  await AsyncStorage.removeItem(RECORD_DRAFT_STORAGE_KEY);
}
