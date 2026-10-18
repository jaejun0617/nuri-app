import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AppState, View, type AppStateStatus } from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import WalkView from '../src/screens/DevTest/walkPresentation/WalkView';

jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/components/icons/NuriFeatherIcon', () => 'Feather');
jest.mock('../src/components/icons/NuriSemanticIcon', () => 'SemanticIcon');
jest.mock(
  '../src/screens/DevTest/walkPresentation/WalkWeatherChip',
  () => 'Weather',
);
// Loader accessibility is covered separately; this suite owns only clock behavior.
jest.mock(
  '../src/screens/DevTest/walkPresentation/WalkSignalStatus',
  () => 'SignalStatus',
);
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  __esModule: true,
  default: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

type ClockProps = React.ComponentProps<typeof WalkView> & {
  clockSessionKey: string;
  clockRunning: boolean;
};
const base: ClockProps = {
  state: 'WALKING',
  petName: '누리',
  season: 'autumn',
  preview: false,
  distanceM: '100',
  activeMs: '60000',
  clockSessionKey: 'public-test-session',
  clockRunning: true,
  busy: false,
  map: <View />,
  insetTop: 24,
  insetBottom: 24,
  freeLook: false,
  error: false,
  qualityLabel: '',
  onClose: jest.fn(),
  onQa: jest.fn(),
  onRecenter: jest.fn(),
  onPrimary: jest.fn(),
  onFinish: jest.fn(),
  onCancelFinish: jest.fn(),
};

