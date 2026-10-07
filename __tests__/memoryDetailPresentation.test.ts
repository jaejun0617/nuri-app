import fs from 'node:fs';
import path from 'node:path';
import {
  getMemoryDetailDayBounds,
  selectSameDayRelatedRecords,
  formatMemoryDetailDate,
} from '../src/services/records/detail';
import { getTimelineEmptyCopy } from '../src/services/timeline/emptyState';
import {
  getRecordCategoryMeta,
  TIMELINE_MAIN_CATEGORY_OPTIONS,
  TIMELINE_OTHER_SUBCATEGORY_OPTIONS,
} from '../src/services/memories/categoryMeta';
import type { MemoryRecord } from '../src/services/supabase/memories';
import { styles } from '../src/screens/Records/RecordDetailScreen.styles';
import { StyleSheet } from 'react-native';

const record: MemoryRecord = {
  id: 'current',
  petId: 'pet',
  title: '합성 기록',
  tags: [],
  imagePaths: [],
  occurredAt: '2026-10-04',
  createdAt: '2026-10-04T03:16:00Z',
  category: 'diary',
};
const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('memory detail and timeline polish', () => {
  it('uses KST day bounds, including midnight fallback and year rollover', () => {
    expect(getMemoryDetailDayBounds(record)).toEqual({
      startYmd: '2026-10-04',
      endExclusiveYmd: '2026-10-05',
      createdAtStartIso: '2026-10-03T15:00:00.000Z',
      createdAtEndExclusiveIso: '2026-10-04T15:00:00.000Z',
    });
    expect(
      getMemoryDetailDayBounds({
        ...record,
        occurredAt: null,
        createdAt: '2026-12-31T15:01:00Z',
      })?.startYmd,
    ).toBe('2027-01-01');
    expect(
      getMemoryDetailDayBounds({ createdAt: 'invalid', occurredAt: null }),
    ).toBeNull();
    expect(formatMemoryDetailDate(record)).toContain('오후 12:16');
  });
  it('selects only the same pet and displayed day, excludes current/health, deduplicates and sorts stably', () => {
    const first = { ...record, id: 'b', createdAt: '2026-10-04T03:15:00Z' };
    const second = { ...first, id: 'a' };
    expect(
      selectSameDayRelatedRecords(record, [
        record,
        second,
        first,
        first,
        { ...first, id: 'other-pet', petId: 'other' },
        { ...first, id: 'other-day', occurredAt: '2026-10-05' },
        { ...first, id: 'health', category: 'health' },
      ]).map(item => item.id),
    ).toEqual(['b', 'a']);
  });
  it.each(
    TIMELINE_MAIN_CATEGORY_OPTIONS.filter(option => option.key !== 'all'),
  )('defines distinct empty copy for $key', option => {
    expect(getTimelineEmptyCopy(option.key, null).title).not.toBe(
      getTimelineEmptyCopy('all', null).title,
    );
  });
  it.each(TIMELINE_OTHER_SUBCATEGORY_OPTIONS)(
    'preserves lifestyle hierarchy for $key',
    option => {
      const item = { ...record, category: 'other', subCategory: option.key };
      expect(getRecordCategoryMeta(item).label).toBe(`생활 · ${option.label}`);
      expect(getTimelineEmptyCopy('other', option.key).title).toContain(
        option.label,
      );
    },
  );
  it('allows original media ratios and keeps compact content-width chips', () => {
    expect(StyleSheet.flatten(styles.postImageViewport)).toMatchObject({
      borderRadius: 18,
    });
    expect(StyleSheet.flatten(styles.postImageViewport)).not.toHaveProperty(
      'aspectRatio',
    );
    expect(StyleSheet.flatten(styles.categoryChip)).toMatchObject({
      paddingHorizontal: 8,
      paddingVertical: 3,
      alignSelf: 'flex-start',
    });
    expect(StyleSheet.flatten(styles.categoryChip)).not.toHaveProperty('width');
    expect(StyleSheet.flatten(styles.tagChip)).toMatchObject({
      paddingHorizontal: 10,
      paddingVertical: 5,
    });
    expect(StyleSheet.flatten(styles.postMoreBtn)).toMatchObject({
      width: 44,
      height: 44,
    });
  });
  it('does not forward stale Home origin when tapping the Timeline list', () => {
    const source = read('src/screens/Records/TimelineScreen.tsx');
    const start = source.indexOf('const onPressItem');
    const end = source.indexOf('const onRefresh', start);
    const caller = source.slice(start, end);
    expect(caller).toContain("entrySource: 'timeline'");
    expect(caller).not.toContain('route.params?.entrySource');
  });
  it.each([
    'Records/RecordCreateScreen',
    'Records/RecordEditScreen',
    'Schedules/ScheduleCreateScreen',
    'Schedules/ScheduleEditScreen',
    'Pets/PetCreateScreen',
    'Pets/PetProfileEditScreen',
    'Auth/SignInScreen',
  ])('removes the wave and changing visible submit label from %s', screen => {
    const source = read(`src/screens/${screen}.tsx`);
    expect(source).not.toContain('WaveText');
    expect(source).not.toMatch(/label=\{saving\s*\?/);
    expect(source).toMatch(/disabled=\{/);
    expect(source).toMatch(/saving|submitting/);
  });
  it('makes continue-writing primary and exit neutral without changing draft protection', () => {
    const source = read('src/screens/Records/RecordCreateScreen.tsx');
    expect(source).toContain('cancelRole="primary"');
    expect(source).toContain('confirmRole="neutral"');
    expect(source).toContain('cancelLabel="계속 작성하기"');
    expect(source).toContain('confirmLabel="나가기"');
  });
});
