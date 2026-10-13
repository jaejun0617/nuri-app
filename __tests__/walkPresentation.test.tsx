import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Button, Dimensions, Image, Modal } from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import Panel from '../src/screens/DevTest/WalkDistanceQaPanel';
import { createTheme } from '../src/app/theme/theme';
import { SEASON_CTA } from '../src/app/theme/ctaPalette';
import {
  getWalkSnapshot,
  mutateNativeWalk,
  observeNativeWalk,
  type WalkNativeSnapshot,
} from '../src/services/walk/runtime/nativeWalk';
import {
  getWalkRoutePage,
  runWalkQaCommand,
  type WalkRoutePage,
} from '../src/services/walk/runtime/distanceProjection';
import { PUBLIC_ROUTE } from '../src/screens/DevTest/walkPresentation/fixtures';
import {
  GALLERY_STATES,
  WALK_COPY,
  presentationState,
  metricDistance,
  metricTime,
} from '../src/screens/DevTest/walkPresentation/model';
import { PetPosition } from '../src/screens/DevTest/walkPresentation/WalkMapStage';
let mockPetName = '누리';

jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/components/icons/NuriFeatherIcon', () => 'Feather');
jest.mock('../src/components/icons/NuriSemanticIcon', () => 'SemanticIcon');
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => 'autumn',
}));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (select: (state: unknown) => unknown) =>
    select({ session: { user: { id: 'public-owner' } } }),
}));
jest.mock('../src/store/petStore', () => ({
  usePetStore: Object.assign(
    (select: (state: unknown) => unknown) =>
      select({
        pets: [{ id: 'public-pet', name: mockPetName, avatarUrl: null }],
        selectedPetId: 'public-pet',
      }),
    { getState: () => ({ selectedPetId: 'public-pet' }) },
  ),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
}));
jest.mock('react-native-maps', () => ({
  __esModule: true,
  default: 'MapView',
  Marker: 'Marker',
  Polyline: 'Polyline',
  PROVIDER_GOOGLE: 'google',
}));
jest.mock('../src/services/walk/runtime/nativeWalk', () => ({
  createWalkCommandId: jest.fn(async () => 'public-command'),
  getWalkSnapshot: jest.fn(async () => null),
  mutateNativeWalk: jest.fn(),
  observeNativeWalk: jest.fn(() => jest.fn()),
}));
jest.mock('../src/services/walk/runtime/distanceProjection', () => ({
  ...jest.requireActual('../src/services/walk/runtime/distanceProjection'),
  isWalkDistanceQaEnabled: jest.fn(() => true),
  noteWalkQaMapVisible: jest.fn(),
  getWalkRoutePage: jest.fn(),
  runWalkQaCommand: jest.fn(async () => null),
}));

const host = (r: Renderer.ReactTestRenderer, name: string) =>
  r.root.findAll(n => (n.type as unknown) === name);
const nativeSnapshot = (
  state: WalkNativeSnapshot['runtimeState'] = 'WALKING',
): WalkNativeSnapshot => ({
  sessionId: 'public-session',
  petId: 'public-pet',
  runtimeState: state,
  revision: '1',
  startedAt: '2026-10-14T00:00:00.000Z',
  elapsedActiveMs: '1000',
  elapsedPausedMs: '0',
  fixCount: '1',
  encryptedChunkCount: '1',
  segmentCount: '1',
  lastFixAgeMs: '0',
  serviceRunning: state === 'WALKING',
  subscriptionActive: state === 'WALKING',
  recoverable: state === 'RECOVERY_REQUIRED',
  locationAvailable: true,
  permissionState: 'PRECISE_GRANTED',
  notificationPermissionState: 'GRANTED',
  distanceStatus: 'LOCAL_CANDIDATE',
  syncState: state === 'FINISHED_LOCAL' ? 'SYNC_PENDING' : null,
  lastErrorCode: null,
  distanceSummary: {
    algorithmVersion: 1,
    policyVersion: 1,
    measuredDistanceM: '10',
    acceptedDistanceM: '9',
    routeRevision: '1',
    gpsSignal: 'GPS_READY',
    recommendation: 'INELIGIBLE_CANDIDATE',
    quality: {
      schemaVersion: 1,
      totalFixCount: 1,
      acceptedFixCount: 1,
      rejectedAccuracyCount: 0,
      rejectedTimestampCount: 0,
      rejectedDuplicateCount: 0,
      rejectedJumpCount: 0,
      rejectedSpeedCount: 0,
      stationarySuppressedCount: 0,
      segmentCount: 1,
      gpsGapDurationMs: '0',
      maxGapDurationMs: '0',
      mockLocationObserved: false,
    },
  },
});
const routePage: WalkRoutePage = {
  routeRevision: '1',
  filteredPointCount: '4',
  startCursor: '0',
  endCursor: '3',
  hasEarlier: false,
  hasLater: false,
  current: PUBLIC_ROUTE[0],
  segments: [
    { segmentId: '1', points: PUBLIC_ROUTE.slice(0, 2) },
    { segmentId: '2', points: PUBLIC_ROUTE.slice(2) },
  ],
};
const press = async (r: Renderer.ReactTestRenderer, id: string) => {
  await act(async () => {
    await r.root.findAllByProps({ testID: id })[0].props.onPress();
  });
};
const visibleText = (r: Renderer.ReactTestRenderer) =>
  host(r, 'AppText')
    .map(n => n.props.children)
    .flat()
    .filter(v => typeof v === 'string')
    .join(' ');
