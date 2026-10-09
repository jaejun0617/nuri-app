import React from 'react';
import * as RN from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTheme } from '../src/app/theme/theme';
import HealthReportScreen from '../src/screens/HealthReport/HealthReportScreen';
import { usePetStore } from '../src/store/petStore';
import type { useHealthReportMonth } from '../src/hooks/useHealthReportMonth';
import { buildHealthReportMonthBounds } from '../src/services/health-report/month';
import { buildWeightChartModel } from '../src/components/health/weightChartModel';
import WeightTrendChart from '../src/components/health/WeightTrendChart';
import SeasonalAmbientBackground from '../src/components/common/SeasonalAmbientBackground';
import { getHomeAmbientVisual } from '../src/theme/home/seasonalAmbient';
import type { SeasonKey } from '../src/theme/seasonal/season';
import type { HealthReportTabKey } from '../src/services/health-report/viewModel';
import { useHealthVisualQaStore } from '../src/components/health/healthVisualQa';
import * as schedules from '../src/services/supabase/schedules';

const mockNavigate = jest.fn();
const mockBack = jest.fn();
const mockRefetch = jest.fn();
let mockTab: HealthReportTabKey = 'records';
let mockLoading = false;
let mockError: string | null = null;
let mockSeason = 'autumn';
let mockFontScale = 1;
let mockData: NonNullable<ReturnType<typeof useHealthReportMonth>['data']>;

jest.mock('@react-native-masked-view/masked-view', () => {
  const MockReact = jest.requireActual<typeof React>('react');
  const { View } = jest.requireActual<typeof RN>('react-native');
  return function MockMaskedView({
    maskElement,
    children,
    ...props
  }: React.ComponentProps<typeof RN.View> & {
    maskElement: React.ReactElement;
  }) {
    return MockReact.createElement(View, props, maskElement, children);
  };
});
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({
    width: 360,
    height: 800,
    scale: 3,
    fontScale: mockFontScale,
  }),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockBack,
    reset: jest.fn(),
  }),
  useRoute: () => ({
    params: { petId: 'qa', initialTab: mockTab, focusYmd: '2026-10-09' },
  }),
}));
jest.mock('../src/hooks/useEntryAwareBackAction', () => ({
  useEntryAwareBackAction: () => mockBack,
}));
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => mockSeason,
}));
jest.mock('../src/hooks/useHealthReportMonth', () => ({
  useHealthReportMonth: () => ({
    data: mockData,
    monthKey: '2026-10',
    loading: mockLoading,
    error: mockError,
    refetch: mockRefetch,
  }),
}));
jest.mock(
  '../src/components/navigation/AppNavigationToolbar',
  () => 'AppNavigationToolbar',
);
jest.mock(
  '../src/components/health/WeightLogEntrySheet',
  () => 'WeightLogEntrySheet',
);
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
  useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
}));

function fixture(): typeof mockData {
  const activity = {
    id: 'memory:a',
    source: 'memory' as const,
    memoryId: 'a',
    ymd: '2026-10-09',
    title: '건강 관찰',
    subtitle: '저장한 메모',
    kind: 'symptom' as const,
    iconName: 'activity',
  };
  const log = {
    id: 'weight:a',
    petId: 'qa',
    userId: 'qa',
    measuredOn: '2026-10-09',
    weightKg: 5.3,
    note: '실제 메모',
    source: 'health_report' as const,
    createdAt: '2026-10-09T00:00:00Z',
    updatedAt: '2026-10-09T00:00:00Z',
  };
  return {
    bounds: buildHealthReportMonthBounds('2026-10'),
    dateItems: ['2026-10-08', '2026-10-09'],
    activityItems: [activity],
    groupedActivities: { '2026-10-09': [activity] },
    latestActivityYmd: '2026-10-09',
    weightLogs: [log],
    previousWeightLog: null,
    latestWeightSnapshot: null,
    weightTimeline: [{ ...log, deltaKg: 0.1, deltaRate: 1.9, direction: 'up' }],
    weightSummary: {
      latestWeightKg: 5.3,
      latestMeasuredOn: '2026-10-09',
      deltaKg: 0.1,
      deltaRate: 1.9,
      direction: 'up',
      monthCount: 1,
    },
  };
}

