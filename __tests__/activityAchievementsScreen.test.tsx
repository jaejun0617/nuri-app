import React from 'react';
import ReactNative from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import Screen from '../src/screens/Pets/PetActivityAchievementsScreen';
import {
  buildActivityDashboard,
  loadActivityDashboard,
} from '../src/services/activity/activityDashboard';
import { createEmptyTimelineCategoryCounts } from '../src/services/timeline/query';
import {
  ACHIEVEMENT_ART,
  getActivityLayout,
  getActivityVault,
  getChallengeProgress,
  getWalkActivityCount,
} from '../src/screens/Pets/activityAchievementsPresentation';
import type {
  ActivityAchievement,
  ActivityDashboardData,
} from '../src/services/activity/activityDashboard';
import { LAVENDER_CANVAS } from '../src/theme/lavenderCanvas';
import titleCatalog from '../src/services/activity/titleCatalogV2.json';
import { parseTitleVaultV2 } from '../src/services/activity/titleVaultV2';
import {
  loadHomeTitleSelection,
  saveHomeTitleSelection,
} from '../src/services/activity/homeTitleSelection';

const mockNavigation = { goBack: jest.fn(), reset: jest.fn() };
let mockOwner = 'owner';
const mockPets = [
  { id: 'a', name: '첫째', avatarUrl: 'test://a' },
  { id: 'b', name: '이름이아주긴둘째반려동물', avatarUrl: null },
];
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/app/ui/MarkerText', () => 'MarkerText');
jest.mock('../src/components/pets/PetAvatar', () => 'PetAvatar');
jest.mock('../src/components/common/ConfirmDialog', () => 'ConfirmDialog');
jest.mock(
  '../src/components/common/PremiumNoticeModal',
  () => 'PremiumNoticeModal',
);
jest.mock('../src/store/authStore', () => ({
  useAuthStore: Object.assign(
    (select: (s: { session: { user: { id: string } } }) => unknown) =>
      select({ session: { user: { id: mockOwner } } }),
    { getState: () => ({ session: { user: { id: mockOwner } } }) },
  ),
}));
jest.mock('../src/store/petStore', () => ({
  usePetStore: (
    select: (s: { pets: typeof mockPets; selectedPetId: string }) => unknown,
  ) => select({ pets: mockPets, selectedPetId: 'a' }),
}));
jest.mock('../src/hooks/useEntryAwareBackAction', () => ({
  useEntryAwareBackAction: () => mockNavigation.goBack,
}));
jest.mock('../src/store/uiStore', () => ({ openMoreDrawer: jest.fn() }));
jest.mock('../src/services/query/appQueryClient', () => ({
  appQueryClient: { getQueryData: () => 0 },
}));
jest.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: 0 }) }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { entrySource: 'more' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
}));
jest.mock('../src/services/activity/activityDashboard', () => ({
  ...jest.requireActual('../src/services/activity/activityDashboard'),
  loadActivityDashboard: jest.fn(),
}));
jest.mock('../src/services/activity/homeTitleSelection', () => ({
  loadHomeTitleSelection: jest.fn(),
  saveHomeTitleSelection: jest.fn(),
}));