describe('Walk presentation privacy and mode boundaries', () => {
  let r: Renderer.ReactTestRenderer;
  beforeEach(() => {
    jest.clearAllMocks();
    mockPetName = '누리';
    jest.mocked(getWalkSnapshot).mockResolvedValue(null);
    jest.mocked(getWalkRoutePage).mockResolvedValue(routePage);
    jest.mocked(runWalkQaCommand).mockResolvedValue(null);
  });
  afterEach(async () => {
    if (r) await act(async () => r.unmount());
  });
  const open = async () => {
    await act(async () => {
      r = Renderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <Panel />
        </ThemeProvider>,
      );
    });
    await act(async () => {
      r.root.findAllByType(Button)[0].props.onPress();
    });
  };
  test('technical JSON is absent while diagnostics are collapsed', async () => {
    await open();
    expect(r.root.findAllByProps({ testID: 'walk-map-receipt' })).toHaveLength(
      0,
    );
    expect(
      r.root.findAllByProps({ testID: 'walk-distance-receipt' }),
    ).toHaveLength(0);
    expect(
      r.root.findAllByProps({ testID: 'walk-wizard-receipt' }),
    ).toHaveLength(0);
  });
  test('public preview uses a child pet marker rather than the default Google red pin', async () => {
    await open();
    const marker = host(r, 'Marker')[0];
    expect(marker.props.children).toBeTruthy();
    expect(marker.props.title).not.toBe('PUBLIC_SYNTHETIC');
  });
  test('actual mode without a filtered fix has no synthetic camera or marker', async () => {
    await open();
    await press(r, 'walk-mode-actual');
    expect(host(r, 'Marker')).toHaveLength(0);
    expect(host(r, 'MapView')).toHaveLength(0);
  });
  test('actual filtered fix owns the first camera and only actual marker; gaps remain separate', async () => {
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot());
    await open();
    await press(r, 'walk-mode-actual');
    expect(host(r, 'MapView')[0].props.initialRegion).toMatchObject(
      PUBLIC_ROUTE[0],
    );
    expect(
      host(r, 'Marker').some(n => n.props.testID === 'walk-fixture-marker'),
    ).toBe(false);
    expect(
      host(r, 'Marker').some(n => n.props.testID === 'walk-actual-marker'),
    ).toBe(true);
    expect(host(r, 'Polyline')).toHaveLength(4);
    expect(host(r, 'Polyline')[0].props.coordinates).toHaveLength(2);
  });
  test('preview never fetches private routes or mutates native runtime', async () => {
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot());
    await open();
    await press(r, 'walk-primary');
    await press(r, 'walk-primary');
    expect(getWalkRoutePage).not.toHaveBeenCalled();
    expect(mutateNativeWalk).not.toHaveBeenCalled();
    expect(runWalkQaCommand).not.toHaveBeenCalledWith('START_STEP');
  });
  test.each(GALLERY_STATES)(
    'public gallery has the correct state copy: %s',
    async state => {
      await open();
      await press(r, 'walk-qa-open');
      await press(r, `walk-gallery-${state}`);
      expect(visibleText(r)).toContain(
        state === 'WALKING' ? '누리와 걷는 중' : WALK_COPY[state].title,
      );
      expect(
        host(r, 'AppText').some(n => n.props.children === '합성 미리보기'),
      ).toBe(true);
    },
  );
  test.each(['spring', 'summer', 'autumn', 'winter'] as const)(
    '%s uses exact Timeline CTA color without changing map geometry',
    async season => {
      await open();
      const before = host(r, 'MapView')[0].props.initialRegion;
      await press(r, 'walk-qa-open');
      await press(r, `walk-season-${season}`);
      expect(host(r, 'Polyline')[1].props.strokeColor).toBe(
        SEASON_CTA[season].primary,
      );
      expect(host(r, 'MapView')[0].props.initialRegion).toEqual(before);
    },
  );
  test('finish requires confirmation; fixture result makes no lifetime, reward, server or memory claim', async () => {
    await open();
    await press(r, 'walk-finish');
    expect(visibleText(r)).toContain('산책을 마칠까요?');
    expect(mutateNativeWalk).not.toHaveBeenCalled();
    await press(r, 'walk-finish-cancel');
    await press(r, 'walk-finish');
    await press(r, 'walk-finish-confirm');
    expect(visibleText(r)).toContain('기기에 안전하게 저장');
    expect(visibleText(r)).not.toMatch(
      /Lifetime|Walk Lv|XP|경험치|서버 저장|기록 생성/,
    );
  });
  test('future CTA is disabled and does not create memories or trigger navigation', async () => {
    await open();
    await press(r, 'walk-qa-open');
    await press(r, 'walk-gallery-FUTURE_RECORD_CTA_PREVIEW');
    const labels = r.root.findAll(
      n =>
        n.props.accessibilityRole === 'button' &&
        n.props.accessibilityLabel === '산책 기록으로 남기기',
    );
    expect(labels.length).toBeGreaterThan(0);
    expect(labels[0].props.disabled).toBe(true);
    expect(mutateNativeWalk).not.toHaveBeenCalled();
  });
  test('recovery resume uses only an explicit user action', async () => {
    jest
      .mocked(getWalkSnapshot)
      .mockResolvedValue(nativeSnapshot('RECOVERY_REQUIRED'));
    jest.mocked(mutateNativeWalk).mockResolvedValue(nativeSnapshot());
    await open();
    await press(r, 'walk-mode-actual');
    expect(mutateNativeWalk).not.toHaveBeenCalled();
    await press(r, 'walk-primary');
    expect(mutateNativeWalk).toHaveBeenCalledWith(
      'resumeRecoveredWalk',
      expect.any(Object),
      'public-command',
    );
  });
  test('back/minimize cannot finish a real active session', async () => {
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot());
    await open();
    await press(r, 'walk-mode-actual');
    await press(r, 'walk-close');
    expect(visibleText(r)).toContain('화면을 닫아도 산책은 계속 기록돼요.');
    await press(r, 'walk-minimize-confirm');
    expect(r.root.findByType(Modal).props.visible).toBe(false);
    expect(mutateNativeWalk).not.toHaveBeenCalled();
  });
  test('new session with no fix clears the old map immediately', async () => {
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot());
    await open();
    await press(r, 'walk-mode-actual');
    const receive = jest.mocked(observeNativeWalk).mock.calls.at(-1)![0];
    await act(async () => {
      receive({
        ...nativeSnapshot(),
        sessionId: 'second-public-session',
        distanceSummary: null,
      });
    });
    expect(host(r, 'MapView')).toHaveLength(0);
    expect(host(r, 'Marker')).toHaveLength(0);
  });
  test('safe inspector contains no coordinate, raw identity or whole JSON', async () => {
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot());
    await open();
    await press(r, 'walk-mode-actual');
    await press(r, 'walk-qa-open');
    expect(host(r, 'MapView')).toHaveLength(0);
    expect(visibleText(r)).not.toMatch(
      /latitude|longitude|public-owner|public-session|public-pet|\{\s*"/,
    );
  });
  test('formatting and weak/lost states do not invent distance', () => {
    expect(metricDistance(null)).toBe('—');
    expect(metricDistance('2430')).toBe('2.43');
    expect(metricTime('1920000')).toBe('32:00');
    const s = nativeSnapshot();
    expect(presentationState(s, false)).toBe('GPS_ACQUIRING');
    expect(
      presentationState(
        {
          ...s,
          distanceSummary: { ...s.distanceSummary!, gpsSignal: 'GPS_WEAK' },
        },
        true,
      ),
    ).toBe('GPS_WEAK');
    expect(
      presentationState(
        {
          ...s,
          distanceSummary: { ...s.distanceSummary!, gpsSignal: 'GPS_LOST' },
        },
        true,
      ),
    ).toBe('GPS_LOST');
  });
  test('round pet photo and failed image use paw without a location-radius circle', async () => {
    await act(async () => {
      r = Renderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <PetPosition
            accent={SEASON_CTA.spring.primary}
            image="https://example.invalid/public-pet.png"
          />
        </ThemeProvider>,
      );
    });
    const image = r.root.findByType(Image);
    expect(image.props.style.borderRadius).toBe(24);
    await act(async () => image.props.onError());
    expect(r.root.findAllByType(Image)).toHaveLength(0);
    expect(host(r, 'SemanticIcon')[0].props.name).toBe('paw');
  });
  test('fontScale 1.3 stacks controls and long pet name remains bounded with accessible controls', async () => {
    const previousWindow = Dimensions.get('window'),
      previousScreen = Dimensions.get('screen');
    try {
      Dimensions.set({
        window: { width: 360, height: 780, scale: 3, fontScale: 1.3 },
        screen: { width: 360, height: 780, scale: 3, fontScale: 1.3 },
      });
      mockPetName = '우리집에서가장사랑스러운누리의아주긴이름';
      jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot());
      await open();
      await press(r, 'walk-mode-actual');
      const name = host(r, 'AppText').find(
        n => n.props.children === mockPetName,
      )!;
      expect(name.props.numberOfLines).toBe(2);
      const control = r.root.findAll(
        n =>
          n.props.testID === 'walk-primary' &&
          n.props.accessibilityRole === 'button',
      )[0];
      expect(control.props.accessibilityRole).toBe('button');
      expect(control.props.accessibilityLabel).toBe('잠시 쉬기');
      expect(
        r.root.findAll(
          n =>
            Array.isArray(n.props.style) &&
            n.props.style.some(
              (s: { flexDirection?: string } | null) =>
                s?.flexDirection === 'column',
            ),
        ).length,
      ).toBeGreaterThan(0);
    } finally {
      await act(async () =>
        Dimensions.set({ window: previousWindow, screen: previousScreen }),
      );
    }
  });
});
