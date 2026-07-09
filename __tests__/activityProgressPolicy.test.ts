import {
  ACTIVITY_XP_POLICIES,
  BASE_ACTIVITY_DAILY_XP_CAP,
  TITLE_POLICIES,
  calculateLevel,
  getLevelFloorXp,
  getNextLevelXp,
  getProgressWithinLevel,
} from '../src/services/activity/progressPolicy';

describe('V1.1 activity progress policy', () => {
  it('XP 지급 기준과 daily cap 기준을 고정한다', () => {
    expect(BASE_ACTIVITY_DAILY_XP_CAP).toBe(150);
    expect(ACTIVITY_XP_POLICIES.walk_timeline_post).toMatchObject({
      xp: 30,
      dailyLimit: 1,
      baseActivityCapApplies: true,
    });
    expect(ACTIVITY_XP_POLICIES.comment).toMatchObject({
      xp: 3,
      dailyLimit: 10,
      baseActivityCapApplies: true,
    });
    expect(ACTIVITY_XP_POLICIES.streak_30_bonus).toMatchObject({
      xp: 300,
      dailyLimit: 1,
      baseActivityCapApplies: false,
    });
  });

  it('Lv.1~30 레벨 구간을 정책표와 동일하게 계산한다', () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(99)).toBe(1);
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(250)).toBe(3);
    expect(calculateLevel(700)).toBe(5);
    expect(calculateLevel(2500)).toBe(10);
    expect(calculateLevel(3200)).toBe(11);
    expect(calculateLevel(80900)).toBe(25);
    expect(calculateLevel(170400)).toBe(30);
    expect(calculateLevel(220000)).toBe(30);
    expect(getLevelFloorXp(5)).toBe(700);
    expect(getNextLevelXp(5)).toBe(1000);
    expect(getNextLevelXp(10)).toBe(3200);
    expect(getNextLevelXp(30)).toBe(170400);
    expect(getProgressWithinLevel({ totalXp: 850, level: 5 })).toBeCloseTo(0.5);
    expect(getProgressWithinLevel({ totalXp: 220000, level: 30 })).toBe(1);
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
