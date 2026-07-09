import {
  buildRankingBars,
  formatRankingScore,
  mapActivityRankingRow,
} from '../src/services/ranking/activityRanking';

describe('activity ranking view model', () => {
  it('RPC 제한 필드만 화면 row로 매핑한다', () => {
    const row = mapActivityRankingRow({
      rank_no: 1,
      display_name: 'adminQA3',
      score: 170400,
      level: 30,
      total_xp: 170400,
      category: 'overall',
      is_current_user: false,
      row_source: 'qa_fixture',
      user_id: 'must-not-be-read',
      email: 'must-not-be-read@example.com',
    });

    expect(row).toEqual({
      rankNo: 1,
      displayName: 'adminQA3',
      score: 170400,
      level: 30,
      totalXp: 170400,
      category: 'overall',
      isCurrentUser: false,
      rowSource: 'qa_fixture',
    });
  });

  it('카테고리별 점수 단위를 구분한다', () => {
    expect(formatRankingScore({ score: 1200, category: 'walk' })).toBe('1,200 XP');
    expect(formatRankingScore({ score: 12, category: 'comments' })).toBe('12건');
    expect(formatRankingScore({ score: 3, category: 'grooming' })).toBe('3건');
  });

  it('기둥그래프 비율은 최대 점수 기준으로 안정적으로 계산한다', () => {
    const bars = buildRankingBars([
      {
        rankNo: 1,
        displayName: '나',
        score: 100,
        level: 12,
        totalXp: 4200,
        category: 'posts',
        isCurrentUser: true,
        rowSource: 'user',
      },
      {
        rankNo: 2,
        displayName: '누리 친구 2',
        score: 1,
        level: 3,
        totalXp: 250,
        category: 'posts',
        isCurrentUser: false,
        rowSource: 'user',
      },
    ]);

    expect(bars[0].barRatio).toBe(1);
    expect(bars[0].scoreLabel).toBe('100건');
    expect(bars[1].barRatio).toBe(0.08);
  });
});
