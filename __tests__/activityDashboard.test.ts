import {
  buildActivityDashboard,
  type ActivityDashboardLedgerRow,
} from '../src/services/activity/activityDashboard';
import { createEmptyTimelineCategoryCounts } from '../src/services/timeline/query';

const levelSummary = {
  totalXp: 75,
  level: 1,
  currentLevelXp: 0,
  nextLevelXp: 100,
  updatedAt: '2026-07-02T00:00:00.000Z',
};

function ledger(
  input: Partial<ActivityDashboardLedgerRow> &
    Pick<ActivityDashboardLedgerRow, 'id' | 'petId' | 'eventType' | 'xp'>,
): ActivityDashboardLedgerRow {
  return {
    sourceType: 'test',
    sourceId: input.id,
    activityDateKst: '2026-07-02',
    createdAt: '2026-07-02T00:00:00.000Z',
    ...input,
  };
}

describe('activity dashboard summary', () => {
  it('pet-scoped 활동과 user-level 공통 활동을 분리해 중복 합산하지 않는다', () => {
    const timelineCounts = {
      ...createEmptyTimelineCategoryCounts(),
      all: 2,
      walk: 1,
      meal: 1,
    };

    const dashboard = buildActivityDashboard({
      pets: [
        { id: 'pet-1', name: '첫째' },
        { id: 'pet-2', name: '둘째' },
      ],
      levelSummary,
      titles: [],
      ledgerRows: [
        ledger({ id: 'walk-1', petId: 'pet-1', eventType: 'walk_timeline_post', xp: 30 }),
        ledger({ id: 'health-1', petId: 'pet-1', eventType: 'health_record', xp: 10 }),
        ledger({ id: 'walk-2', petId: 'pet-2', eventType: 'walk_record', xp: 20 }),
        ledger({ id: 'post-1', petId: null, eventType: 'community_post', xp: 10 }),
        ledger({ id: 'comment-1', petId: null, eventType: 'comment', xp: 3 }),
      ],
      streakByPetId: {
        'pet-1': {
          currentStreak: 1,
          bestStreak: 3,
          todayCompleted: true,
          activityDateKst: '2026-07-02',
        },
      },
      timelineCountsByPetId: {
        'pet-1': timelineCounts,
      },
      healthRecordCountsByPetId: {
        'pet-1': 1,
      },
      communityPostCount: 1,
      commentCount: 1,
    });

    expect(dashboard.petSummaries).toHaveLength(2);
    expect(dashboard.petSummaries[0]).toMatchObject({
      petId: 'pet-1',
      xp: 40,
      walk: { eventCount: 1, xp: 30 },
      health: { eventCount: 1, xp: 10, recordCount: 1 },
    });
    expect(dashboard.petSummaries[1]).toMatchObject({
      petId: 'pet-2',
      xp: 20,
      walk: { eventCount: 1, xp: 20 },
    });
    expect(dashboard.commonSummary).toMatchObject({
      xp: 13,
      communityPosts: { eventCount: 1, xp: 10, postCount: 1 },
      comments: { eventCount: 1, xp: 3, commentCount: 1 },
    });
  });

  it('칭호·훈장은 획득/미획득 상태를 조건 기준으로 계산한다', () => {
    const dashboard = buildActivityDashboard({
      pets: [{ id: 'pet-1', name: '첫째' }],
      levelSummary,
      titles: [
        {
          titleKey: 'first_walk_friend',
          titleName: '첫 산책 친구',
          earnedAt: '2026-07-02T00:00:00.000Z',
          sourceType: 'xp_ledger',
          petId: 'pet-1',
        },
      ],
      ledgerRows: [
        ledger({ id: 'walk-1', petId: 'pet-1', eventType: 'walk_timeline_post', xp: 30 }),
      ],
      streakByPetId: {
        'pet-1': {
          currentStreak: 1,
          bestStreak: 1,
          todayCompleted: true,
          activityDateKst: '2026-07-02',
        },
      },
      timelineCountsByPetId: {
        'pet-1': {
          ...createEmptyTimelineCategoryCounts(),
          all: 1,
          walk: 1,
        },
      },
      healthRecordCountsByPetId: {},
      communityPostCount: 0,
      commentCount: 0,
    });

    expect(dashboard.representativeTitle).toBe('첫 산책 친구');
    expect(
      dashboard.allAchievements.find(item => item.key === 'pet_first_walk_friend'),
    ).toMatchObject({ achieved: true });
    expect(
      dashboard.allAchievements.find(item => item.key === 'pet_walk_sprout'),
    ).toMatchObject({ achieved: false, threshold: 7 });
  });

  it('글·댓글·카테고리별 게시물 등록 결과를 활동·칭호 카드 지표로 분리 반영한다', () => {
    const petOneCounts = {
      ...createEmptyTimelineCategoryCounts(),
      all: 13,
      walk: 3,
      meal: 4,
      diary: 4,
      other: 2,
    };
    const petTwoCounts = {
      ...createEmptyTimelineCategoryCounts(),
      all: 2,
      meal: 2,
    };

    const dashboard = buildActivityDashboard({
      pets: [
        { id: 'pet-1', name: '첫째' },
        { id: 'pet-2', name: '둘째' },
      ],
      levelSummary: {
        ...levelSummary,
        totalXp: 151,
        level: 2,
        currentLevelXp: 100,
        nextLevelXp: 250,
      },
      titles: [],
      ledgerRows: [
        ledger({ id: 'walk-1', petId: 'pet-1', eventType: 'walk_timeline_post', xp: 30 }),
        ledger({ id: 'walk-2', petId: 'pet-1', eventType: 'walk_timeline_post', xp: 30 }),
        ledger({ id: 'meal-1', petId: 'pet-1', eventType: 'timeline_post', xp: 15 }),
        ledger({ id: 'diary-1', petId: 'pet-1', eventType: 'timeline_post', xp: 15 }),
        ledger({ id: 'health-1', petId: 'pet-1', eventType: 'health_record', xp: 10 }),
        ledger({ id: 'meal-2', petId: 'pet-2', eventType: 'timeline_post', xp: 15 }),
        ledger({ id: 'community-1', petId: null, eventType: 'community_post', xp: 10 }),
        ledger({ id: 'community-2', petId: null, eventType: 'community_post', xp: 10 }),
        ledger({ id: 'comment-1', petId: null, eventType: 'comment', xp: 3 }),
        ledger({ id: 'comment-2', petId: null, eventType: 'comment', xp: 3 }),
        ledger({ id: 'comment-3', petId: null, eventType: 'comment', xp: 3 }),
      ],
      streakByPetId: {
        'pet-1': {
          currentStreak: 2,
          bestStreak: 2,
          todayCompleted: true,
          activityDateKst: '2026-07-02',
        },
      },
      timelineCountsByPetId: {
        'pet-1': petOneCounts,
        'pet-2': petTwoCounts,
      },
      healthRecordCountsByPetId: {
        'pet-1': 1,
      },
      communityPostCount: 2,
      commentCount: 3,
    });

    const firstPet = dashboard.petSummaries.find(item => item.petId === 'pet-1');
    const secondPet = dashboard.petSummaries.find(item => item.petId === 'pet-2');

    expect(firstPet).toMatchObject({
      xp: 100,
      walk: { eventCount: 2, xp: 60 },
      timeline: { eventCount: 4, xp: 90 },
      health: { eventCount: 1, xp: 10, recordCount: 1 },
      timelineCategoryCounts: petOneCounts,
    });
    expect(secondPet).toMatchObject({
      xp: 15,
      walk: { eventCount: 0, xp: 0 },
      timeline: { eventCount: 1, xp: 15 },
      timelineCategoryCounts: petTwoCounts,
    });
    expect(dashboard.commonSummary).toMatchObject({
      xp: 29,
      communityPosts: { eventCount: 2, xp: 20, postCount: 2 },
      comments: { eventCount: 3, xp: 9, commentCount: 3 },
    });
    expect(firstPet?.achievements.find(item => item.key === 'pet_category_keeper')).toMatchObject({
      achieved: true,
      currentValue: 13,
    });
    expect(
      dashboard.commonSummary.achievements.find(item => item.key === 'common_first_hello_done'),
    ).toMatchObject({
      achieved: true,
      currentValue: 2,
    });
    expect(
      dashboard.commonSummary.achievements.find(item => item.key === 'common_kind_commenter'),
    ).toMatchObject({
      achieved: false,
      currentValue: 3,
      threshold: 10,
    });
  });
});
