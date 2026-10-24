import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildActivityDashboard } from '../src/services/activity/activityDashboard';
import {
  loadHomeTitleSelection,
  saveHomeTitleSelection,
} from '../src/services/activity/homeTitleSelection';
import { getTitleArtwork } from '../src/services/activity/titleArtwork';

const dashboard = () =>
  buildActivityDashboard({
    pets: [
      { id: 'a', name: '첫째' },
      { id: 'b', name: '둘째' },
    ],
    levelSummary: {
      totalXp: 20,
      level: 1,
      currentLevelXp: 0,
      nextLevelXp: 100,
      updatedAt: null,
    },
    titles: [],
    ledgerRows: [],
    streakByPetId: {},
    timelineCountsByPetId: {},
    healthRecordCountsByPetId: { a: 1, b: 0 },
    communityPostCount: 1,
    commentCount: 0,
  });
beforeEach(() => {
  jest.clearAllMocks();
  const values = new Map<string, string>();
  jest
    .mocked(AsyncStorage.getItem)
    .mockImplementation(async key => values.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
    values.set(key, value);
  });
});

it('persists a source-derived earned choice across reloads without modifying XP or awards', async () => {
  const data = dashboard(),
    before = JSON.stringify(data);
  const selected = await saveHomeTitleSelection({
    userId: 'owner',
    petId: 'a',
    achievementKey: 'pet_first_health_record',
    dashboard: data,
  });
  expect(selected).toEqual({
    titleKey: 'HC01',
    titleName: '작은 건강지킴이',
  });
  expect(await loadHomeTitleSelection({ userId: 'owner', petId: 'a' })).toEqual(
    selected,
  );
  expect(JSON.stringify(data)).toBe(before);
  expect(getTitleArtwork(selected.titleKey)).toBe(
    require('../src/assets/activity/titles-v2/hc01.png'),
  );
});

it('isolates the same device preference by account and pet', async () => {
  await saveHomeTitleSelection({
    userId: 'owner',
    petId: 'a',
    achievementKey: 'pet_first_health_record',
    dashboard: dashboard(),
  });
  expect(
    await loadHomeTitleSelection({ userId: 'owner', petId: 'b' }),
  ).toBeNull();
  expect(
    await loadHomeTitleSelection({ userId: 'other', petId: 'a' }),
  ).toBeNull();
  expect(await loadHomeTitleSelection({ userId: null, petId: 'a' })).toBeNull();
});

it('allows an earned common title for an existing pet without changing its award scope', async () => {
  const data = dashboard(),
    before = JSON.stringify(data);
  const selected = await saveHomeTitleSelection({
    userId: 'owner',
    petId: 'b',
    achievementKey: 'common_first_hello_done',
    dashboard: data,
  });
  expect(selected.titleName).toBe('반가운 인사친구');
  expect(JSON.stringify(data)).toBe(before);
});

it.each([
  ['a', 'pet_steady_walker'],
  ['b', 'pet_first_health_record'],
  ['a', 'constructor'],
  ['missing', 'common_first_hello_done'],
])(
  'rejects unavailable or unearned selection for %s / %s before storage',
  async (petId, key) => {
    await expect(
      saveHomeTitleSelection({
        userId: 'owner',
        petId,
        achievementKey: key,
        dashboard: dashboard(),
      }),
    ).rejects.toThrow(/^TITLE_/);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  },
);

it('does not replace the previous choice when storage fails', async () => {
  const data = dashboard();
  const original = await saveHomeTitleSelection({
    userId: 'owner',
    petId: 'a',
    achievementKey: 'common_first_hello_done',
    dashboard: data,
  });
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk'));
  await expect(
    saveHomeTitleSelection({
      userId: 'owner',
      petId: 'a',
      achievementKey: 'pet_first_health_record',
      dashboard: data,
    }),
  ).rejects.toThrow('disk');
  expect(await loadHomeTitleSelection({ userId: 'owner', petId: 'a' })).toEqual(
    original,
  );
});

it.each([
  '{',
  '{"version":2}',
  '{"version":1,"titleKey":"constructor","titleName":"fake"}',
])('treats malformed or unknown local metadata as no preference', async raw => {
  await AsyncStorage.setItem('@nuri/home-title-selection/v1:owner:a', raw);
  expect(
    await loadHomeTitleSelection({ userId: 'owner', petId: 'a' }),
  ).toBeNull();
  expect(getTitleArtwork('constructor')).toBeUndefined();
});
