import {
  createTimelineEntryRequestId,
  HOME_TOTAL_SUMMARY_ENTRY_SOURCE,
  isTimelineEntryPending,
  shouldShowTimelineEmpty,
  shouldShowTimelineEntryLoading,
} from '../src/screens/Records/timelineEntry';

describe('timeline total-summary entry state', () => {
  it('same category taps still receive a new request id', () => {
    const first = createTimelineEntryRequestId(0, 1_700_000_000_000);
    const second = createTimelineEntryRequestId(first, 1_700_000_000_000);

    expect(second).toBeGreaterThan(first);
  });

  it('blocks the previous timeline until a new home entry is applied', () => {
    expect(
      isTimelineEntryPending(
        HOME_TOTAL_SUMMARY_ENTRY_SOURCE,
        11,
        10,
      ),
    ).toBe(true);
    expect(
      isTimelineEntryPending(
        HOME_TOTAL_SUMMARY_ENTRY_SOURCE,
        11,
        11,
      ),
    ).toBe(false);
  });

  it('shows loading during transition and not a false empty state', () => {
    expect(
      shouldShowTimelineEntryLoading({
        isEntryPending: true,
        status: 'ready',
      }),
    ).toBe(true);
    expect(
      shouldShowTimelineEmpty({
        isEntryPending: true,
        status: 'ready',
        filteredCount: 0,
      }),
    ).toBe(false);
  });

  it('shows the empty state only after a ready query returns no records', () => {
    expect(
      shouldShowTimelineEmpty({
        isEntryPending: false,
        status: 'loading',
        filteredCount: 0,
      }),
    ).toBe(false);
    expect(
      shouldShowTimelineEmpty({
        isEntryPending: false,
        status: 'ready',
        filteredCount: 0,
      }),
    ).toBe(true);
  });
});
