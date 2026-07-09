import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  buildRewardNoticeDismissStorageKey,
  dismissRewardNoticeForToday,
  isRewardNoticeDismissedToday,
  REWARD_NOTICE_DISMISS_STORAGE_PREFIX_FOR_TEST,
} from '../src/services/local/rewardNoticePreference';

describe('reward notice preference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('사용자별 오늘 하루 안 보기 key를 분리한다', async () => {
    await dismissRewardNoticeForToday(
      'user-a',
      new Date('2026-07-04T15:30:00.000Z'),
    );

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      `${REWARD_NOTICE_DISMISS_STORAGE_PREFIX_FOR_TEST}:user-a`,
      '2026-07-05',
    );
    expect(buildRewardNoticeDismissStorageKey('user-b')).toBe(
      `${REWARD_NOTICE_DISMISS_STORAGE_PREFIX_FOR_TEST}:user-b`,
    );
  });

  it('KST 기준 오늘 저장값만 숨김으로 판단한다', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('2026-07-05');

    await expect(
      isRewardNoticeDismissedToday(
        'user-a',
        new Date('2026-07-04T15:30:00.000Z'),
      ),
    ).resolves.toBe(true);
  });

  it('다른 날짜 저장값은 오늘 숨김으로 보지 않는다', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('2026-07-04');

    await expect(
      isRewardNoticeDismissedToday(
        'user-a',
        new Date('2026-07-04T15:30:00.000Z'),
      ),
    ).resolves.toBe(false);
  });
});
