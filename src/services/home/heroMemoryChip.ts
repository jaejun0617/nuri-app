// 파일: src/services/home/heroMemoryChip.ts
// 목적:
// - Home Hero의 추억 콜백을 실제 선택 펫의 최신 기록과 연결한다.
// - 기록 선택과 카테고리별 카피를 UI에서 분리해 테스트 가능하게 유지한다.

import { getMemoryCategoryChipLabel } from '../memories/categoryMeta';
import {
  getRecordDisplayYmd,
  getRecordSortTimestamp,
} from '../records/date';
import type { MemoryRecord } from '../supabase/memories';
import { formatRelativeTimeFromNow } from '../../utils/date';

export type HomeHeroMemoryChip = {
  recordId: string | null;
  label: string;
  accessibilityLabel: string;
};

function selectLatestRecord(
  records: ReadonlyArray<MemoryRecord>,
): MemoryRecord | null {
  return records.reduce<MemoryRecord | null>((latest, record) => {
    if (!latest) return record;

    const currentTimestamp = getRecordSortTimestamp(record);
    const latestTimestamp = getRecordSortTimestamp(latest);
    if (currentTimestamp !== latestTimestamp) {
      return currentTimestamp > latestTimestamp ? record : latest;
    }

    return record.createdAt > latest.createdAt ? record : latest;
  }, null);
}

function appendWithParticle(
  name: string,
  vowelParticle: string,
  consonantParticle: string,
) {
  const lastCharacter = name[name.length - 1];
  if (!lastCharacter) return name;

  const codePoint = lastCharacter.charCodeAt(0);
  const isHangulSyllable = codePoint >= 0xac00 && codePoint <= 0xd7a3;
  if (!isHangulSyllable) return `${name}${vowelParticle}`;

  const hasFinalConsonant = (codePoint - 0xac00) % 28 !== 0;
  return `${name}${hasFinalConsonant ? consonantParticle : vowelParticle}`;
}

function buildMemoryLabel(
  record: MemoryRecord,
  petName: string,
  now: Date,
): string {
  const recordDate = getRecordDisplayYmd(record) ?? record.createdAt;
  const relativeTime = formatRelativeTimeFromNow(recordDate, now) || '최근';
  const categoryLabel = getMemoryCategoryChipLabel(record);

  if (categoryLabel === '산책') {
    const nameWithParticle = appendWithParticle(petName, '와', '과');
    return `${relativeTime}, ${nameWithParticle} 산책한 추억이 있어요`;
  }

  if (categoryLabel === '식사') {
    return `${relativeTime}, ${petName}의 식사 기록이 있어요`;
  }

  if (categoryLabel === '건강') {
    return `${relativeTime}, ${petName}의 건강 기록이 있어요`;
  }

  if (categoryLabel === '미용') {
    return `${relativeTime}, ${petName}의 미용 기록이 있어요`;
  }

  return `${relativeTime}, ${petName}의 소중한 기록이 있어요`;
}

export function buildHomeHeroMemoryChip(
  records: ReadonlyArray<MemoryRecord>,
  petName: string | null | undefined,
  now = new Date(),
): HomeHeroMemoryChip {
  const normalizedPetName = petName?.trim() || '우리 아이';
  const latestRecord = selectLatestRecord(records);
  if (!latestRecord) {
    const label = '오늘의 첫 순간을 남겨볼까요?';
    return {
      recordId: null,
      label,
      accessibilityLabel: `${label}, 기록 작성하기`,
    };
  }

  const label = buildMemoryLabel(latestRecord, normalizedPetName, now);

  return {
    recordId: latestRecord.id,
    label,
    accessibilityLabel: `${label}, 기록 상세 보기`,
  };
}
