import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import WalkWeatherChip from '../src/screens/DevTest/walkPresentation/WalkWeatherChip';
import {
  buildWeatherGuideBundleForScenario,
  getWeatherEmoji,
} from '../src/services/weather/guide';
import { useWeatherStore } from '../src/store/weatherStore';
import WalkView from '../src/screens/DevTest/walkPresentation/WalkView';
import {
  GALLERY_STATES,
  type PresentationState,
} from '../src/screens/DevTest/walkPresentation/model';

jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/components/icons/NuriFeatherIcon', () => 'Feather');
jest.mock('../src/components/icons/NuriSemanticIcon', () => 'SemanticIcon');
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  __esModule: true,
  default: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));
const now = Date.parse('2026-10-15T03:00:00Z');
const current = () => ({
  ...buildWeatherGuideBundleForScenario('fresh'),
  currentTemperature: 22,
  detailStatus: '맑음',
  fetchedAt: new Date(now).toISOString(),
  forecastValidAt: new Date(now).toISOString(),
  expiresAt: new Date(now + 30 * 60000).toISOString(),
  staleUntil: new Date(now + 60 * 60000).toISOString(),
});

function readText(node: Renderer.ReactTestInstance): string {
  return node.children
    .map(child => (typeof child === 'string' ? child : readText(child)))
    .join('');
}

describe('Walk weather shares the Home cache without new collection', () => {
  let tree: Renderer.ReactTestRenderer;
  const original = useWeatherStore.getState();
  const text = () =>
    tree.root
      .findAll(n => (n.type as unknown) === 'AppText')
      .map(readText)
      .join(' ');
  const mount = async () => {
    await act(async () => {
      tree = Renderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <WalkWeatherChip />
        </ThemeProvider>,
      );
    });
  };
  const mountQa = async (state: PresentationState) => {
    await act(async () => {
      tree = Renderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <WalkView
            state={state}
            petName="누리"
            season="autumn"
            preview
            publicPreview
            distanceM="2430"
            activeMs="1920000"
            busy={false}
            map={<View />}
            insetTop={24}
            insetBottom={24}
            freeLook={false}
            error={false}
            qualityLabel="위치 기록 품질: 양호"
            onClose={jest.fn()}
            onQa={jest.fn()}
            onRecenter={jest.fn()}
            onPrimary={jest.fn()}
            onFinish={jest.fn()}
            onCancelFinish={jest.fn()}
          />
        </ThemeProvider>,
      );
    });
  };
  const save = (bundle = current()) =>
    useWeatherStore
      .getState()
      .saveBundle(
        { latitude: 37.5665, longitude: 126.978, accuracy: 10 },
        bundle,
      );
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    useWeatherStore.setState({ byCoordsKey: {}, currentSnapshot: null });
  });
  afterEach(async () => {
    if (tree) await act(async () => tree.unmount());
    useWeatherStore.setState(original);
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('shows the same condition icon, temperature and status as the Home bundle', async () => {
    save();
    await mount();
    expect(text()).toContain('22°');
    expect(text()).toContain('맑음');
    expect(tree.root.findByType(Text).props.children).toBe(
      getWeatherEmoji(current().weatherIcon),
    );
    expect(text()).not.toMatch(/GPS|latitude|longitude|공개 합성/);
  });
  it('has no weather surface, outline or rounded frame', async () => {
    save();
    await mount();
    const chip = tree.root
      .findAllByProps({ testID: 'walk-weather-chip' })
      .at(-1)!;
    const style = StyleSheet.flatten(chip.props.style);
    expect(style.backgroundColor).toBeUndefined();
    expect(style.borderWidth ?? 0).toBe(0);
    expect(style.borderRadius ?? 0).toBe(0);
    expect(chip.props.accessibilityRole).toBe('text');
    expect(tree.root.findAllByType(Text)).toHaveLength(1);
  });
  it('updates with the shared Home snapshot rather than freezing the first reading', async () => {
    save();
    await mount();
    await act(async () =>
      save({
        ...current(),
        currentTemperature: 18,
        detailStatus: '흐림',
        weatherIcon: 'weather-cloudy',
      }),
    );
    expect(text()).toContain('18°');
    expect(text()).toContain('흐림');
    expect(tree.root.findByType(Text).props.children).toBe(
      getWeatherEmoji('weather-cloudy'),
    );
  });
  it('does not invent weather when no usable cache exists', async () => {
    await mount();
    expect(text()).toContain('날씨 확인 중');
    expect(text()).not.toMatch(/22|맑음/);
    expect(tree.root.findAllByType(Text)).toHaveLength(0);
  });
  it('omits pre-walk weather without modifying the shared Home cache', async () => {
    save();
    const snapshot = useWeatherStore.getState().currentSnapshot;
    await mountQa('PRE_WALK');
    expect(
      tree.root.findAllByProps({ testID: 'walk-weather-chip' }),
    ).toHaveLength(0);
    expect(text()).not.toMatch(/22°|맑음|날씨 확인 중/);
    expect(text()).toContain('우리만의 추억을 쌓아가요.');
    expect(useWeatherStore.getState().currentSnapshot).toBe(snapshot);
  });
  it('marks preview data as recent and removes measurements after expiry', async () => {
    save();
    await mount();
    await act(async () => jest.advanceTimersByTime(30 * 60000));
    expect(text()).toContain('최근');
    await act(async () => jest.advanceTimersByTime(30 * 60000));
    expect(text()).toContain('날씨 확인 중');
    expect(text()).not.toContain('22°');
  });
  it.each(GALLERY_STATES)(
    'uses actual Home weather only where the QA state %s requires it',
    async state => {
      save({
        ...current(),
        currentTemperature: 17,
        detailStatus: '흐림',
        weatherIcon: 'weather-cloudy',
      });
      const snapshot = useWeatherStore.getState().currentSnapshot;
      await mountQa(state);
      if (['PRE_WALK', 'FINISH_CONFIRM', 'FINISHED_LOCAL'].includes(state)) {
        expect(
          tree.root.findAllByProps({ testID: 'walk-weather-chip' }),
        ).toHaveLength(0);
        expect(text()).not.toMatch(/17°|흐림|날씨 확인 중/);
        expect(useWeatherStore.getState().currentSnapshot).toBe(snapshot);
        return;
      }
      expect(text()).toContain('17°');
      expect(text()).toContain('흐림');
      expect(
        tree.root.findAllByProps({ testID: 'walk-weather-icon' }).at(-1)!.props
          .children,
      ).toBe(getWeatherEmoji('weather-cloudy'));
      expect(
        tree.root.findAllByProps({ testID: 'walk-weather-chip' }).at(-1)!.props
          .accessibilityLabel,
      ).toBe('날씨, 17°, 흐림');
      expect(useWeatherStore.getState().currentSnapshot).toBe(snapshot);
    },
  );
  it('does not replace missing actual weather with a sunny fixture in QA', async () => {
    await mountQa('WALKING');
    expect(text()).toContain('날씨 확인 중');
    expect(tree.root.findAllByType(Text)).toHaveLength(0);
  });
});