function fixture(): ActivityDashboardData {
  return buildActivityDashboard({
    pets: mockPets,
    levelSummary: {
      totalXp: 776,
      level: 5,
      currentLevelXp: 650,
      nextLevelXp: 1000,
      updatedAt: null,
    },
    titles: [
      {
        titleKey: 'comment_fairy',
        titleName: '댓글 요정',
        earnedAt: '2026-10-01',
        sourceType: 'test',
        petId: null,
      },
    ],
    ledgerRows: Array.from({ length: 9 }, (_, n) => ({
      id: `walk${n}`,
      petId: 'a',
      eventType: 'walk_record' as const,
      sourceType: 'test',
      sourceId: `w${n}`,
      xp: 20,
      activityDateKst: '2026-10-21',
      createdAt: '2026-10-21',
    })),
    streakByPetId: {
      a: {
        bestStreak: 2,
        currentStreak: 1,
        activityDateKst: '2026-10-21',
        todayCompleted: true,
      },
    },
    timelineCountsByPetId: {
      a: {
        ...createEmptyTimelineCategoryCounts(),
        all: 20,
        walk: 5,
        meal: 0,
        diary: 10,
        other: 5,
      },
    },
    healthRecordCountsByPetId: { a: 6 },
    communityPostCount: 7,
    commentCount: 11,
  });
}
async function render() {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(<Screen />);
  });
  return tree;
}
function host(tree: TestRenderer.ReactTestRenderer, id: string) {
  return (
    tree.root
      .findAll(n => n.props.testID === id)
      .find(n => typeof n.type === 'string') ??
    tree.root.findAll(n => n.props.testID === id)[0]
  );
}
async function press(tree: TestRenderer.ReactTestRenderer, id: string) {
  const control = tree.root
    .findAll(n => n.props.testID === id)
    .find(n => typeof n.props.onPress === 'function');
  if (!control) throw new Error(`Missing control ${id}`);
  await act(async () => control.props.onPress());
}
function titleDialog(tree: TestRenderer.ReactTestRenderer) {
  return tree.root.findAll(
    n =>
      typeof n.type === 'string' &&
      typeof n.props.title === 'string' &&
      n.props.title.endsWith('칭호로 바꿀까요?'),
  )[0];
}
async function confirmTitle(tree: TestRenderer.ReactTestRenderer) {
  await act(async () => titleDialog(tree).props.onConfirm());
}
function text(tree: TestRenderer.ReactTestRenderer) {
  // Serialize public host values, not ScrollView's React element props/fiber owners.
  return tree.root
    .findAll(n => typeof n.type === 'string')
    .map(n =>
      [
        n.props.testID,
        n.props.accessibilityLabel,
        ...n.children.filter(
          c => typeof c === 'string' || typeof c === 'number',
        ),
      ]
        .filter(v => v !== undefined)
        .join(''),
    )
    .join('\n');
}
function achievement(
  key: string,
  value: number,
  target: number,
): ActivityAchievement {
  return {
    key,
    name: 'test',
    domain: 'streak',
    scope: 'pet',
    ownerId: 'a',
    ownerLabel: 'test',
    currentValue: value,
    threshold: target,
    conditionLabel: 'test',
    achieved: false,
  };
}

