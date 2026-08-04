import {
  createTimelineEntryRequestId,
  getLatestTimelineEntrySnapshot,
  HOME_TOTAL_SUMMARY_ENTRY_SOURCE,
  invalidateTimelineEntryRequest,
  isLatestTimelineEntryGeneration,
  isLatestTimelineEntrySnapshot,
  isLatestTimelineEntryRequest,
  publishTimelineEntryRequest,
  resetTimelineEntryControllerForTests,
  isTimelineEntryPending,
  shouldShowTimelineEmpty,
  shouldShowTimelineEntryLoading,
} from '../src/screens/Records/timelineEntry';

describe('timeline total-summary entry state', () => {
  afterEach(() => {
    resetTimelineEntryControllerForTests();
  });

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

  it('keeps only the latest immutable entry snapshot', () => {
    const first = publishTimelineEntryRequest({
      entryRequestId: 1,
      entrySource: HOME_TOTAL_SUMMARY_ENTRY_SOURCE,
      petId: 'pet-a',
      mainCategory: 'walk',
      otherSubCategory: null,
      ymFilter: null,
      createdAt: 1,
    });
    const second = publishTimelineEntryRequest({
      entryRequestId: 2,
      entrySource: HOME_TOTAL_SUMMARY_ENTRY_SOURCE,
      petId: 'pet-a',
      mainCategory: 'meal',
      otherSubCategory: null,
      ymFilter: null,
      createdAt: 2,
    });

    expect(isLatestTimelineEntrySnapshot(first)).toBe(false);
    expect(isLatestTimelineEntrySnapshot(second)).toBe(true);
    expect(isLatestTimelineEntryRequest(first.request.entryRequestId)).toBe(
      false,
    );
    expect(
      isLatestTimelineEntryGeneration(
        second.request.entryRequestId,
        second.generation,
      ),
    ).toBe(true);
    expect(getLatestTimelineEntrySnapshot()).toEqual(second);
    expect(Object.isFrozen(second.request)).toBe(true);
  });

  it('invalidates only the matching latest request', () => {
    publishTimelineEntryRequest({
      entryRequestId: 10,
      entrySource: HOME_TOTAL_SUMMARY_ENTRY_SOURCE,
      petId: 'pet-a',
      mainCategory: 'all',
      otherSubCategory: null,
      ymFilter: null,
      createdAt: 10,
    });

    invalidateTimelineEntryRequest(9);
    expect(getLatestTimelineEntrySnapshot()).not.toBeNull();

    invalidateTimelineEntryRequest(10);
    expect(getLatestTimelineEntrySnapshot()).toBeNull();
    expect(isLatestTimelineEntryRequest(10)).toBe(false);
  });
});
