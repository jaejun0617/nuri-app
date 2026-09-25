import { buildHomeHeroMemoryChip } from '../src/services/home/heroMemoryChip';
import type { MemoryRecord } from '../src/services/supabase/memories';

function record(overrides: Partial<MemoryRecord> = {}): MemoryRecord {
  return {
    id: 'memory-1',
    petId: 'pet-1',
    title: '기록',
    content: null,
    emotion: null,
    tags: [],
    category: 'walk',
    subCategory: null,
    price: null,
    occurredAt: '2026-09-22',
    createdAt: '2026-09-22T03:00:00.000Z',
    imageUrl: null,
    imagePath: null,
    imagePaths: [],
    timelineImagePath: null,
    timelineImageVariant: null,
    ...overrides,
  };
}

describe('home hero memory chip', () => {
  const now = new Date('2026-09-25T03:00:00.000Z');

  it('selects the latest actual record without depending on array order', () => {
    const chip = buildHomeHeroMemoryChip(
      [
        record({ id: 'new', occurredAt: '2026-09-24' }),
        record({ id: 'old', occurredAt: '2026-09-20' }),
      ],
      '누리',
      now,
    );

    expect(chip).toMatchObject({
      recordId: 'new',
      label: '어제, 누리와 산책한 추억이 있어요',
    });
  });

  it.each([
    ['meal', null, '오늘, 누리의 식사 기록이 있어요'],
    ['health', null, '오늘, 누리의 건강 기록이 있어요'],
    ['other', 'grooming', '오늘, 누리의 미용 기록이 있어요'],
  ] as const)(
    'builds a %s callback from the normalized record category',
    (category, subCategory, expected) => {
      const chip = buildHomeHeroMemoryChip(
        [
          record({
            category,
            subCategory,
            occurredAt: '2026-09-25',
          }),
        ],
        '누리',
        now,
      );

      expect(chip?.label).toBe(expected);
    },
  );

  it('uses the correct Korean particle for a pet name with a final consonant', () => {
    const chip = buildHomeHeroMemoryChip([record()], '몽실', now);

    expect(chip?.label).toBe('3일 전, 몽실과 산책한 추억이 있어요');
  });

  it('builds a neutral create action when there is no record', () => {
    expect(buildHomeHeroMemoryChip([], '누리', now)).toEqual({
      recordId: null,
      label: '기록을 시작해보아요',
      accessibilityLabel: '기록을 시작해보아요, 기록 작성하기',
    });
  });
});
