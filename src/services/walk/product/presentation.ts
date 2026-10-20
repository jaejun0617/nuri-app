import type { MemoryRecord, EmotionTag } from '../../supabase/memories';
import type {
  WalkLinkedMemory,
  WalkMemorySourceSummary,
  WalkRecordSummary,
} from '../server/recordRepository';
import type { PetWalkProgression } from '../server/progressionRepository';
export type WalkResultServerState =
  | 'SYNC_PENDING'
  | 'ACCEPTED_SERVER'
  | 'REJECTED_SERVER';
export const WALK_MILESTONE_LABEL = {
  FIRST_GPS_WALK: '첫 GPS 산책',
  '10_KM': '10 km',
  '100_KM': '100 km',
} as const;
export const walkResultStatusCopy = (state: WalkResultServerState) =>
  state === 'ACCEPTED_SERVER'
    ? '산책 결과를 확인했어요.'
    : state === 'REJECTED_SERVER'
    ? '이번 산책 결과는 거리로 적립되지 않았어요.'
    : '기기에 안전하게 저장했어요. 연결 후 다시 확인을 눌러 주세요.';
export const walkStartedAt = (value: string) =>
  new Date(Date.parse(value) + 9 * 3600_000)
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ');

export function walkDistance(value: string): string {
  const meters = BigInt(value);
  if (meters < 1000n) return `${meters} m`;
  const tenth = (meters % 1000n) / 100n;
  return `${meters / 1000n}${tenth ? `.${tenth}` : ''} km`;
}
export function walkDuration(value: string): string {
  const minutes = BigInt(value) / 60_000n;
  return minutes < 60n
    ? `${minutes}분`
    : `${minutes / 60n}시간 ${minutes % 60n}분`;
}
export function walkProgressPercent(
  progress: PetWalkProgression['progress'],
): number {
  const numerator = BigInt(progress.numeratorM),
    denominator = BigInt(progress.denominatorM);
  return Number((numerator * 10000n) / denominator) / 100;
}
export function walkSummaryCopy(summary: WalkRecordSummary): string {
  return summary.eligibility === 'PROGRESSION_ELIGIBLE'
    ? `GPS 산책 · ${walkDistance(summary.acceptedDistanceM)} · ${walkDuration(
        summary.activeDurationMs,
      )}`
    : `GPS 산책 · 거리 적립 제외 · ${walkDuration(summary.activeDurationMs)}`;
}
export function walkSourceCopy(source: WalkMemorySourceSummary): string {
  return source.summary
    ? walkSummaryCopy(source.summary)
    : 'GPS 산책 · 연결된 산책이 삭제되었어요';
}
export function canonicalWalkMemory(memory: WalkLinkedMemory): MemoryRecord {
  return {
    id: memory.id,
    petId: memory.petId,
    title: memory.title,
    content: memory.content,
    emotion: memory.emotion as EmotionTag | null,
    tags: [...memory.tags],
    category: 'walk',
    subCategory: null,
    occurredAt: memory.occurredAt,
    createdAt: memory.createdAt,
    imagePath: memory.imagePath,
    imagePaths: [...memory.imagePaths],
    imageUrl: null,
  };
}
