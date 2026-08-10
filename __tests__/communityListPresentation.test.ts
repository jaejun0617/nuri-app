import {
  COMMUNITY_LIST_FILTER_OPTIONS,
  formatCommunityListTimestamp,
  getCommunityCategoryLabel,
} from '../src/screens/Community/communityListPresentation';
import {
  COMMUNITY_PAGE_SIZE_OPTIONS,
  DEFAULT_COMMUNITY_PAGE_SIZE,
} from '../src/types/community';

describe('formatCommunityListTimestamp', () => {
  const now = new Date('2026-07-19T01:30:00.000Z');

  it('shows KST clock time for a post created today', () => {
    expect(
      formatCommunityListTimestamp('2026-07-19T00:07:00.000Z', now),
    ).toBe('09:07');
  });

  it('shows month and day for an older post in the current year', () => {
    expect(
      formatCommunityListTimestamp('2026-06-03T18:00:00.000Z', now),
    ).toBe('06.04');
  });

  it('includes a short year when the post is from another year', () => {
    expect(
      formatCommunityListTimestamp('2024-12-31T18:00:00.000Z', now),
    ).toBe('25.01.01');
  });

  it('returns a stable fallback for an invalid timestamp', () => {
    expect(formatCommunityListTimestamp('invalid', now)).toBe('-');
  });
});

describe('community list controls', () => {
  it('exposes only all, popular, and notice filters', () => {
    expect(COMMUNITY_LIST_FILTER_OPTIONS).toEqual([
      { key: 'all', label: '전체' },
      { key: 'popular', label: '인기글' },
      { key: 'notice', label: '공지' },
    ]);
    expect(COMMUNITY_LIST_FILTER_OPTIONS.map(option => option.label)).not.toContain(
      '팁 공유',
    );
  });

  it('keeps the approved page sizes with 30 as the default', () => {
    expect(DEFAULT_COMMUNITY_PAGE_SIZE).toBe(30);
    expect(COMMUNITY_PAGE_SIZE_OPTIONS).toEqual([30, 50, 100, 150, 200]);
  });

  it('maps the persisted info category to 정보 without deleting legacy values', () => {
    expect(getCommunityCategoryLabel('info')).toBe('정보');
    expect(getCommunityCategoryLabel('free')).toBe('자유');
    expect(getCommunityCategoryLabel('question')).toBe('질문');
  });
});
