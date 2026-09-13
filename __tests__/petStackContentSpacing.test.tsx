import React from 'react';
import { FlatList, ScrollView, StyleSheet } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import PetActivityAchievementsScreen from '../src/screens/Pets/PetActivityAchievementsScreen';
import PetManagementScreen from '../src/screens/Pets/PetManagementScreen';
import type { ActivityDashboardData } from '../src/services/activity/activityDashboard';
import { loadActivityDashboard } from '../src/services/activity/activityDashboard';
import { usePetStore } from '../src/store/petStore';

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  reset: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { entrySource: 'more' } }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const ReactRuntime = jest.requireActual('react') as typeof React;
    ReactRuntime.useEffect(callback, [callback]);
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 24, bottom: 18, left: 0, right: 0 }),
}));
jest.mock('../src/services/activity/activityDashboard', () => ({
  ...jest.requireActual('../src/services/activity/activityDashboard'),
  loadActivityDashboard: jest.fn(),
}));

const dashboard: ActivityDashboardData = {
  levelSummary: {
    totalXp: 214,
    level: 2,
    currentLevelXp: 114,
    nextLevelXp: 250,
    updatedAt: null,
  },
  levelProgress: 0.76,
  maxLevel: 30,
  representativeTitle: '첫 인사 완료',
  earnedTitles: [],
  petSummaries: [
    {
      petId: 'pet-1',
      petName: '누리',
      themeColor: null,
      xp: 214,
      ledgerEventCount: 2,
      walk: { eventCount: 1, xp: 10 },
      timeline: { eventCount: 1, xp: 10 },
      health: { eventCount: 0, xp: 0, recordCount: 0 },
      streak: null,
      timelineCategoryCounts: {
        all: 1,
        walk: 1,
        meal: 0,
        health: 0,
        diary: 0,
        other: 0,
      },
      achievements: [],
    },
  ],
  commonSummary: {
    xp: 0,
    ledgerEventCount: 0,
    communityPosts: { eventCount: 0, xp: 0, postCount: 0 },
    comments: { eventCount: 0, xp: 0, commentCount: 0 },
    achievements: [],
  },
  allAchievements: [
    {
      key: 'walk-streak-3',
      name: '루틴 새싹',
      domain: 'streak',
      scope: 'pet',
      ownerId: 'pet-1',
      ownerLabel: '누리',
      conditionLabel: '3일 연속 산책',
      currentValue: 1,
      threshold: 3,
      achieved: false,
    },
  ],
  ledgerLimitReached: false,
};

describe('pet stack content-end spacing', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  const originalPets = usePetStore.getState();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(loadActivityDashboard).mockResolvedValue(dashboard);
    usePetStore.setState({
      pets: [
        { id: 'pet-1', name: '누리' },
        { id: 'pet-2', name: 'KakaoPet' },
      ],
      selectedPetId: 'pet-1',
    });
  });

  afterEach(() => {
    if (renderer) {
      TestRenderer.act(() => renderer?.unmount());
    }
    renderer = undefined;
    usePetStore.setState(originalPets);
  });

  it('keeps the final achievement and uses only safe-area breathing room', async () => {
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <PetActivityAchievementsScreen />
        </ThemeProvider>,
      );
    });
    if (!renderer) throw new Error('PetActivityAchievementsScreen did not mount');

    const contentScroll = renderer.root.findAllByType(ScrollView).find(
      node => node.props.horizontal !== true && node.props.refreshControl,
    );
    expect(contentScroll).toBeDefined();
    expect(StyleSheet.flatten(contentScroll?.props.contentContainerStyle)).toEqual(
      expect.objectContaining({ paddingBottom: 42 }),
    );
    expect(
      renderer.root.findAll(node => node.props.children === '루틴 새싹'),
    ).not.toHaveLength(0);
  });

  it('keeps every pet and the add action without reserving a future viewport', () => {
    TestRenderer.act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <PetManagementScreen />
        </ThemeProvider>,
      );
    });
    if (!renderer) throw new Error('PetManagementScreen did not mount');

    const list = renderer.root.findByType(FlatList);
    expect(StyleSheet.flatten(list.props.contentContainerStyle)).toEqual(
      expect.objectContaining({ paddingBottom: 42 }),
    );
    expect(renderer.root.findAll(node => node.props.children === '누리')).not.toHaveLength(0);
    expect(renderer.root.findAll(node => node.props.children === 'KakaoPet')).not.toHaveLength(0);
    expect(
      renderer.root.findAll(node => node.props.children === '+ 아이 등록하기'),
    ).not.toHaveLength(0);
  });
});
