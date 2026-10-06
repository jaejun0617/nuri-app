import { supabase } from '../supabase/client';

type LinkErrorCode =
  | 'UNAUTHENTICATED'
  | 'MEMORY_MISMATCH'
  | 'SCHEDULE_UNAVAILABLE'
  | 'NOT_COMPLETED'
  | 'ALREADY_LINKED';

export class ScheduleRecordLinkError extends Error {
  constructor(readonly code: LinkErrorCode, message: string) {
    super(message);
    this.name = 'ScheduleRecordLinkError';
  }
}

/** Only the link changes; concurrent edits to the schedule are never overwritten. */
export async function linkScheduleRecord(input: {
  petId: string;
  scheduleId: string;
  memoryId: string;
}): Promise<void> {
  const auth = await supabase.auth.getUser();
  if (auth.error) throw auth.error;
  const userId = auth.data.user?.id;
  if (!userId)
    throw new ScheduleRecordLinkError(
      'UNAUTHENTICATED',
      '로그인 상태를 확인해 주세요.',
    );

  const memory = await supabase
    .from('memories')
    .select('id')
    .eq('id', input.memoryId)
    .eq('pet_id', input.petId)
    .eq('user_id', userId)
    .maybeSingle();
  if (memory.error) throw memory.error;
  if (!memory.data)
    throw new ScheduleRecordLinkError(
      'MEMORY_MISMATCH',
      '이 아이의 기록을 확인하지 못했어요.',
    );

  const result = await supabase
    .from('pet_schedules')
    .update({ linked_memory_id: input.memoryId })
    .eq('id', input.scheduleId)
    .eq('pet_id', input.petId)
    .eq('user_id', userId)
    .is('linked_memory_id', null)
    .not('completed_at', 'is', null)
    .select('id')
    .maybeSingle();
  if (result.error) throw result.error;
  if (result.data) return;

  const current = await supabase
    .from('pet_schedules')
    .select('linked_memory_id,completed_at')
    .eq('id', input.scheduleId)
    .eq('pet_id', input.petId)
    .eq('user_id', userId)
    .maybeSingle();
  if (current.error) throw current.error;
  if (!current.data)
    throw new ScheduleRecordLinkError(
      'SCHEDULE_UNAVAILABLE',
      '연결할 일정을 확인하지 못했어요. 기록은 보존돼요.',
    );
  if (current.data.linked_memory_id === input.memoryId) return;
  if (current.data.linked_memory_id)
    throw new ScheduleRecordLinkError(
      'ALREADY_LINKED',
      '이미 다른 기록이 연결돼 있어요. 새 기록은 타임라인에 보존돼요.',
    );
  throw new ScheduleRecordLinkError(
    'NOT_COMPLETED',
    '일정을 완료로 표시한 뒤 기록을 연결해 주세요.',
  );
}
