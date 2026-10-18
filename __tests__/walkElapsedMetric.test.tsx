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
