import React from 'react';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import fs from 'node:fs';
import path from 'node:path';
import HomeScreen from '../src/screens/Home/HomeScreen';
import {
  getSeasonalSplashVisual,
  getSplashArtworkSize,
  SPLASH_ARTWORK_ASPECT_RATIO,
  SPLASH_TAGLINE,
} from '../src/theme/seasonal/assets';
import type { SeasonKey } from '../src/theme/seasonal/season';
import type { CommunityRouteStateSnapshot } from '../src/navigation/communityRouteState';
import { DEFAULT_COMMUNITY_PAGE_SIZE } from '../src/types/community';

let mockSeason: SeasonKey = 'autumn';
const mockAuth = {
  booted: true,
  isLoggedIn: false,
  session: null as { user: { id: string } } | null,
  profile: { nickname: null as string | null },
  profileSyncStatus: 'ready' as const,
  passwordRecoveryFlow: { status: 'inactive' as const, startedAt: null },
  accountDeletionGate: null,
};
const mockPets = {
  booted: true,
  pets: [] as { id: string; name: string }[],
  errorMessage: null,
};
const mockNavigation = { reset: jest.fn() };
const mockRestore = jest.fn();
const mockCommunity = { restoreListSnapshot: mockRestore };
const mockLoad = jest.fn<Promise<CommunityRouteStateSnapshot | null>, []>();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
}));
jest.mock('../src/screens/Home/HomeScreen.styles', () => ({
  Background: 'View',
}));
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => mockSeason,
}));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (selector: (state: typeof mockAuth) => unknown) =>
    selector(mockAuth),
}));
jest.mock('../src/store/petStore', () => ({
  usePetStore: (selector: (state: typeof mockPets) => unknown) =>
    selector(mockPets),
}));
jest.mock('../src/store/communityStore', () => ({
  useCommunityStore: (selector: (state: typeof mockCommunity) => unknown) =>
    selector(mockCommunity),
}));
jest.mock('../src/navigation/communityRouteState', () => ({
  loadCommunityRouteStateSnapshot: () => mockLoad(),
}));

describe('seasonal splash presentation and boot preservation', () => {
  let renderer: TestRenderer.ReactTestRenderer;
  const render = async () => {
    await act(async () => {
      renderer = TestRenderer.create(<HomeScreen />);
    });
  };
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockLoad.mockResolvedValue(null);
    mockAuth.booted = true;
    mockAuth.isLoggedIn = false;
    mockAuth.session = null;
    mockAuth.profile.nickname = null;
    mockPets.booted = true;
    mockPets.pets = [];
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
  });
  afterEach(async () => {
    if (renderer) await act(async () => renderer.unmount());
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each(['autumn', 'winter', 'spring', 'summer'] as const)(
    'uses the %s heart artwork, uncropped with accessible copy and no second logo',
    async season => {
      mockSeason = season;
      await render();
      const image = renderer.root.findByType(Animated.Image);
      expect(image.props.source).toBe(getSeasonalSplashVisual(season).source);
      expect(image.props.resizeMode).toBe('contain');
      expect(image.props.accessibilityRole).toBe('image');
      expect(image.props.accessibilityLabel).toContain(SPLASH_TAGLINE);
      expect(image.props.accessible).toBe(true);
      const style = StyleSheet.flatten(image.props.style);
      expect(style.width / style.height).toBeCloseTo(
        SPLASH_ARTWORK_ASPECT_RATIO,
      );
      expect(style.marginBottom).toBe(24);
      expect(style.transform).toBeUndefined();
      expect(JSON.stringify(renderer.toJSON())).not.toContain(
        '우리만의 노닥 공간',
      );
      expect(JSON.stringify(renderer.toJSON())).not.toContain('NURI');
    },
  );

  it.each([
    [360, 640],
    [384, 784],
    [430, 884],
    [800, 360],
  ])('keeps the complete image within a %dx%d viewport', (width, height) => {
    const size = getSplashArtworkSize(width, height - 48);
    expect(size.width).toBeLessThanOrEqual(width);
    expect(size.height).toBeLessThanOrEqual(height - 48);
    expect(size.width / size.height).toBeCloseTo(SPLASH_ARTWORK_ASPECT_RATIO);
  });

  it('ships four equal-sized local bitmaps and copy distinct from login', () => {
    for (const season of ['autumn', 'winter', 'spring', 'summer']) {
      const png = fs.readFileSync(
        path.join(
          process.cwd(),
          `src/assets/seasonal/splash/heart/${season}.png`,
        ),
      );
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([941, 1672]);
    }
    expect(SPLASH_TAGLINE).toBe('너와 함께, 모든 계절');
    expect(SPLASH_TAGLINE).not.toBe('함께한 순간을, 오래도록');
  });

  it('retains the minimum two-second hold and exactly one guest reset', async () => {
    await render();
    await act(async () => {
      jest.advanceTimersByTime(1999);
    });
    expect(mockNavigation.reset).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(mockNavigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'SignIn', params: undefined }],
    });
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(mockNavigation.reset).toHaveBeenCalledTimes(1);
  });

  it('waits for auth and pet bootstrap before navigation', async () => {
    mockPets.booted = false;
    await render();
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockNavigation.reset).not.toHaveBeenCalled();
    expect(mockLoad).not.toHaveBeenCalled();
    mockPets.booted = true;
    await act(async () => renderer.update(<HomeScreen />));
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(mockNavigation.reset).toHaveBeenCalledTimes(1);
  });

  it('cleans up pending navigation on unmount', async () => {
    await render();
    await act(async () => renderer.unmount());
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(mockNavigation.reset).not.toHaveBeenCalled();
  });

  it('restores the selected community comment without a route change', async () => {
    mockAuth.isLoggedIn = true;
    mockAuth.session = { user: { id: 'fixture' } };
    mockAuth.profile.nickname = 'fixture';
    mockPets.pets = [{ id: 'pet', name: 'fixture' }];
    const snapshot: CommunityRouteStateSnapshot = {
      version: 1,
      schema: 'nuri.community-route.v1',
      userId: 'fixture',
      savedAt: Date.now(),
      route: { name: 'comments', postId: 'post', commentId: 'comment' },
      list: {
        activeFilter: 'all',
        activeCategory: 'all',
        pageSize: DEFAULT_COMMUNITY_PAGE_SIZE,
        currentPage: 1,
        cursor: null,
        hasMore: false,
        hasNextPage: false,
        hasPreviousPage: false,
        cursorHistory: { 1: null },
      },
    };
    mockLoad.mockResolvedValue(snapshot);
    await render();
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(mockRestore).toHaveBeenCalledWith(snapshot.list);
    expect(mockNavigation.reset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: 'AppTabs', params: { screen: 'CommunityTab' } },
        {
          name: 'CommunityComments',
          params: {
            postId: 'post',
            commentId: 'comment',
            restoredFromRouteSnapshot: true,
          },
        },
      ],
    });
  });
});