describe('health redesign preserves feature ownership', () => {
  let renderer: TestRenderer.ReactTestRenderer;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-09T03:00:00Z'));
    useHealthVisualQaStore.getState().setEnabled(false);
    mockTab = 'records';
    mockLoading = false;
    mockError = null;
    mockSeason = 'autumn';
    mockFontScale = 1;
    mockData = fixture();
    jest.clearAllMocks();
    usePetStore.setState({
      pets: [{ id: 'qa', name: '누리', weightKg: 5.3 }],
      selectedPetId: 'qa',
    });
  });
  afterEach(() => {
    act(() => renderer?.unmount());
    useHealthVisualQaStore.getState().setEnabled(false);
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  async function mount() {
    await act(async () => {
      renderer = TestRenderer.create(
        <QueryClientProvider client={new QueryClient()}>
          <ThemeProvider theme={createTheme('light')}>
            <HealthReportScreen />
          </ThemeProvider>
        </QueryClientProvider>,
      );
    });
  }
  const output = () => JSON.stringify(renderer.toJSON());
  const button = (label: string) =>
    renderer.root
      .findAllByType(RN.TouchableOpacity)
      .find(node => node.props.accessibilityLabel === label);

  const glassPanels = () =>
    renderer.root.findAll(
      node => node.type === ('NativeBlurView' as React.ElementType),
    );

  it.each([
    { speciesDisplayName: '말티즈', breed: '푸들', expected: '4살 · 말티즈' },
    { speciesDisplayName: '강아지', breed: '말티즈', expected: '4살 · 말티즈' },
    {
      speciesDisplayName: undefined,
      breed: '말티즈',
      expected: '4살 · 말티즈',
    },
    { speciesDisplayName: '강아지', breed: 'dog', expected: '4살' },
  ])(
    'shows saved detailed breed without a generic species substitute: $expected',
    async ({ speciesDisplayName, breed, expected }) => {
      usePetStore.setState({
        pets: [
          {
            id: 'qa',
            name: '누리',
            species: 'dog',
            speciesKey: 'DOG',
            birthDate: '2023-01-02',
            speciesDisplayName,
            breed,
          },
        ],
      });
      mockFontScale = 1.5;
      await mount();
      const detail = renderer.root.findAllByProps({
        testID: 'health-pet-detail',
      })[0];
      expect(detail.props.children).toBe(expected);
      expect(detail.props.numberOfLines).toBeUndefined();
      expect(RN.StyleSheet.flatten(detail.props.style)).toMatchObject({
        maxWidth: '100%',
        flexShrink: 1,
      });
      expect(usePetStore.getState().pets[0].breed).toBe(breed);
    },
  );

  it('omits unknown age and breed rather than inventing profile metadata', async () => {
    await mount();
    expect(
      renderer.root.findAllByProps({ testID: 'health-pet-detail' }),
    ).toHaveLength(0);
    expect(output()).toContain('누리');
  });

  it('retains the seasonal background in the no-pet state without decoration taking focus', async () => {
    usePetStore.setState({ pets: [], selectedPetId: null });
    await mount();
    expect(output()).toContain('먼저 아이 프로필이 필요해요');
    const background = renderer.root.findAllByProps({
      testID: 'seasonal-ambient-background',
    })[0];
    expect(background.props.pointerEvents).toBe('none');
    expect(background.props.importantForAccessibility).toBe(
      'no-hide-descendants',
    );
  });

  it.each(['autumn', 'winter', 'spring', 'summer'])(
    'uses three non-nested insight glass panels with real chart data: %s',
    async season => {
      mockSeason = season;
      mockTab = 'report';
      await mount();
      expect(glassPanels().map(node => node.props.testID)).toEqual([
        'health-insight-summary-glass',
        'health-insight-dates-glass',
        'health-insight-weight-glass',
      ]);
      for (const panel of glassPanels()) {
        expect(RN.StyleSheet.flatten(panel.props.style)).toMatchObject({
          padding: 14,
          marginTop: 12,
          elevation: 0,
        });
        expect(panel.children.some(child => typeof child === 'object')).toBe(
          true,
        );
        let parent = panel.parent;
        while (parent) {
          expect(parent.type).not.toBe('NativeBlurView');
          parent = parent.parent;
        }
      }
      expect(
        glassPanels()[2].findAllByProps({ logs: mockData.weightTimeline })
          .length,
      ).toBeGreaterThan(0);
      expect(
        glassPanels()[2].findAllByProps({ logs: mockData.weightTimeline })[0]
          .props.accentColor,
      ).toBe(createTheme('light').colors.textPrimary);
    },
  );

  it.each([
    ['병원·진단 기록', 'hospital'], ['약·복약 기록', 'medicine'],
  ])('opens %s as an actual health record instead of a schedule', async (label, kind) => {
    await mount();
    await act(async () => button('건강 기록하기')?.props.onPress());
    const target = renderer.root.findAllByType(RN.TouchableOpacity).find(node =>
      node.findAll(child => child.props.children === label).length > 0,
    );
    expect(target).toBeDefined();
    await act(async () => target?.props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith('RecordCreate', expect.objectContaining({
      petId: 'qa', initialMainCategory: 'health', initialHealthRecordKind: kind,
    }));
  });

  it('shows hundredths of a kilogram without rounding a small increase to zero', async () => {
    mockTab = 'weight';
    mockData.weightSummary = {
      ...mockData.weightSummary,
      latestWeightKg: 5.31,
      deltaKg: 0.01,
      deltaRate: 0.2,
    };
    await mount();
    expect(output()).toContain('5.31kg');
    expect(output()).toContain('+0.01kg');
    expect(output()).not.toContain('+0.0kg');
  });

  it('groups weight summary/chart and editable history in two glass panels', async () => {
    mockTab = 'weight';
    await mount();
    expect(glassPanels().map(node => node.props.testID)).toEqual([
      'health-weight-summary-glass',
      'health-weight-history-glass',
    ]);
    expect(
      glassPanels()[0].findAllByProps({ logs: mockData.weightTimeline }).length,
    ).toBeGreaterThan(0);
    expect(
      glassPanels()[0].findAllByProps({ logs: mockData.weightTimeline })[0]
        .props.accentColor,
    ).toBe(createTheme('light').colors.textPrimary);
    expect(button('2026-10-09, 5.3kg, 체중 기록 수정')).toBeDefined();
    const addWeight = renderer.root
      .findAllByProps({ accessibilityLabel: '체중 기록 추가' })
      .find(node => typeof node.props.onPress === 'function');
    expect(addWeight).toBeDefined();
    await act(async () => addWeight?.props.onPress());
    expect(
      renderer.root.find(
        node => node.type === ('WeightLogEntrySheet' as React.ElementType),
      ).props.visible,
    ).toBe(true);
  });

  it('keeps sample records and reminder actions out of real destinations and services', async () => {
    const fetch = jest.spyOn(schedules, 'fetchScheduleById');
    const update = jest.spyOn(schedules, 'updateSchedule');
    useHealthVisualQaStore.getState().setEnabled(true);
    await mount();
    const row = button('정기 검진, 오후 2:00 · 30분 전 알림, 상세 보기');
    const reminder = renderer.root
      .findAllByProps({ accessibilityLabel: '알림 끄기' })
      .find(node => typeof node.props.onPress === 'function');
    expect(row).toBeDefined();
    expect(reminder).toBeDefined();
    await act(async () => row?.props.onPress());
    await act(async () =>
      reminder?.props.onPress({ stopPropagation: jest.fn() }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    await act(async () => useHealthVisualQaStore.getState().setEnabled(false));
    expect(output()).toContain('건강 관찰');
    expect(output()).not.toContain('정기 검진');
    expect(mockData.activityItems).toHaveLength(1);
  });

  it('cannot open a real weight editor from a sample row', async () => {
    mockTab = 'weight';
    useHealthVisualQaStore.getState().setEnabled(true);
    await mount();
    const edit = button('2026-10-09, 5.3kg, 체중 기록 수정');
    expect(edit).toBeDefined();
    await act(async () => edit?.props.onPress());
    const sheet = renderer.root.find(
      node => node.type === ('WeightLogEntrySheet' as React.ElementType),
    );
    expect(sheet.props.visible).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('keeps actual date navigation and the same memory destination', async () => {
    await mount();
    expect(output()).toContain('건강 관찰');
    expect(output()).not.toContain('오늘의 시선이 머무는 날');
    await act(async () =>
      button('건강 관찰, 저장한 메모, 상세 보기')?.props.onPress(),
    );
    expect(mockNavigate).toHaveBeenCalledWith('AppTabs', {
      screen: 'TimelineTab',
      params: {
        screen: 'RecordDetail',
        params: {
          petId: 'qa',
          memoryId: 'a',
          entrySource: 'health_report',
        },
      },
    });
  });

  it('preserves tabs and limits the day picker to day-filtered records', async () => {
    await mount();
    expect(renderer.root.findAllByType(RN.FlatList)).toHaveLength(1);
    await act(async () =>
      renderer.root
        .findAllByType(RN.TouchableOpacity)
        .find(node => node.props.testID === 'health-tab-weight')
        ?.props.onPress(),
    );
    expect(renderer.root.findAllByType(RN.FlatList)).toHaveLength(0);
    expect(output()).toContain('5.3kg');
    expect(output()).toContain('이전 측정 대비');
    expect(output()).toContain('실제 메모');
    await act(async () =>
      button('2026-10-09, 5.3kg, 체중 기록 수정')?.props.onPress(),
    );
    const sheet = renderer.root.find(
      node => node.type === ('WeightLogEntrySheet' as React.ElementType),
    );
    expect(sheet.props.visible).toBe(true);
    expect(sheet.props.initialLog.id).toBe('weight:a');
  });

  it.each(['autumn', 'winter', 'spring', 'summer'])(
    'uses seasonal accent without changing pet data: %s',
    async season => {
      mockSeason = season;
      await mount();
      await act(async () => button('건강 기록하기')?.props.onPress());
      expect(output()).toContain('병원·진단 기록');
      expect(output()).toContain('약·복약 기록');
      expect(output()).toContain('병원·검진 일정');
      expect(output()).toContain('투약·복약 알림');
      expect(output()).not.toContain('HEALTH MANAGEMENT');
      expect(usePetStore.getState().selectedPetId).toBe('qa');
    },
  );

  it.each([1, 1.3, 1.5])(
    'keeps all four real metrics and drill-down at font scale %s',
    async fontScale => {
      mockTab = 'report';
      mockFontScale = fontScale;
      await mount();
      for (const [label, detail] of [
        ['건강 기록, 1건', '이번 달 병원, 약, 증상 기록'],
        ['기록한 날, 1일', '건강 이벤트와 체중 기록이 남은 날짜'],
        ['체중 기록, 1회', '이번 달 체중 체크 내역'],
        ['자주 남긴 기록, 증상 1건', '증상 기록 모아보기'],
      ]) {
        const metric = button(`${label}, 상세 보기`);
        expect(metric).toBeDefined();
        expect(
          metric?.findAllByProps({ name: 'chevron-right' }).length,
        ).toBeGreaterThan(0);
        expect(RN.StyleSheet.flatten(metric?.props.style).width).toBe(
          fontScale >= 1.3 ? '100%' : undefined,
        );
        await act(async () => metric?.props.onPress());
        expect(output()).toContain(detail);
        expect(button('인사이트 닫기')).toBeDefined();
        await act(async () => button('인사이트 닫기')?.props.onPress());
      }
      expect(renderer.root.findAllByType(RN.FlatList)).toHaveLength(0);
      await act(async () =>
        button('체중 기록, 1회, 상세 보기')?.props.onPress(),
      );
      expect(output()).toContain('이번 달 체중 체크 내역');
      expect(output()).toContain('실제 메모');
    },
  );

  it('distinguishes loading, failure with retry, and confirmed empty records', async () => {
    mockLoading = true;
    await mount();
    expect(output()).toContain('건강 리포트를 정리하고 있어요.');
    expect(output()).not.toContain('이날의 건강 기록이 없어요');
    mockLoading = false;
    mockError = '연결 확인';
    await act(async () =>
      renderer.update(
        <QueryClientProvider client={new QueryClient()}>
          <ThemeProvider theme={createTheme('light')}>
            <HealthReportScreen />
          </ThemeProvider>
        </QueryClientProvider>,
      ),
    );
    expect(output()).toContain('리포트를 불러오지 못했어요');
    mockError = null;
    mockData = { ...fixture(), activityItems: [], groupedActivities: {} };
    await act(async () =>
      renderer.update(
        <QueryClientProvider client={new QueryClient()}>
          <ThemeProvider theme={createTheme('light')}>
            <HealthReportScreen />
          </ThemeProvider>
        </QueryClientProvider>,
      ),
    );
    expect(output()).toContain('이날의 건강 기록이 없어요');
  });
});

describe('shared seasonal background', () => {
  let renderer: TestRenderer.ReactTestRenderer;
  afterEach(() => act(() => renderer?.unmount()));

  it('keeps Timeline light surfaces legible without changing the app theme', async () => {
    const theme = createTheme('dark');
    await act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={theme}>
          <SeasonalAmbientBackground season="spring" appearance="light" />
        </ThemeProvider>,
      );
    });
    const canvas = renderer.root.findAllByProps({
      testID: 'seasonal-ambient-background',
    })[0];
    expect(RN.StyleSheet.flatten(canvas.props.style).backgroundColor).toBe(
      getHomeAmbientVisual('spring').canvasGradient[0],
    );
    expect(
      renderer.root.findAllByProps({ testID: 'seasonal-ambient-season-wash' }).length,
    ).toBeGreaterThan(0);
    expect(theme.mode).toBe('dark');
  });

  it.each<SeasonKey>(['autumn', 'winter', 'spring', 'summer'])(
    'reuses the Home palette with four static edge glints and no spheres: %s',
    async season => {
      await act(async () => {
        renderer = TestRenderer.create(
          <ThemeProvider theme={createTheme('light')}>
            <SeasonalAmbientBackground season={season} />
          </ThemeProvider>,
        );
      });
      const wash = renderer.root.findAllByProps({
        testID: 'seasonal-ambient-season-wash',
      })[0];
      expect(wash.props.colors).toEqual(
        getHomeAmbientVisual(season).canvasGradient,
      );
      expect(RN.StyleSheet.flatten(wash.props.style).opacity).toBe(1);
      expect(wash.props.start).toEqual({ x: 0, y: 0.5 });
      expect(wash.props.end).toEqual({ x: 1, y: 0.5 });
      expect(wash.props.locations).toEqual([0, 0.5, 1]);
      for (const color of wash.props.colors) {
        expect(color).toMatch(/^#[0-9A-F]{6}$/);
        expect(color).not.toBe('#FFFFFF');
      }
      const upperTint = renderer.root.findAllByProps({
        testID: 'seasonal-ambient-spring-upper-tint',
      });
      expect(upperTint).toHaveLength(0);
      const light = renderer.root.findAllByProps({
        testID: 'seasonal-ambient-center-light',
      })[0];
      expect(RN.StyleSheet.flatten(light.props.style)).toMatchObject({
        left: '43%',
        right: '43%',
        top: '38%',
        height: '24%',
      });
      expect(light.props.maskElement.props.colors).toEqual([
        'transparent',
        '#FFFFFF',
        '#FFFFFF',
        'transparent',
      ]);
      expect(light.props.children.props.colors[1]).toBe(
        'rgba(255,255,255,0.12)',
      );
      expect(
        renderer.root.findAllByProps({ testID: 'seasonal-ambient-soft-veil' }),
      ).toHaveLength(0);
      const background = renderer.root.findAllByProps({
        testID: 'seasonal-ambient-background',
      })[0];
      expect(background.props.pointerEvents).toBe('none');
      expect(background.props.accessibilityElementsHidden).toBe(true);
      expect(renderer.root.findAllByType(RN.Image)).toHaveLength(0);
      for (let index = 0; index < 4; index += 1) {
        const glint = renderer.root.findAllByProps({
          testID: `seasonal-ambient-glint-${index}`,
        })[0];
        const style = RN.StyleSheet.flatten(glint.props.style);
        expect(style.width).toBeGreaterThanOrEqual(9);
        expect(style.width).toBeLessThanOrEqual(15);
        expect(style.left ?? style.right).toMatch(/^(1\.5|2)%$/);
      }
    },
  );

  it.each<SeasonKey>(['autumn', 'winter', 'spring', 'summer'])(
    'does not put a bright Home canvas behind dark-theme text: %s',
    async season => {
      const theme = createTheme('dark');
      await act(async () => {
        renderer = TestRenderer.create(
          <ThemeProvider theme={theme}>
            <SeasonalAmbientBackground season={season} />
          </ThemeProvider>,
        );
      });
      expect(
        renderer.root.findAllByProps({ testID: 'seasonal-ambient-base' }),
      ).toHaveLength(0);
      expect(
        renderer.root.findAllByProps({
          testID: 'seasonal-ambient-center-light',
        }),
      ).toHaveLength(0);
      expect(
        renderer.root.findAllByProps({
          testID: 'seasonal-ambient-spring-upper-tint',
        }),
      ).toHaveLength(0);
      const background = renderer.root.findAllByProps({
        testID: 'seasonal-ambient-background',
      })[0];
      expect(
        RN.StyleSheet.flatten(background.props.style).backgroundColor,
      ).toBe(theme.colors.background);
      const wash = renderer.root.findAllByProps({
        testID: 'seasonal-ambient-season-wash',
      })[0];
      expect(RN.StyleSheet.flatten(wash.props.style).opacity).toBe(0.2);
    },
  );
});

describe('weight chart uses actual measured values', () => {
  it('has no synthetic data in the empty state', () => {
    expect(buildWeightChartModel([], 320).points).toEqual([]);
  });
  it('keeps order, dates and proportional zero-based geometry for small changes', () => {
    const logs = [5.2, 5.3, 5.3].map((weightKg, index) => ({
      id: String(index),
      measuredOn: `2026-10-0${index + 1}`,
      weightKg,
    }));
    const model = buildWeightChartModel(logs, 320);
    expect(model.ceiling).toBe(6);
    expect(model.points.map(point => point.id)).toEqual(['0', '1', '2']);
    expect(Math.abs(model.points[0].y - model.points[1].y)).toBeCloseTo(
      (112 * 0.1) / 6,
    );
    expect(model.points[1].y).toBe(model.points[2].y);
  });
  it('centers one measurement and excludes invalid numbers', () => {
    const samples = [NaN, -1, 5.3, Infinity].map((weightKg, index) => ({
      id: String(index),
      measuredOn: '2026-10-09',
      weightKg,
    }));
    expect(buildWeightChartModel(samples, 320).points).toEqual([
      expect.objectContaining({ x: 160, weightKg: 5.3 }),
    ]);
  });
  it('renders readable date/value alternatives without changing the data', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    const logs = [
      { id: 'a', measuredOn: '2026-10-08', weightKg: 5.2 },
      { id: 'b', measuredOn: '2026-10-09', weightKg: 5.3 },
    ];
    await act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <WeightTrendChart logs={logs} accentColor={createTheme('light').colors.textPrimary} />
        </ThemeProvider>,
      );
    });
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: '2026-10-09, 5.3킬로그램',
      }).length,
    ).toBeGreaterThan(0);
    expect(JSON.stringify(renderer.toJSON())).toContain('5.3');
    const segments = renderer.root.findAllByType(RN.View).filter(node => {
      const style = RN.StyleSheet.flatten(node.props.style);
      return style?.position === 'absolute' && style?.height === 3;
    });
    expect(segments).toHaveLength(1);
    expect(RN.StyleSheet.flatten(segments[0].props.style).backgroundColor).toBe(
      createTheme('light').colors.textPrimary,
    );
    expect(logs).toHaveLength(2);
    await act(async () => renderer.unmount());
  });
});