describe('activity and title presentation', () => {
  it('shows approved category-specific goals without exposing unearned hidden titles', async () => {
    const entries = titleCatalog.entries.filter(item => !item.hidden);
    const rows = entries.flatMap(item => (item.scope === 'common' ? ['common'] : mockPets.map(p => p.id)).map(ownerId => ({
      key: item.id, name: item.name, domain: item.domain, scope: item.scope, ownerId,
      conditionLabel: item.conditionLabel, categoryKey: item.category, hidden: false,
      achieved: item.id === 'WK01', earnedAt: item.id === 'WK01' ? '2026-10-01T00:00:00Z' : null,
      currentValue: item.id === 'WK01' ? 1000 : 0, threshold: 1000, progressLabel: '0 / 3일', progressKnown: true, policyVersion: 2,
    })));
    const data = fixture();
    data.allAchievements = parseTitleVaultV2({ policyVersion: 2, catalogCount: 332, rows }, mockPets);
    for (const pet of data.petSummaries) pet.achievements = data.allAchievements.filter(item => item.ownerId === pet.petId);
    data.commonSummary.achievements = data.allAchievements.filter(item => item.scope === 'common');
    jest.mocked(loadActivityDashboard).mockResolvedValue(data);
    const tree = await render();
    await press(tree, 'activity-tab-vault');
    expect(host(tree, 'activity-earned-WK01')).toBeDefined();
    expect(text(tree)).not.toContain('activity-title-category-X');
    await press(tree, 'activity-title-category-GD');
    expect(text(tree)).toContain('GPS 평생 거리');
    expect(text(tree)).not.toContain('activity-earned-WK01');
    expect(text(tree)).toContain('작은 길의 시작');
    await act(async () => tree.unmount());
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockOwner = 'owner';
    jest.mocked(loadHomeTitleSelection).mockResolvedValue(null);
    jest.mocked(saveHomeTitleSelection).mockResolvedValue({
      titleKey: 'pet_first_health_record',
      titleName: '첫 건강 기록',
    });
    jest
      .spyOn(ReactNative, 'useWindowDimensions')
      .mockReturnValue({ width: 384, height: 832, scale: 2.8, fontScale: 1 });
    jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation((callback: (time: number) => void) => {
        callback(0);
        return 1;
      });
    jest.mocked(loadActivityDashboard).mockResolvedValue(fixture());
  });
  afterEach(() => jest.restoreAllMocks());
  it('uses account XP independently of selected pet and does not fetch on tab or pet changes', async () => {
    const tree = await render();
    expect(text(tree)).toContain('누적 ');
    expect(text(tree)).toContain('776');
    await press(tree, 'activity-pet-b');
    await press(tree, 'activity-tab-vault');
    await press(tree, 'activity-tab-summary');
    expect(host(tree, 'activity-pet-b').props.accessibilityState.selected).toBe(
      true,
    );
    expect(text(tree)).toContain('776');
    expect(loadActivityDashboard).toHaveBeenCalledTimes(1);
    await act(async () => tree.unmount());
  });
  it('applies the PO minus-3sp adjustment only through the screen styles', async () => {
    const tree = await render();
    expect(
      ReactNative.StyleSheet.flatten(
        host(tree, 'activity-user-level').props.style,
      ).fontSize,
    ).toBe(59);
    expect(
      ReactNative.StyleSheet.flatten(host(tree, 'activity-user-xp').props.style)
        .fontSize,
    ).toBe(8);
    const title = tree.root.findAll(
      n => typeof n.type === 'string' && n.children.includes('활동·칭호'),
    )[0];
    expect(ReactNative.StyleSheet.flatten(title.props.style).fontSize).toBe(17);
    await press(tree, 'activity-tab-vault');
    const name = tree.root.findAll(
      n => typeof n.type === 'string' && n.children.includes('첫 건강 기록'),
    )[0];
    expect(ReactNative.StyleSheet.flatten(name.props.style).fontSize).toBe(11);
    await act(async () => tree.unmount());
  });
  it('uses Home Bevel Glass with reflections for every card and centers common icon/value groups', async () => {
    const tree = await render();
    const fills = () =>
      tree.root.findAll(
        n =>
          typeof n.type === 'string' &&
          n.props.testID === 'home-reflective-fill',
      );
    expect(fills()).toHaveLength(6);
    expect(
      ReactNative.StyleSheet.flatten(fills()[0].props.style),
    ).toMatchObject({
      backgroundColor: 'rgba(255, 255, 255, 0.26)',
      borderColor: 'rgba(255, 255, 255, 0.78)',
    });
    for (const id of [
      'activity-common-message-circle',
      'activity-common-send',
    ]) {
      const control = host(tree, id);
      expect(
        ReactNative.StyleSheet.flatten(control.props.style).justifyContent,
      ).toBe('center');
    }
    expect(host(tree, 'activity-walk-brand').props.source).toBe(
      require('../src/assets/logo/logo_v2.png'),
    );
    expect(host(tree, 'activity-category-walk-brand').props.source).toBe(
      require('../src/assets/logo/logo_v2.png'),
    );
    await press(tree, 'activity-tab-vault');
    expect(fills()).toHaveLength(3);
    await act(async () => tree.unmount());
  });
  it('keeps the subtle page gradient behind both tabs without intercepting gestures', async () => {
    const tree = await render();
    const gradient = () => host(tree, 'activity-background-gradient');
    expect(gradient().props.colors).toEqual(LAVENDER_CANVAS.colors);
    expect(gradient().props.pointerEvents).toBe('none');
    expect(gradient().props.importantForAccessibility).toBe(
      'no-hide-descendants',
    );
    expect(
      ReactNative.StyleSheet.flatten(gradient().props.style),
    ).toMatchObject({
      position: 'absolute',
      top: 24,
      bottom: 0,
      left: 0,
      right: 0,
    });
    await press(tree, 'activity-tab-vault');
    expect(gradient().props.locations).toEqual([0, 0.58, 1]);
    await act(async () => tree.unmount());
  });
  it('shows the source-derived acquired count, explicit catalog art, and separate state layers', async () => {
    const data = fixture(),
      vault = getActivityVault(data, data.petSummaries[0]);
    expect(vault.acquired).toHaveLength(8);
    expect(new Set(vault.acquired.map(a => a.key)).size).toBe(8);
    expect(data.allAchievements.every(item => ACHIEVEMENT_ART[item.key])).toBe(
      true,
    );
    const tree = await render();
    await press(tree, 'activity-tab-vault');
    const ids = tree.root.findAll(
      n =>
        typeof n.type === 'string' &&
        n.props.testID?.startsWith('activity-earned-'),
    );
    expect(ids).toHaveLength(8);
    expect(text(tree)).toContain('도전 중 7개');
    await act(async () => tree.unmount());
  });
  it('selects an earned title for the viewed pet without changing the global pet or reloading XP', async () => {
    const tree = await render();
    await press(tree, 'activity-tab-vault');
    await press(tree, 'activity-earned-pet_first_health_record');
    expect(saveHomeTitleSelection).not.toHaveBeenCalled();
    expect(titleDialog(tree).props.title).toBe('첫 건강 기록 칭호로 바꿀까요?');
    expect(titleDialog(tree).props.message).toBe(
      '첫째의 홈 대표 칭호를 변경해요.',
    );
    expect(titleDialog(tree).props.message).not.toContain('선택한 칭호');
    await confirmTitle(tree);
    expect(saveHomeTitleSelection).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'owner',
        petId: 'a',
        achievementKey: 'pet_first_health_record',
      }),
    );
    expect(
      host(tree, 'activity-earned-pet_first_health_record').props
        .accessibilityState.selected,
    ).toBe(true);
    expect(loadActivityDashboard).toHaveBeenCalledTimes(1);
    expect(
      tree.root.findAll(
        n =>
          typeof n.type === 'string' &&
          n.props.testID === 'activity-earned-pet_routine_sprout',
      ),
    ).toHaveLength(0);
    await act(async () => tree.unmount());
  });
  it('retains the previous representative title and offers retry after storage failure', async () => {
    jest.mocked(loadHomeTitleSelection).mockResolvedValue({
      titleKey: 'pet_walk_sprout',
      titleName: '산책 새싹',
    });
    jest
      .mocked(saveHomeTitleSelection)
      .mockRejectedValueOnce(new Error('private disk detail'));
    const tree = await render();
    await press(tree, 'activity-tab-vault');
    await press(tree, 'activity-earned-pet_first_health_record');
    await confirmTitle(tree);
    expect(
      host(tree, 'activity-earned-pet_walk_sprout').props.accessibilityState
        .selected,
    ).toBe(true);
    expect(text(tree)).toContain('대표 칭호를 저장하지 못했어요');
    expect(text(tree)).not.toContain('private disk detail');
    await confirmTitle(tree);
    expect(
      host(tree, 'activity-earned-pet_first_health_record').props
        .accessibilityState.selected,
    ).toBe(true);
    await act(async () => tree.unmount());
  });
  it('blocks duplicate writes and does not apply an old pet result to the new pet', async () => {
    let finish!: (value: { titleKey: string; titleName: string }) => void;
    jest.mocked(saveHomeTitleSelection).mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      }),
    );
    const tree = await render();
    await press(tree, 'activity-tab-vault');
    await press(tree, 'activity-earned-pet_first_health_record');
    await act(async () => {
      const dialog = titleDialog(tree);
      dialog.props.onConfirm();
      dialog.props.onConfirm();
    });
    expect(saveHomeTitleSelection).toHaveBeenCalledTimes(1);
    await press(tree, 'activity-pet-picker');
    await press(tree, 'activity-pick-b');
    await act(async () =>
      finish({
        titleKey: 'pet_first_health_record',
        titleName: '첫 건강 기록',
      }),
    );
    expect(
      tree.root.findAll(
        n =>
          typeof n.type === 'string' &&
          n.props.testID === 'activity-earned-pet_first_health_record',
      ),
    ).toHaveLength(0);
    await act(async () => tree.unmount());
  });
  it('cancels without changing the title and rejects a stale confirmation after switching pets', async () => {
    const tree = await render();
    await press(tree, 'activity-tab-vault');
    await press(tree, 'activity-earned-pet_first_health_record');
    const staleConfirm = titleDialog(tree).props.onConfirm;
    await act(async () => titleDialog(tree).props.onCancel());
    expect(titleDialog(tree)).toBeUndefined();
    expect(saveHomeTitleSelection).not.toHaveBeenCalled();
    await press(tree, 'activity-pet-picker');
    await press(tree, 'activity-pick-b');
    await act(async () => staleConfirm());
    expect(saveHomeTitleSelection).not.toHaveBeenCalled();
    await act(async () => tree.unmount());
  });
  it('highlights only the selected title name in the custom confirmation heading', async () => {
    const tree = await render();
    await press(tree, 'activity-tab-vault');
    await press(tree, 'activity-earned-pet_first_health_record');
    let heading!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      heading = TestRenderer.create(titleDialog(tree).props.titleContent);
    });
    const marker = host(heading, 'activity-title-confirm-marker');
    expect(marker.props.children).toBe('첫 건강 기록');
    expect(marker.props.variant).toBe('wash');
    expect(marker.props.markerColor).toBe('#DED0F4');
    expect(text(heading)).toContain('칭호로 바꿀까요?');
    await act(async () => {
      heading.unmount();
      tree.unmount();
    });
  });
  it('deduplicates common titles, excludes another pet, and preserves original objects', () => {
    const data = fixture(),
      saved = JSON.stringify(data);
    const duplicate = data.commonSummary.achievements[0];
    data.commonSummary.achievements.push(duplicate);
    const vault = getActivityVault(data, data.petSummaries[1]);
    expect(vault.acquired.map(a => a.key)).toEqual([
      'common_first_hello_done',
      'common_kind_commenter',
    ]);
    data.commonSummary.achievements.pop();
    expect(JSON.stringify(data)).toBe(saved);
  });
  it('uses current streak for unfinished progress and keeps historical acquisition', () => {
    const data = fixture();
    data.petSummaries[0].streak!.currentStreak = 1;
    const vault = getActivityVault(data, data.petSummaries[0]);
    expect(
      vault.challenges.find(a => a.key === 'pet_routine_sprout')?.currentValue,
    ).toBe(1);
    data.petSummaries[0].achievements.find(
      a => a.key === 'pet_routine_sprout',
    )!.achieved = true;
    expect(
      getActivityVault(data, data.petSummaries[0]).acquired.some(
        a => a.key === 'pet_routine_sprout',
      ),
    ).toBe(true);
  });
  it.each([3, 7])(
    'represents a %i-day target with that exact number of segments',
    async target => {
      const data = fixture();
      data.petSummaries[0].streak!.currentStreak = 2;
      jest.mocked(loadActivityDashboard).mockResolvedValue(data);
      const tree = await render();
      await press(tree, 'activity-tab-vault');
      const key = target === 3 ? 'pet_routine_sprout' : 'pet_steady_walker';
      const segments = tree.root.findAll(
        n =>
          typeof n.type === 'string' &&
          n.props.testID?.startsWith(`activity-segment-${key}-`),
      );
      expect(segments).toHaveLength(target);
      expect(getChallengeProgress(achievement(key, 2, target))).toMatchObject({
        current: 2,
        target,
        ratio: 2 / target,
        segmented: true,
      });
      await act(async () => tree.unmount());
    },
  );
  it('does not count streak bonus XP as a walk or health rows as timeline categories', () => {
    const data = fixture(),
      pet = data.petSummaries[0];
    pet.walk.eventCount = 12;
    expect(getWalkActivityCount(pet)).toBe(9);
    expect(pet.timelineCategoryCounts.all).toBe(20);
    expect(
      ['walk', 'meal', 'diary', 'other'].reduce(
        (n, k) => n + pet.timelineCategoryCounts[k as 'walk'],
        0,
      ),
    ).toBe(20);
    expect(pet.health.recordCount).toBe(6);
  });
  it('retains tab and local pet after refresh, picker changes never alter the global selection', async () => {
    const tree = await render();
    await press(tree, 'activity-tab-vault');
    await press(tree, 'activity-pet-picker');
    await press(tree, 'activity-pick-b');
    expect(text(tree)).toContain(mockPets[1].name);
    const refresh = tree.root.findAll(
      n => n.props.onRefresh && n.props.tintColor,
    )[0];
    await act(async () => refresh.props.onRefresh());
    expect(
      host(tree, 'activity-tab-vault').props.accessibilityState.selected,
    ).toBe(true);
    await press(tree, 'activity-tab-summary');
    expect(host(tree, 'activity-pet-b').props.accessibilityState.selected).toBe(
      true,
    );
    expect(loadActivityDashboard).toHaveBeenLastCalledWith(
      mockPets.map(p => ({ id: p.id, name: p.name, themeColor: null })),
    );
    await act(async () => tree.unmount());
  });
  it('loading is not zero, failure offers retry without leaking server errors', async () => {
    jest
      .mocked(loadActivityDashboard)
      .mockRejectedValue(new Error('private server SQL'));
    const tree = await render();
    expect(host(tree, 'activity-error')).toBeDefined();
    expect(text(tree)).not.toContain('private server SQL');
    expect(text(tree)).not.toContain('activity-user-xp');
    jest.mocked(loadActivityDashboard).mockResolvedValue(fixture());
    await press(tree, 'activity-retry');
    expect(host(tree, 'activity-user-xp')).toBeDefined();
    await act(async () => tree.unmount());
  });
  it('ignores stale owner responses and never displays the previous account snapshot', async () => {
    let resolve!: (value: ActivityDashboardData) => void;
    jest.mocked(loadActivityDashboard).mockImplementationOnce(
      () =>
        new Promise(r => {
          resolve = r;
        }),
    );
    const tree = await render();
    expect(host(tree, 'activity-loading')).toBeDefined();
    mockOwner = 'other-owner';
    await act(async () => tree.update(<Screen />));
    const stale = fixture();
    stale.levelSummary.totalXp = 999999;
    await act(async () => resolve(stale));
    expect(text(tree)).not.toContain('999,999');
    await act(async () => tree.unmount());
  });
  it('empty pets and empty awards stay distinct from fetch errors', async () => {
    const data = fixture();
    data.petSummaries = [];
    data.commonSummary.achievements = [];
    jest.mocked(loadActivityDashboard).mockResolvedValue(data);
    const tree = await render();
    expect(text(tree)).toContain('등록한 아이가 없어요');
    await press(tree, 'activity-tab-vault');
    expect(host(tree, 'activity-vault-empty')).toBeDefined();
    expect(text(tree)).not.toContain('activity-error');
    await act(async () => tree.unmount());
  });
  it.each([320, 360, 393, 412, 430])(
    'keeps bounded layout, real art, and scrollability at %idp (renderer, not native QA)',
    async width => {
      jest
        .spyOn(ReactNative, 'useWindowDimensions')
        .mockReturnValue({ width, height: 568, scale: 2, fontScale: 1 });
      const layout = getActivityLayout(width, 1);
      expect(width - layout.inset * 2).toBeGreaterThan(280);
      const tree = await render();
      expect(host(tree, 'activity-scroll')).toBeDefined();
      await press(tree, 'activity-tab-vault');
      const cell = host(tree, 'activity-earned-pet_first_health_record');
      expect(ReactNative.StyleSheet.flatten(cell.props.style).width).toBe(
        `${100 / layout.columns}%`,
      );
      await act(async () => tree.unmount());
    },
  );
  it.each([1.3, 2])(
    'allows font scaling %f with stacked challenge content and fewer grid columns',
    async fontScale => {
      jest
        .spyOn(ReactNative, 'useWindowDimensions')
        .mockReturnValue({ width: 384, height: 832, scale: 2.8, fontScale });
      expect(getActivityLayout(384, fontScale)).toMatchObject({
        stack: true,
        columns: 3,
      });
      const tree = await render();
      await press(tree, 'activity-tab-vault');
      expect(text(tree)).not.toContain('allowFontScaling":false');
      expect(text(tree)).not.toContain('fontSize":0');
      await act(async () => tree.unmount());
    },
  );
});
