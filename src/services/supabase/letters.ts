// 파일: src/services/supabase/letters.ts
// 파일 목적:
// - Supabase `letters` legacy table을 private letters write/read path로 좁혀 사용한다.
// 어디서 쓰이는지:
// - GuestbookTab private letters 화면에서 선택 펫 기준 목록 조회와 편지 작성에 사용된다.
// 핵심 역할:
// - 공개 방명록이나 AI 답장으로 확장하지 않고, 현재 로그인 사용자와 소유 펫 RLS 안의 user-authored letter만 다룬다.

import {
  normalizePrivateLetterContent,
  type PrivateLetter,
} from '../../domains/privateLetters';
import { supabase } from './client';

const LETTER_SELECT = 'id,pet_id,content,created_at';

type LetterRow = {
  id: string;
  pet_id: string;
  content: string;
  created_at: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isLetterRow(value: unknown): value is LetterRow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.pet_id === 'string' &&
    typeof value.content === 'string' &&
    typeof value.created_at === 'string'
  );
}

function mapLetterRow(row: LetterRow): PrivateLetter {
  return {
    id: row.id,
    petId: row.pet_id,
    content: row.content,
    createdAt: row.created_at,
  };
}

export async function fetchPrivateLetters(input: {
  petId: string;
  limit?: number;
}): Promise<PrivateLetter[]> {
  const petId = input.petId.trim();
  if (!petId) return [];

  const { data, error } = await supabase
    .from('letters')
    .select(LETTER_SELECT)
    .eq('pet_id', petId)
    .eq('is_ai_generated', false)
    .order('created_at', { ascending: false })
    .limit(input.limit ?? 50);

  if (error) {
    throw new Error(error.message || '편지를 불러오지 못했어요.');
  }

  if (!Array.isArray(data)) return [];

  return data.filter(isLetterRow).map(mapLetterRow);
}

export async function createPrivateLetter(input: {
  petId: string;
  content: string;
}): Promise<PrivateLetter> {
  const petId = input.petId.trim();
  const content = normalizePrivateLetterContent(input.content);

  if (!petId) {
    throw new Error('편지를 남길 아이를 먼저 선택해 주세요.');
  }

  if (!content) {
    throw new Error('편지 내용을 입력해 주세요.');
  }

  const { data, error } = await supabase
    .from('letters')
    .insert({
      pet_id: petId,
      content,
      is_ai_generated: false,
    })
    .select(LETTER_SELECT)
    .single();

  if (error) {
    throw new Error(error.message || '편지를 저장하지 못했어요.');
  }

  if (!isLetterRow(data)) {
    throw new Error('저장된 편지를 확인하지 못했어요.');
  }

  return mapLetterRow(data);
}
