// 파일: src/services/home/widgetSnapshot.ts
// 역할:
// - 홈/위젯에서 공용으로 쓰는 최소 요약 스냅샷 생성
// - 화면 렌더링과 분리해 재사용 가능하게 유지

import type { MemoryRecord } from '../supabase/memories';
import type { PetSchedule } from '../supabase/schedules';
import { formatScheduleDateLabel } from '../schedules/presentation';

function trimOrFallback(value: string | null | undefined, fallback: string): string {
  const normalized = (value ?? '').trim();
  return normalized || fallback;
}

export function buildHomeWidgetSnapshot(input: {
  petName: string | null | undefined;
  themeColor: string;
  schedules?: PetSchedule[];
  records?: MemoryRecord[];
  nextSchedule?: PetSchedule | null;
  recentRecord?: MemoryRecord | null;
  recordCount?: number;
}) {
  const petName = trimOrFallback(input.petName, '우리 아이');
  const schedules = input.schedules ?? [];
  const records = input.records ?? [];
  const nextSchedule = input.nextSchedule ?? schedules[0] ?? null;
  const recentRecord = input.recentRecord ?? records[0] ?? null;
  const recordCount = input.recordCount ?? records.length;

  return {
    petName,
    subtitle: `${petName}의 오늘을 바로 확인해요`,
    todayScheduleTitle: nextSchedule?.title?.trim() || '오늘 일정이 없어요',
    todayScheduleMeta: nextSchedule
      ? formatScheduleDateLabel(nextSchedule)
      : '새 일정을 추가해 두면 위젯에서 바로 보여요',
    recentRecordTitle:
      trimOrFallback(recentRecord?.title, '최근 기록이 아직 없어요'),
    recentRecordMeta: recentRecord
      ? `${recordCount}건의 기록이 홈과 타임라인에 동기화돼 있어요`
      : '첫 기록을 남기면 최근 추억이 여기에 표시돼요',
    themeColor: input.themeColor,
  };
}
