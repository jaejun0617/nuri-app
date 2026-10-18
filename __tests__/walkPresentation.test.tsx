import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Button,
  Dimensions,
  Image,
  Linking,
  Modal,
  PermissionsAndroid,
} from 'react-native';
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
  isWalkDistanceQaEnabled,
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
import WalkView from '../src/screens/DevTest/walkPresentation/WalkView';
import WalkNoticeSheet from '../src/screens/DevTest/walkPresentation/WalkNoticeSheet';
import { WALK_NOTICE_COPY } from '../src/screens/DevTest/walkPresentation/noticeModel';
import Geolocation from '@react-native-community/geolocation';
import { getLocationPermissionGrant } from '../src/services/location/permission';
let mockPetName = '누리';
let mockAvatarUrl: string | null = null;

jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  __esModule: true,
  default: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
}));
jest.mock('../src/services/location/permission', () => ({
  getLocationPermissionGrant: jest.fn(async () => ({
    status: 'granted',
    accuracy: 'precise',
  })),
}));
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
        pets: [
          { id: 'public-pet', name: mockPetName, avatarUrl: mockAvatarUrl },
        ],
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
  if (
    id === 'walk-mode-actual' &&
    r.root.findAllByProps({ testID: id }).length === 0
  ) {
    await act(async () =>
      r.root.findAllByProps({ testID: 'walk-qa-open' })[0].props.onPress(),
    );
  }
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
    mockAvatarUrl = null;
    jest.mocked(getWalkSnapshot).mockResolvedValue(null);
    jest.mocked(getWalkRoutePage).mockResolvedValue(routePage);
    jest.mocked(runWalkQaCommand).mockResolvedValue(null);
    jest
      .mocked(getLocationPermissionGrant)
      .mockResolvedValue({ status: 'granted', accuracy: 'precise' });
    jest.mocked(Geolocation.getCurrentPosition).mockImplementation(success =>
      success({
        coords: {
          ...PUBLIC_ROUTE[1],
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      }),
    );
  });
  afterEach(async () => {
    if (r) await act(async () => r.unmount());
    jest.restoreAllMocks();
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
  test('temporary Home entry opens actual mode without starting or requesting GPS', async () => {
    const onClose = jest.fn();
    const request = jest.spyOn(PermissionsAndroid, 'requestMultiple');
    await act(async () => {
      r = Renderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <Panel initialMode="ACTUAL" onClose={onClose} />
        </ThemeProvider>,
      );
    });
    expect(r.root.findByType(Modal).props.visible).toBe(true);
    expect(r.root.findAllByProps({ testID: 'walk-pet-marker' })).toHaveLength(0);
    expect(r.root.findAllByProps({ testID: 'walk-fixture-marker' })).toHaveLength(0);
    expect(getWalkSnapshot).toHaveBeenCalled();
    expect(runWalkQaCommand).toHaveBeenCalledWith('GET');
    expect(jest.mocked(runWalkQaCommand).mock.calls.every(([command]) => command === 'GET')).toBe(true);
    expect(mutateNativeWalk).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
    expect(Geolocation.getCurrentPosition).not.toHaveBeenCalled();
    await act(async () => r.root.findByType(Modal).props.onRequestClose());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  test('temporary Home entry preserves an active walk when minimized', async () => {
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot('WALKING'));
    const onClose = jest.fn();
    await act(async () => {
      r = Renderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <Panel initialMode="ACTUAL" onClose={onClose} />
        </ThemeProvider>,
      );
    });
    await act(async () => r.root.findByType(Modal).props.onRequestClose());
    expect(onClose).not.toHaveBeenCalled();
    expect(r.root.findByType(WalkNoticeSheet).props.visible).toBe(true);
    await act(async () => r.root.findByType(WalkNoticeSheet).props.onPrimary());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mutateNativeWalk).not.toHaveBeenCalled();
    expect(jest.mocked(runWalkQaCommand).mock.calls.every(([command]) => command === 'GET')).toBe(true);
  });
  test('temporary actual entry cannot bypass the Store QA gate', async () => {
    jest.mocked(isWalkDistanceQaEnabled).mockReturnValue(false);
    try {
      await act(async () => {
        r = Renderer.create(
          <ThemeProvider theme={createTheme('light')}>
            <Panel initialMode="ACTUAL" />
          </ThemeProvider>,
        );
      });
      expect(r.toJSON()).toBeNull();
      expect(getWalkSnapshot).not.toHaveBeenCalled();
      expect(runWalkQaCommand).not.toHaveBeenCalled();
      expect(observeNativeWalk).not.toHaveBeenCalled();
    } finally {
      jest.mocked(isWalkDistanceQaEnabled).mockReturnValue(true);
    }
  });
  test.each(
    Object.keys(WALK_NOTICE_COPY) as Array<keyof typeof WALK_NOTICE_COPY>,
  )(
    'public %s notice cannot change settings or native walk state',
    async kind => {
      const settings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
      const intent = jest.spyOn(Linking, 'sendIntent').mockResolvedValue();
      await open();
      await press(r, 'walk-qa-open');
      await press(r, `walk-notice-gallery-${kind}`);
      expect(r.root.findByType(WalkNoticeSheet).props.kind).toBe(kind);
      expect(visibleText(r)).toContain(WALK_NOTICE_COPY[kind].title);
      await press(
        r,
        kind.startsWith('MINIMIZE_')
          ? 'walk-minimize-confirm'
          : 'walk-notice-primary',
      );
      expect(settings).not.toHaveBeenCalled();
      expect(intent).not.toHaveBeenCalled();
      expect(mutateNativeWalk).not.toHaveBeenCalled();
      expect(Geolocation.getCurrentPosition).not.toHaveBeenCalled();
      expect(
        jest
          .mocked(runWalkQaCommand)
          .mock.calls.every(([command]) => command === 'GET'),
      ).toBe(true);
    },
  );
  test.each(['PAUSED', 'RECOVERY_REQUIRED'] as const)(
    'minimize %s neither claims active recording nor resumes it',
    async state => {
      jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot(state));
      await open();
      await press(r, 'walk-mode-actual');
      await press(r, 'walk-close');
      expect(visibleText(r)).not.toContain('기록은 이어져요');
      expect(r.root.findByType(WalkNoticeSheet).props.kind).toBe(
        `MINIMIZE_${state === 'PAUSED' ? 'PAUSED' : 'RECOVERY'}`,
      );
      await press(r, 'walk-minimize-confirm');
      expect(r.root.findByType(Modal).props.visible).toBe(false);
      expect(mutateNativeWalk).not.toHaveBeenCalled();
    },
  );
  test('failed request checks state without replaying a mutation', async () => {
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot());
    jest
      .mocked(mutateNativeWalk)
      .mockRejectedValue(new Error('WALK_SERVICE_UNAVAILABLE'));
    await open();
    await press(r, 'walk-mode-actual');
    await press(r, 'walk-primary');
    expect(r.root.findByType(WalkNoticeSheet).props.kind).toBe(
      'REQUEST_FAILED',
    );
    const reads = jest.mocked(getWalkSnapshot).mock.calls.length;
    await press(r, 'walk-notice-primary');
    expect(getWalkSnapshot).toHaveBeenCalledTimes(reads + 1);
    expect(mutateNativeWalk).toHaveBeenCalledTimes(1);
    expect(r.root.findAllByType(WalkNoticeSheet)).toHaveLength(0);
  });
  test('pause preview opens a rest sheet; dismiss keeps time and distance paused', async () => {
    await open();
    await press(r, 'walk-primary');
    expect(r.root.findByType(WalkView).props.state).toBe('PAUSED');
    expect(
      r.root.findAllByProps({ testID: 'walk-rest-sheet' }).length,
    ).toBeGreaterThan(0);
    const before = r.root.findByType(WalkView).props.activeMs;
    await press(r, 'walk-rest-later');
    expect(r.root.findByType(WalkView).props.state).toBe('PAUSED');
    expect(r.root.findByType(WalkView).props.activeMs).toBe(before);
    expect(mutateNativeWalk).not.toHaveBeenCalled();
    await press(r, 'walk-primary');
    expect(r.root.findByType(WalkView).props.state).toBe('WALKING');
  });
  test('actual rest sheet waits for a committed native pause', async () => {
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot());
    let resolvePause: (s: WalkNativeSnapshot) => void = () => {
      throw Error('pause not started');
    };
    jest.mocked(mutateNativeWalk).mockImplementation(
      () =>
        new Promise(resolve => {
          resolvePause = resolve;
        }),
    );
    await open();
    await press(r, 'walk-mode-actual');
    await press(r, 'walk-primary');
    expect(r.root.findAllByProps({ testID: 'walk-rest-sheet' })).toHaveLength(
      0,
    );
    expect(r.root.findByType(WalkView).props.state).not.toBe('PAUSED');
    await act(async () => resolvePause(nativeSnapshot('PAUSED')));
    expect(r.root.findByType(WalkView).props.state).toBe('PAUSED');
    expect(
      r.root.findAllByProps({ testID: 'walk-rest-sheet' }).length,
    ).toBeGreaterThan(0);
    expect(mutateNativeWalk).toHaveBeenCalledTimes(1);
    expect(jest.mocked(mutateNativeWalk).mock.calls[0][0]).toBe('pauseWalk');
  });
  test('failed native pause does not show a misleading rest sheet', async () => {
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot());
    jest
      .mocked(mutateNativeWalk)
      .mockRejectedValue(new Error('WALK_REVISION_CONFLICT'));
    await open();
    await press(r, 'walk-mode-actual');
    await press(r, 'walk-primary');
    expect(r.root.findAllByProps({ testID: 'walk-rest-sheet' })).toHaveLength(
      0,
    );
    expect(r.root.findByType(WalkView).props.state).not.toBe('PAUSED');
  });
  test('rest sheet resumes only on its explicit resume action', async () => {
    await open();
    await press(r, 'walk-primary');
    await press(r, 'walk-rest-resume');
    expect(r.root.findByType(WalkView).props.state).toBe('WALKING');
    expect(mutateNativeWalk).not.toHaveBeenCalled();
  });
  test('parent hardware back during sheet presentation closes only the rest notice', async () => {
    await open();
    await press(r, 'walk-primary');
    const outer = r.root
      .findAllByType(Modal)
      .find(modal => modal.props.testID !== 'walk-rest-modal')!;
    await act(async () => {
      outer.props.onRequestClose();
    });
    expect(outer.props.visible).toBe(true);
    expect(r.root.findByType(WalkView).props.state).toBe('PAUSED');
    expect(mutateNativeWalk).not.toHaveBeenCalled();
  });
  test('failed resume keeps the rest sheet paused and offers a retry', async () => {
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot());
    jest
      .mocked(mutateNativeWalk)
      .mockResolvedValueOnce(nativeSnapshot('PAUSED'));
    await open();
    await press(r, 'walk-mode-actual');
    await press(r, 'walk-primary');
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot('PAUSED'));
    jest
      .mocked(mutateNativeWalk)
      .mockRejectedValueOnce(new Error('WALK_REVISION_CONFLICT'));
    await press(r, 'walk-rest-resume');
    expect(r.root.findByType(WalkView).props.state).toBe('PAUSED');
    expect(
      r.root.findAllByProps({ testID: 'walk-rest-error' }).length,
    ).toBeGreaterThan(0);
    expect(mutateNativeWalk).toHaveBeenCalledTimes(2);
    expect(jest.mocked(mutateNativeWalk).mock.calls[1][0]).toBe('resumeWalk');
    expect(r.root.findAllByType(WalkNoticeSheet)).toHaveLength(0);
    const outer = r.root.findAllByType(Modal).find(m => !m.props.testID)!;
    await act(async () => outer.props.onRequestClose());
    expect(r.root.findAllByType(WalkNoticeSheet)).toHaveLength(0);
  });
  test('selecting the public paused gallery shows the same rest sheet without native writes', async () => {
    await open();
    await press(r, 'walk-qa-open');
    await press(r, 'walk-gallery-PAUSED');
    expect(
      r.root.findAllByProps({ testID: 'walk-rest-sheet' }).length,
    ).toBeGreaterThan(0);
    expect(mutateNativeWalk).not.toHaveBeenCalled();
  });
  test('dismissing a committed pause stays paused on foreground without reopening the notice', async () => {
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot());
    jest
      .mocked(mutateNativeWalk)
      .mockResolvedValueOnce(nativeSnapshot('PAUSED'));
    await open();
    await press(r, 'walk-mode-actual');
    await press(r, 'walk-primary');
    await press(r, 'walk-rest-later');
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot('PAUSED'));
    const listeners = jest
      .mocked(AppState.addEventListener)
      .mock.calls.map(call => call[1]);
    await act(async () => {
      listeners.forEach(listener => listener('background'));
    });
    await act(async () => {
      listeners.forEach(listener => listener('active'));
    });
    expect(r.root.findByType(WalkView).props.state).toBe('PAUSED');
    expect(r.root.findAllByProps({ testID: 'walk-rest-sheet' })).toHaveLength(
      0,
    );
    expect(mutateNativeWalk).toHaveBeenCalledTimes(1);
  });
  test('double resume taps use one native command and only close after success', async () => {
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot());
    jest
      .mocked(mutateNativeWalk)
      .mockResolvedValueOnce(nativeSnapshot('PAUSED'));
    await open();
    await press(r, 'walk-mode-actual');
    await press(r, 'walk-primary');
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot('PAUSED'));
    let finishResume: (s: WalkNativeSnapshot) => void = () => {
      throw Error('resume not started');
    };
    jest.mocked(mutateNativeWalk).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finishResume = resolve;
        }),
    );
    await press(r, 'walk-rest-resume');
    await press(r, 'walk-rest-resume');
    expect(mutateNativeWalk).toHaveBeenCalledTimes(2);
    expect(r.root.findByType(WalkView).props.state).toBe('PAUSED');
    await act(async () => finishResume(nativeSnapshot()));
    expect(r.root.findByType(WalkView).props.state).not.toBe('PAUSED');
  });
  test('a notification-side resume clears the visible sheet and preserves the normal back contract', async () => {
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot());
    jest
      .mocked(mutateNativeWalk)
      .mockResolvedValueOnce(nativeSnapshot('PAUSED'));
    await open();
    await press(r, 'walk-mode-actual');
    await press(r, 'walk-primary');
    const receive = jest.mocked(observeNativeWalk).mock.calls.at(-1)![0];
    await act(async () => {
      receive(nativeSnapshot());
    });
    const outer = r.root
      .findAllByType(Modal)
      .find(modal => modal.props.testID !== 'walk-rest-modal')!;
    await act(async () => {
      outer.props.onRequestClose();
    });
    expect(
      r.root.findAllByProps({ testID: 'walk-minimize-confirm' }).length,
    ).toBeGreaterThan(0);
    expect(mutateNativeWalk).toHaveBeenCalledTimes(1);
  });
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
  test('finish confirmation stays visible until native success and keeps failure retryable', async () => {
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot());
    let rejectFinish: (e: Error) => void = () => {
      throw Error('finish not started');
    };
    jest.mocked(mutateNativeWalk).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectFinish = reject;
        }),
    );
    await open();
    await press(r, 'walk-mode-actual');
    await press(r, 'walk-finish');
    await press(r, 'walk-finish-confirm');
    expect(r.root.findByType(WalkView).props.state).toBe('FINISH_CONFIRM');
    await act(async () => rejectFinish(new Error('WALK_REVISION_CONFLICT')));
    expect(r.root.findByType(WalkView).props.state).toBe('FINISH_CONFIRM');
    expect(
      r.root.findAllByProps({ testID: 'walk-finish-error' }).length,
    ).toBeGreaterThan(0);
    expect(r.root.findAllByType(WalkNoticeSheet)).toHaveLength(0);
    await act(async () => r.root.findByType(WalkView).props.onCancelFinish());
    expect(r.root.findAllByType(WalkNoticeSheet)).toHaveLength(0);
  });
  test('outer Back at finish confirmation cancels only the confirmation', async () => {
    await open();
    await press(r, 'walk-finish');
    const outer = r.root.findAllByType(Modal).find(m => !m.props.testID)!;
    await act(async () => {
      outer.props.onRequestClose();
    });
    expect(outer.props.visible).toBe(true);
    expect(r.root.findByType(WalkView).props.state).toBe('WALKING');
    expect(mutateNativeWalk).not.toHaveBeenCalled();
  });
  test.each(['external finish', 'session replacement'] as const)(
    '%s clears confirmation state before a later walking snapshot',
    async boundary => {
      jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot());
      await open();
      await press(r, 'walk-mode-actual');
      await press(r, 'walk-finish');
      const receive = jest.mocked(observeNativeWalk).mock.calls.at(-1)![0];
      await act(async () =>
        receive(
          boundary === 'external finish'
            ? nativeSnapshot('FINISHED_LOCAL')
            : {
                ...nativeSnapshot(),
                sessionId: '22222222-2222-4222-8222-222222222222',
              },
        ),
      );
      await act(async () => receive(nativeSnapshot()));
      expect(r.root.findByType(WalkView).props.state).toBe('WALKING');
      expect(mutateNativeWalk).not.toHaveBeenCalled();
    },
  );
  test('foreground refresh reads native elapsed time without mutating the walk', async () => {
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot());
    await open();
    await press(r, 'walk-mode-actual');
    const before = jest.mocked(getWalkSnapshot).mock.calls.length;
    const callbacks = jest
      .mocked(AppState.addEventListener)
      .mock.calls.filter(([event]) => event === 'change')
      .map(([, listener]) => listener);
    jest.mocked(getWalkSnapshot).mockResolvedValue({
      ...nativeSnapshot(),
      elapsedActiveMs: '122000',
    });
    await act(async () => callbacks.forEach(listener => listener('active')));
    expect(getWalkSnapshot).toHaveBeenCalledTimes(before + 1);
    expect(r.root.findByType(WalkView).props.activeMs).toBe('122000');
    expect(r.root.findByType(WalkView).props.clockRunning).toBe(true);
    expect(mutateNativeWalk).not.toHaveBeenCalled();
  });
  test('QA mode toggle cannot occupy or overlap the product bottom safe area', async () => {
    await open();
    expect(r.root.findAllByProps({ testID: 'walk-mode-actual' })).toHaveLength(
      0,
    );
    await press(r, 'walk-qa-open');
    expect(
      r.root.findAllByProps({ testID: 'walk-mode-actual' }).length,
    ).toBeGreaterThan(0);
  });
  test('finished result hides synthetic labels and does not mount the map by default', async () => {
    await open();
    await press(r, 'walk-qa-open');
    await press(r, 'walk-gallery-FINISHED_LOCAL');
    expect(visibleText(r)).not.toMatch(/합성 미리보기|합성 경로|합성 결과/);
    expect(host(r, 'MapView')).toHaveLength(0);
    expect(
      r.root.findAllByProps({ testID: 'walk-result-screen' }).length,
    ).toBeGreaterThan(0);
  });
  test('a bounded tail page cannot misrepresent its first point as the session start', async () => {
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot());
    jest.mocked(getWalkRoutePage).mockResolvedValue({
      ...routePage,
      startCursor: '512',
      endCursor: '515',
      filteredPointCount: '516',
      hasEarlier: true,
    });
    await open();
    await press(r, 'walk-mode-actual');
    expect(host(r, 'Marker')).toHaveLength(0);
    expect(
      r.root.findAllByProps({ testID: 'walk-actual-marker' }).length,
    ).toBeGreaterThan(0);
  });
  test('result exit closes only the QA modal and does not pretend to navigate Home', async () => {
    await open();
    await press(r, 'walk-qa-open');
    await press(r, 'walk-gallery-FINISHED_LOCAL');
    expect(visibleText(r)).not.toContain('홈으로');
    await press(r, 'walk-primary');
    expect(r.root.findByType(Modal).props.visible).toBe(false);
    expect(mutateNativeWalk).not.toHaveBeenCalled();
  });
  test('public preview uses a regular RN pet overlay and only a native start point', async () => {
    await open();
    expect(host(r, 'Marker')).toHaveLength(1);
    const marker = host(r, 'Marker')[0];
    expect(marker.props.children).toBeTruthy();
    expect(marker.props.title).not.toBe('PUBLIC_SYNTHETIC');
    expect(
      r.root.findAllByProps({ testID: 'walk-fixture-marker' }).length,
    ).toBeGreaterThan(0);
  });
  test('local pet preview uses the selected profile but public gallery never exposes it', async () => {
    mockPetName = '보리';
    mockAvatarUrl = 'https://example.invalid/selected-pet.png';
    await open();
    expect(r.root.findByType(Image).props.source).toEqual({
      uri: mockAvatarUrl,
    });
    expect(visibleText(r)).toContain('보리와 함께');
    expect(visibleText(r)).not.toMatch(/합성 미리보기|합성 경로/);
    expect(getWalkRoutePage).not.toHaveBeenCalled();
    expect(mutateNativeWalk).not.toHaveBeenCalled();
    await press(r, 'walk-qa-open');
    await press(r, 'walk-gallery-WALKING');
    expect(r.root.findAllByType(Image)).toHaveLength(0);
    expect(visibleText(r)).toContain('누리와 함께');
    expect(visibleText(r)).not.toMatch(/합성 미리보기|합성 경로/);
    expect(visibleText(r)).not.toContain('보리');
  });
  test('actual mode without a filtered fix has no synthetic camera or marker', async () => {
    await open();
    await press(r, 'walk-mode-actual');
    expect(host(r, 'Marker')).toHaveLength(0);
    expect(host(r, 'MapView')).toHaveLength(0);
    expect(r.root.findAllByProps({ testID: 'walk-pet-overlay' })).toHaveLength(
      0,
    );
  });
  test('explicit current-location design review shows only the real one-shot point and never starts a walk', async () => {
    await open();
    expect(Geolocation.getCurrentPosition).not.toHaveBeenCalled();
    await press(r, 'walk-qa-open');
    await press(r, 'walk-design-location');
    expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(
      jest.mocked(Geolocation.getCurrentPosition).mock.calls[0][2],
    ).toMatchObject({
      enableHighAccuracy: false,
      maximumAge: 0,
      timeout: 10000,
    });
    expect(host(r, 'MapView')[0].props.initialRegion).toMatchObject(
      PUBLIC_ROUTE[1],
    );
    expect(host(r, 'Polyline')).toHaveLength(0);
    expect(visibleText(r)).toContain('현재 위치 · 디자인 확인');
    expect(visibleText(r)).toContain('산책 기록은 시작하지 않았어요');
    expect(visibleText(r)).not.toContain('합성 미리보기');
    expect(mutateNativeWalk).not.toHaveBeenCalled();
    expect(runWalkQaCommand).not.toHaveBeenCalledWith('START_STEP');
    for (const id of ['walk-primary', 'walk-finish']) {
      const action = r.root.findAll(
        n => n.props.testID === id && n.props.accessibilityRole === 'button',
      )[0];
      expect(action.props.accessibilityState.disabled).toBe(true);
      expect(action.props.onPress).toBeUndefined();
    }
    await press(r, 'walk-qa-open');
    await press(r, 'walk-gallery-WALKING');
    expect(visibleText(r)).not.toContain('현재 위치 · 디자인 확인');
    expect(host(r, 'MapView')[0].props.initialRegion).toMatchObject(
      PUBLIC_ROUTE.at(-1)!,
    );
  });
  test('current-location design review fails closed on denied permission without fake coordinates', async () => {
    jest
      .mocked(getLocationPermissionGrant)
      .mockResolvedValue({ status: 'denied', accuracy: 'unknown' });
    await open();
    await press(r, 'walk-qa-open');
    await press(r, 'walk-design-location');
    expect(Geolocation.getCurrentPosition).not.toHaveBeenCalled();
    expect(host(r, 'MapView')).toHaveLength(0);
    expect(visibleText(r)).toContain(
      '위치 권한이 필요해요. 기기 설정에서 허용해 주세요.',
    );
    expect(mutateNativeWalk).not.toHaveBeenCalled();
  });
  test('one-shot location failure does not substitute the public route or start tracking', async () => {
    jest
      .mocked(Geolocation.getCurrentPosition)
      .mockImplementation((_success, failure) =>
        failure?.({
          code: 3,
          message: 'timeout',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        }),
      );
    await open();
    await press(r, 'walk-qa-open');
    await press(r, 'walk-design-location');
    expect(host(r, 'MapView')).toHaveLength(0);
    expect(visibleText(r)).toContain(
      '현재 위치를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',
    );
    expect(mutateNativeWalk).not.toHaveBeenCalled();
  });
  test('a late location callback cannot enter the public gallery after mode switch', async () => {
    const callbacks: Parameters<typeof Geolocation.getCurrentPosition>[0][] =
      [];
    jest.mocked(Geolocation.getCurrentPosition).mockImplementation(success => {
      callbacks.push(success);
    });
    await open();
    await press(r, 'walk-qa-open');
    let locationTask: Promise<void> | undefined;
    await act(async () => {
      locationTask = r.root
        .findAllByProps({ testID: 'walk-design-location' })[0]
        .props.onPress();
    });
    expect(host(r, 'MapView')).toHaveLength(0);
    await press(r, 'walk-qa-open');
    await press(r, 'walk-gallery-WALKING');
    await act(async () => {
      callbacks[0]({
        coords: {
          ...PUBLIC_ROUTE[1],
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
      await locationTask;
    });
    expect(host(r, 'MapView')[0].props.initialRegion).toMatchObject(
      PUBLIC_ROUTE.at(-1)!,
    );
    expect(visibleText(r)).not.toContain('현재 위치 · 디자인 확인');
    expect(
      r.root.findAllByProps({ testID: 'walk-actual-marker' }),
    ).toHaveLength(0);
    expect(mutateNativeWalk).not.toHaveBeenCalled();
  });
  test('actual filtered fix owns the first camera and only actual marker; gaps remain separate', async () => {
    jest.mocked(getWalkSnapshot).mockResolvedValue(nativeSnapshot());
    await open();
    await press(r, 'walk-mode-actual');
    expect(host(r, 'MapView')[0].props.initialRegion).toMatchObject(
      PUBLIC_ROUTE[0],
    );
    expect(
      r.root.findAllByProps({ testID: 'walk-fixture-marker' }),
    ).toHaveLength(0);
    expect(
      r.root.findAllByProps({ testID: 'walk-actual-marker' }).length,
    ).toBeGreaterThan(0);
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
      if (state === 'PRE_WALK') {
        expect(
          r.root.findAllByProps({ testID: 'walk-pre-title' }).at(-1)!.props
            .accessibilityLabel,
        ).toBe('누리야, 산책 가자!');
        expect(host(r, 'MapView')).toHaveLength(0);
      } else {
        expect(visibleText(r)).toContain(
          state === 'WALKING'
            ? WALK_COPY.WALKING.supporting
            : state === 'PAUSED'
            ? '시간과 거리 기록을 멈췄어요'
            : ['GPS_WEAK', 'GPS_LOST'].includes(state)
            ? '함께하는 발걸음을 소중히 기록해요.'
            : state === 'GPS_ACQUIRING'
            ? '첫 위치를 확인하고 있어요.'
            : WALK_COPY[state].title,
        );
      }
      expect(visibleText(r)).not.toMatch(/합성 미리보기|합성 경로|합성 결과/);
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
  test('pre-walk entrance does not replay when returning from the QA inspector', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    const timing = jest.spyOn(Animated, 'timing');
    await open();
    await press(r, 'walk-qa-open');
    await press(r, 'walk-gallery-PRE_WALK');
    expect(timing).toHaveBeenCalledTimes(6);
    await press(r, 'walk-qa-open');
    await press(r, 'walk-qa-close');
    expect(timing).toHaveBeenCalledTimes(6);
    expect(mutateNativeWalk).not.toHaveBeenCalled();
  });
  test('finish requires confirmation; fixture result makes no lifetime, reward, server or memory claim', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    await open();
    await press(r, 'walk-finish');
    expect(visibleText(r)).toContain('오늘 산책, 기분 좋게 마칠까요?');
    expect(mutateNativeWalk).not.toHaveBeenCalled();
    await press(r, 'walk-finish-cancel');
    await press(r, 'walk-finish');
    await press(r, 'walk-finish-confirm');
    expect(visibleText(r)).toContain('산책 결과를 기기에 저장했어요.');
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
    expect(visibleText(r)).toContain('화면을 닫아도 산책 기록은 이어져요.');
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
    expect(r.root.findAllByProps({ testID: 'walk-pet-overlay' })).toHaveLength(
      0,
    );
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
    expect(image.props.style.borderRadius).toBe(16);
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
        n => n.props.testID === 'walk-header-pet',
      )!;
      expect(name.props.children).toContain(mockPetName);
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
