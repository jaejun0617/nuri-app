import {
  ACTIVITY_XP_POLICIES,
  ACTIVITY_REWARD_BASE_SCALE,
  BASE_ACTIVITY_DAILY_XP_CAP,
  MAX_ACTIVITY_LEVEL,
  MAX_ACTIVITY_LEVEL_XP,
  TITLE_POLICIES,
  calculateEffectiveActivityXp,
  calculateLevel,
  getLevelFloorXp,
  getNextLevelXp,
  getProgressWithinLevel,
  getLevelRewardMultiplier,
} from '../src/services/activity/progressPolicy';

describe('V1.1 activity progress policy', () => {
  it('XP 지급 기준과 daily cap 기준을 고정한다', () => {
    expect(BASE_ACTIVITY_DAILY_XP_CAP).toBe(150);
    expect(ACTIVITY_REWARD_BASE_SCALE).toBe(1.3);
    expect(ACTIVITY_XP_POLICIES.walk_timeline_post).toMatchObject({
      xp: 39,
      dailyLimit: 1,
      baseActivityCapApplies: true,
    });
    expect(ACTIVITY_XP_POLICIES.comment).toMatchObject({
      xp: 4,
      dailyLimit: 10,
      baseActivityCapApplies: true,
    });
    expect(ACTIVITY_XP_POLICIES.streak_30_bonus).toMatchObject({
      xp: 390,
      dailyLimit: 1,
      baseActivityCapApplies: false,
    });
  });

  it('Lv.1~100 레벨 구간을 정책표와 동일하게 계산한다', () => {
    expect(MAX_ACTIVITY_LEVEL).toBe(100);
    expect(MAX_ACTIVITY_LEVEL_XP).toBe(1250000);
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(99)).toBe(1);
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(250)).toBe(3);
    expect(calculateLevel(700)).toBe(5);
    expect(calculateLevel(2500)).toBe(10);
    expect(calculateLevel(3200)).toBe(11);
    expect(calculateLevel(80900)).toBe(25);
    expect(calculateLevel(170400)).toBe(30);
    expect(calculateLevel(175100)).toBe(31);
    expect(calculateLevel(220000)).toBe(36);
    expect(calculateLevel(459400)).toBe(55);
    expect(calculateLevel(783700)).toBe(75);
    expect(calculateLevel(1152300)).toBe(95);
    expect(calculateLevel(1250000)).toBe(100);
    expect(calculateLevel(2000000)).toBe(100);
    expect(getLevelFloorXp(5)).toBe(700);
    expect(getNextLevelXp(5)).toBe(1000);
    expect(getNextLevelXp(10)).toBe(3200);
    expect(getNextLevelXp(30)).toBe(175100);
    expect(getNextLevelXp(100)).toBe(1250000);
    expect(getProgressWithinLevel({ totalXp: 850, level: 5 })).toBeCloseTo(0.5);
    expect(getProgressWithinLevel({ totalXp: 2000000, level: 100 })).toBe(1);
  });

  it('레벨이 높아질수록 같은 활동의 XP 보상량을 점진 감쇠한다', () => {
    expect(getLevelRewardMultiplier(1)).toBe(1);
    expect(getLevelRewardMultiplier(15)).toBe(0.9);
    expect(getLevelRewardMultiplier(35)).toBe(0.8);
    expect(getLevelRewardMultiplier(55)).toBe(0.7);
    expect(getLevelRewardMultiplier(75)).toBe(0.6);
    expect(getLevelRewardMultiplier(95)).toBe(0.5);

    expect(calculateEffectiveActivityXp({ eventType: 'walk_timeline_post', level: 1 })).toBe(39);
    expect(calculateEffectiveActivityXp({ eventType: 'walk_timeline_post', level: 15 })).toBe(35);
    expect(calculateEffectiveActivityXp({ eventType: 'walk_timeline_post', level: 35 })).toBe(31);
    expect(calculateEffectiveActivityXp({ eventType: 'walk_timeline_post', level: 55 })).toBe(27);
    expect(calculateEffectiveActivityXp({ eventType: 'walk_timeline_post', level: 75 })).toBe(23);
    expect(calculateEffectiveActivityXp({ eventType: 'walk_timeline_post', level: 95 })).toBe(20);
    expect(calculateEffectiveActivityXp({ eventType: 'comment', level: 100 })).toBe(2);
  });

  it('칭호 네이밍은 귀엽고 따뜻한 최소 MVP만 포함한다', () => {
    expect(TITLE_POLICIES.map(item => item.name)).toEqual(
      expect.arrayContaining([
        '첫 산책 친구',
        '산책 새싹',
        '추억 수집가',
        '댓글 요정',
      ]),
    );
    expect(TITLE_POLICIES.some(item => item.name.includes('랭킹'))).toBe(false);
  });
});
