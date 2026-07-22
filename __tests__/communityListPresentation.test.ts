import { formatCommunityListTimestamp } from '../src/screens/Community/communityListPresentation';

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