describe('Walk foreground elapsed-time presentation', () => {
  let tree: Renderer.ReactTestRenderer;
  const listeners = new Set<(state: AppStateStatus) => void>();
  let current: ClockProps;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.replaceProperty(AppState, 'currentState', 'active');
    listeners.clear();
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, listener) => {
        listeners.add(listener);
        return { remove: () => listeners.delete(listener) };
      });
  });
  afterEach(() => {
    act(() => tree?.unmount());
    jest.restoreAllMocks();
    jest.useRealTimers();
  });
  const render = (overrides: Partial<ClockProps> = {}) => {
    current = { ...base, ...overrides };
    act(() => {
      tree = Renderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <WalkView {...current} />
        </ThemeProvider>,
      );
    });
  };
  const update = (overrides: Partial<ClockProps>) => {
    current = { ...current, ...overrides };
    act(() =>
      tree.update(
        <ThemeProvider theme={createTheme('light')}>
          <WalkView {...current} />
        </ThemeProvider>,
      ),
    );
  };
  const appState = (state: AppStateStatus) =>
    act(() => {
      AppState.currentState = state;
      listeners.forEach(listener => listener(state));
    });
  const time = () =>
    tree.root.findAllByProps({ testID: 'walk-time-value' }).at(-1)!.props
      .children;

  it('advances one second at a time without a new GPS snapshot', () => {
    render();
    expect(time()).toBe('01:00');
    act(() => jest.advanceTimersByTime(1000));
    expect(time()).toBe('01:01');
    act(() => jest.advanceTimersByTime(1000));
    expect(time()).toBe('01:02');
  });

  it('publishes the next second promptly after an early frame-boundary callback', () => {
    let mono = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => mono);
    render();
    mono = 999.6;
    act(() => jest.advanceTimersByTime(1000));
    expect(time()).toBe('01:00');
    mono = 1050;
    act(() => jest.advanceTimersByTime(50));
    expect(time()).toBe('01:01');
  });

  it.each([1400, 2100])(
    'uses real elapsed time for a %ims late callback',
    late => {
      let mono = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => mono);
      render();
      mono = late;
      act(() => jest.advanceTimersByTime(1000));
      expect(time()).toBe(late < 2000 ? '01:01' : '01:02');
    },
  );

  it('reconciles a five-second checkpoint without double-counting or resetting the interval', () => {
    render();
    act(() => jest.advanceTimersByTime(5000));
    expect(time()).toBe('01:05');
    update({ activeMs: '65000' });
    expect(time()).toBe('01:05');
    act(() => jest.advanceTimersByTime(1000));
    expect(time()).toBe('01:06');
    update({ activeMs: '65500' });
    expect(time()).toBe('01:06');
    act(() => jest.advanceTimersByTime(1000));
    expect(time()).toBe('01:07');
  });

  it('aligns a fractional native anchor to second boundaries, not mount time', () => {
    render({ activeMs: '60600' });
    act(() => jest.advanceTimersByTime(400));
    expect(time()).toBe('01:01');
    act(() => jest.advanceTimersByTime(50));
    update({ activeMs: '61050' });
    act(() => jest.advanceTimersByTime(950));
    expect(time()).toBe('01:02');
  });

  it.each([999, 1001])('keeps the next deadline across a native snapshot at %ims', at => {
    render();
    act(() => jest.advanceTimersByTime(at));
    update({ activeMs: String(60000 + at) });
    act(() => jest.advanceTimersByTime(2000 - at));
    expect(time()).toBe('01:02');
    expect(jest.getTimerCount()).toBe(1);
  });

  it('does not restart or publish an off-boundary second for repeated stale checkpoints', () => {
    render({ activeMs: '60600' });
    for (let index = 0; index < 20; index++) {
      act(() => jest.advanceTimersByTime(100));
      update({ activeMs: String(60000 + index * 10) });
      expect(jest.getTimerCount()).toBe(1);
      expect(time()).toBe(index < 3 ? '01:00' : index < 13 ? '01:01' : '01:02');
    }
  });

  it('accepts an authoritative native value ahead of the local projection', () => {
    render();
    act(() => jest.advanceTimersByTime(1000));
    update({ activeMs: '64000' });
    expect(time()).toBe('01:04');
    act(() => jest.advanceTimersByTime(1000));
    expect(time()).toBe('01:05');
    expect(jest.getTimerCount()).toBe(1);
  });

  it('keeps ten minutes of fractional checkpoints on the same second cadence', () => {
    render({ activeMs: '60600' });
    for (let second = 1; second <= 600; second++) {
      act(() => jest.advanceTimersByTime(second === 1 ? 400 : 1000));
      expect(time()).toBe(`${String(Math.floor((60 + second) / 60)).padStart(2, '0')}:${String((60 + second) % 60).padStart(2, '0')}`);
      update({ activeMs: String(60000 + second * 1000 - 200) });
      expect(jest.getTimerCount()).toBe(1);
    }
  });

  it('invalidates an active anchor on recovery and never counts recovery time', () => {
    render();
    act(() => jest.advanceTimersByTime(2000));
    update({ state: 'RECOVERY_REQUIRED', clockRunning: false, activeMs: '62000' });
    expect(jest.getTimerCount()).toBe(0);
    act(() => jest.advanceTimersByTime(60000));
    expect(time()).toBe('01:02');
    update({ state: 'WALKING', clockRunning: true });
    act(() => jest.advanceTimersByTime(1000));
    expect(time()).toBe('01:03');
  });

  it('freezes at native pause time and resumes without counting the pause', () => {
    render();
    act(() => jest.advanceTimersByTime(2000));
    update({ state: 'PAUSED', activeMs: '62000', clockRunning: false });
    act(() => jest.advanceTimersByTime(15000));
    expect(time()).toBe('01:02');
    update({ state: 'WALKING', clockRunning: true });
    act(() => jest.advanceTimersByTime(1000));
    expect(time()).toBe('01:03');
  });

  it.each(['GPS_ACQUIRING', 'GPS_WEAK', 'GPS_LOST'] as const)(
    '%s still counts active time while native runtime is walking',
    state => {
      render({ state });
      act(() => jest.advanceTimersByTime(1000));
      expect(time()).toBe('01:01');
    },
  );

  it.each([
    { state: 'PAUSED' as const },
    { state: 'RECOVERY_REQUIRED' as const },
    { clockRunning: false },
    { clockSessionKey: '' },
    { preview: true },
    { designReview: true },
  ])('never extrapolates a frozen or synthetic state: %j', overrides => {
    render(overrides);
    act(() => jest.advanceTimersByTime(8000));
    expect(time()).toBe('01:00');
  });

  it('resets the clock for another session', () => {
    render();
    act(() => jest.advanceTimersByTime(5000));
    update({ clockSessionKey: 'next-public-session', activeMs: '0' });
    expect(time()).toBe('00:00');
    act(() => jest.advanceTimersByTime(1000));
    expect(time()).toBe('00:01');
  });

  it('stops in background, accepts a refreshed native value and disposes its timer', () => {
    render();
    act(() => jest.advanceTimersByTime(2000));
    appState('background');
    const backgroundTime = time();
    act(() => jest.advanceTimersByTime(60000));
    expect(time()).toBe(backgroundTime);
    appState('active');
    update({ activeMs: '122000' });
    expect(time()).toBe('02:02');
    act(() => jest.advanceTimersByTime(1000));
    expect(time()).toBe('02:03');
    appState('active');
    act(() => jest.advanceTimersByTime(1000));
    expect(time()).toBe('02:04');
    act(() => tree.unmount());
    expect(listeners.size).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('preserves the active monotonic anchor until the foreground GET resolves', () => {
    render();
    act(() => jest.advanceTimersByTime(2000));
    appState('background');
    expect(jest.getTimerCount()).toBe(0);
    act(() => jest.advanceTimersByTime(60000));
    appState('active');
    expect(time()).toBe('02:02');
    update({ activeMs: '120000' });
    expect(time()).toBe('02:02');
    act(() => jest.advanceTimersByTime(1000));
    expect(time()).toBe('02:03');
    expect(jest.getTimerCount()).toBe(1);
  });

  it('does not rerender the map at each display tick', () => {
    const mapRender = jest.fn();
    function MapProbe() {
      mapRender();
      return <View />;
    }
    render({ map: <MapProbe /> });
    const before = mapRender.mock.calls.length;
    act(() => jest.advanceTimersByTime(10000));
    expect(time()).toBe('01:10');
    expect(mapRender).toHaveBeenCalledTimes(before);
  });
});
