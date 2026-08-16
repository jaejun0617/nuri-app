import {
  canCreateCommunityPost,
  COMMUNITY_CATEGORY_OPTIONS,
  COMMUNITY_LIST_FILTER_OPTIONS,
  COMMUNITY_NOTICE_ICON_NAME,
  formatCommunityListTimestamp,
  getCommunityEmptyState,
  getCommunityCategoryLabel,
  getCommunityPostAccessibilityLabel,
  getCommunityPostTitleLineCount,
} from '../src/screens/Community/communityListPresentation';
import { styles as postCardStyles } from '../src/screens/Community/components/PostCard.styles';
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

  it('only exposes the regular post CTA in the all filter', () => {
    expect(canCreateCommunityPost('all')).toBe(true);
    expect(canCreateCommunityPost('popular')).toBe(false);
    expect(canCreateCommunityPost('notice')).toBe(false);

    expect(getCommunityEmptyState('all')).toEqual({
      title: '아직 게시글이 없어요',
      showCreateCta: true,
    });
    expect(getCommunityEmptyState('popular')).toEqual({
      title: '아직 인기글이 없어요',
      showCreateCta: false,
    });
    expect(getCommunityEmptyState('notice')).toEqual({
      title: '등록된 공지가 없어요',
      showCreateCta: false,
    });
    expect(getCommunityEmptyState('all', 'info')).toEqual({
      title: '정보 게시글이 없어요',
      showCreateCta: true,
    });
  });

  it('exposes the approved secondary categories without the legacy tips label', () => {
    expect(COMMUNITY_CATEGORY_OPTIONS).toEqual([
      { key: 'all', label: '전체' },
      { key: 'question', label: '질문' },
      { key: 'info', label: '정보' },
      { key: 'daily', label: '일상' },
      { key: 'free', label: '자유' },
    ]);
    expect(COMMUNITY_CATEGORY_OPTIONS.map(option => option.label)).not.toContain(
      '팁 공유',
    );
  });

  it('defines a non-color-only notice presentation contract', () => {
    expect(COMMUNITY_NOTICE_ICON_NAME).toBe('pin');
    expect(
      getCommunityPostAccessibilityLabel('운영 안내', 2, true),
    ).toBe('공지사항 게시글, 운영 안내, 댓글 2개');
    expect(getCommunityPostAccessibilityLabel('일반 글', 0, false)).toBe(
      '일반 글, 댓글 0개',
    );
    expect(getCommunityPostTitleLineCount(true)).toBe(2);
    expect(getCommunityPostTitleLineCount(false)).toBe(1);
    expect(postCardStyles.noticeRow).toMatchObject({
      borderWidth: 1,
      borderRadius: 10,
    });
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
