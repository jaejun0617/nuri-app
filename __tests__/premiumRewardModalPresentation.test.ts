import { buildPremiumRewardLevelStatus } from '../src/services/activity/rewardNoticePresentation';

describe('PremiumRewardModal max level presentation', () => {
  it('Lv.30 이상 max XP는 최고 레벨 달성 상태로 고정한다', () => {
    expect(buildPremiumRewardLevelStatus({ totalXp: 170400, level: 30 })).toEqual({
      level: 30,
      isMaxLevel: true,
      progress: 1,
      statusLabel: '최고 레벨 달성',
    });
  });

  it('over max XP에서도 다음 레벨 음수/NaN/Infinity 문구를 만들지 않는다', () => {
    const status = buildPremiumRewardLevelStatus({
      totalXp: 220000,
      level: 31,
    });

    expect(status).toMatchObject({
      level: 30,
      isMaxLevel: true,
      progress: 1,
      statusLabel: '최고 레벨 달성',
    });
    expect(JSON.stringify(status)).not.toMatch(/NaN|Infinity|-\d/);
  });

  it('중간 레벨은 다음 레벨까지 남은 XP를 안전하게 표시한다', () => {
    expect(buildPremiumRewardLevelStatus({ totalXp: 850, level: 5 })).toMatchObject({
      level: 5,
      isMaxLevel: false,
      progress: 0.5,
      statusLabel: '다음 레벨까지 150 XP',
    });
  });
});
