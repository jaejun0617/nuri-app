import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AppState, Image, ScrollView, StyleSheet, View } from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { resolveCtaPalette, SEASON_CTA } from '../src/app/theme/ctaPalette';
import WalkView, {
  WalkAction,
} from '../src/screens/DevTest/walkPresentation/WalkView';
import WalkMapStage, {
  PetPosition,
} from '../src/screens/DevTest/walkPresentation/WalkMapStage';
import { PUBLIC_ROUTE } from '../src/screens/DevTest/walkPresentation/fixtures';
import { GALLERY_STATES } from '../src/screens/DevTest/walkPresentation/model';

let mockDimensions = { width: 384, height: 832, scale: 3, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockDimensions,
}));
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
jest.mock('react-native-maps', () => ({
  __esModule: true,
  default: 'MapView',
  Marker: 'Marker',
  Polyline: 'Polyline',
  PROVIDER_GOOGLE: 'google',
}));

describe('PO active Walk design candidate', () => {
  let tree: Renderer.ReactTestRenderer;
  const onPause = jest.fn(),
    onFinish = jest.fn(),
    onRecenter = jest.fn();
  const projectPoint = jest.fn().mockResolvedValue({ x: 120, y: 200 });
  const animateCamera = jest.fn();
  const mapProps: React.ComponentProps<typeof WalkMapStage> = {
    preview: true,
    personalPreview: true,
    page: null,
    accent: SEASON_CTA.autumn.primary,
    image: 'https://example.invalid/public-pet.png',
    mode: 'FOLLOW',
    recenterRevision: 0,
    paused: false,
    showRoute: true,
    onReady: jest.fn(),
    onLoaded: jest.fn(),
    onDrag: jest.fn(),
  };
  const props: React.ComponentProps<typeof WalkView> = {
    state: 'WALKING',
    petName: '누리',
    season: 'autumn',
    preview: true,
    distanceM: '2430',
    activeMs: '1920000',
    busy: false,
    map: <View testID="public-map-slot" />,
    insetTop: 24,
    insetBottom: 24,
    freeLook: false,
    error: false,
    qualityLabel: '위치 기록 품질: 양호',
    onClose: jest.fn(),
    onQa: jest.fn(),
    onRecenter,
    onPrimary: onPause,
    onFinish,
    onCancelFinish: jest.fn(),
  };
  const render = async (child: React.ReactElement) => {
    await act(async () => {
      tree = Renderer.create(
        <ThemeProvider theme={createTheme('light')}>{child}</ThemeProvider>,
        {
          createNodeMock: element =>
            (element.type as unknown) === 'MapView'
              ? { animateCamera, pointForCoordinate: projectPoint }
              : null,
        },
      );
    });
  };
  const host = (id: string) => tree.root.findAllByProps({ testID: id }).at(-1)!;
  const button = (id: string) =>
    tree.root.find(
      n =>
        n.props.testID === id &&
        typeof n.props.onPress === 'function' &&
        typeof n.props.style === 'function',
    );
  const text = () =>
    tree.root
      .findAll(n => (n.type as unknown) === 'AppText')
      .map(n => n.props.children)
      .flat()
      .join(' ');
  beforeEach(() => {
    jest.clearAllMocks();
    projectPoint.mockReset().mockResolvedValue({ x: 120, y: 200 });
    jest.spyOn(Image, 'prefetch').mockResolvedValue(true);
    mockDimensions = { width: 384, height: 832, scale: 3, fontScale: 1 };
  });
  afterEach(async () => {
    if (tree) await act(async () => tree.unmount());
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('uses the reference hierarchy with compact, non-width-scaled text', async () => {
    await render(<WalkView {...props} />);
    expect(host('walk-header-title').props.children).toBe('오늘의 산책');
    expect(host('walk-header-pet').props.children).toBe('누리와 함께');
    expect(
      StyleSheet.flatten(host('walk-header-title').props.style),
    ).toMatchObject({ fontSize: 18, lineHeight: 24 });
    expect(
      StyleSheet.flatten(host('walk-distance-value').props.style),
    ).toMatchObject({ fontSize: 28, lineHeight: 34 });
    expect(
      StyleSheet.flatten(host('walk-time-value').props.style),
    ).toMatchObject({ fontSize: 28, lineHeight: 34 });
    expect(text()).toContain('함께 걸은 거리');
    expect(text()).not.toContain('이번 산책 거리');
    expect(text()).not.toMatch(/\d+°|맑음|Lifetime|경험치|서버 저장/);
  });

  it.each(
    GALLERY_STATES.flatMap(state => [
      { state, publicPreview: false },
      { state, publicPreview: true },
    ]),
  )(
    'preserves state-specific weather visibility for $state with publicPreview=$publicPreview',
    async ({ state, publicPreview }) => {
      await render(
        <WalkView {...props} state={state} publicPreview={publicPreview} />,
      );
      const weather = tree.root.findAll(
        node =>
          typeof node.type === 'string' &&
          node.props.testID === 'walk-weather-chip',
      );
      if (['PRE_WALK', 'FINISH_CONFIRM', 'FINISHED_LOCAL'].includes(state)) {
        expect(weather).toHaveLength(0);
        if (state === 'PRE_WALK')
          expect(
            StyleSheet.flatten(host('walk-pre-emotional-copy').props.style),
          ).toMatchObject({ alignItems: 'center', marginTop: 12 });
        expect(
          tree.root.findAllByProps({ testID: 'walk-context-row' }),
        ).toHaveLength(0);
        return;
      }
      expect(weather).toHaveLength(1);
      expect(weather[0].props.accessibilityLabel).toMatch(/^날씨,/);
      expect(weather[0].props.accessibilityLabel).not.toContain('합성 날씨');
      expect(weather[0].props.accessibilityRole).toBe('text');
      const row = host('walk-context-row');
      expect(StyleSheet.flatten(row.props.style).flexDirection).toBe('row');
      expect(
        row.findAllByProps({ testID: 'walk-weather-chip' }).length,
      ).toBeGreaterThan(0);
      expect(
        row.findAllByProps({ testID: 'walk-supporting-copy' }).length,
      ).toBeGreaterThan(0);
    },
  );

  it.each(GALLERY_STATES)(
    '%s keeps product CTAs label-only without removing map/header tools',
    async state => {
      await render(<WalkView {...props} state={state} />);
      const actions = tree.root.findAllByType(WalkAction);
      if (
        [
          'PRE_WALK',
          'FINISH_CONFIRM',
          'FINISHED_LOCAL',
          'FUTURE_RECORD_CTA_PREVIEW',
        ].includes(state)
      ) {
        const id =
          state === 'FINISH_CONFIRM'
            ? 'walk-finish-confirm'
            : state === 'FUTURE_RECORD_CTA_PREVIEW'
            ? 'walk-future-record'
            : 'walk-primary';
        if (state === 'PRE_WALK')
          expect(host('walk-primary-label').props.children).toBe(
            '함께 산책 시작하기',
          );
        expect(
          (state === 'FUTURE_RECORD_CTA_PREVIEW'
            ? host(id)
            : button(id)
          ).findAll(node =>
            ['Feather', 'SemanticIcon'].includes(
              node.type as unknown as string,
            ),
          ),
        ).toHaveLength(0);
      } else expect(actions.length).toBeGreaterThan(0);
      for (const action of actions) {
        expect(action.props.icon).toBeUndefined();
        expect(
          action.findAll(node =>
            ['Feather', 'SemanticIcon'].includes(
              node.type as unknown as string,
            ),
          ),
        ).toHaveLength(0);
      }
      expect(host('walk-close').props.accessibilityLabel).toBe(
        '산책 화면 닫기',
      );
      expect(host('walk-qa-open').props.accessibilityLabel).toBe(
        'QA 정보 열기',
      );
    },
  );

  it.each([
    ['WALKING', 'GPS 신호 양호'],
    ['GPS_ACQUIRING', 'GPS 신호 대기'],
    ['GPS_WEAK', 'GPS 신호 약함'],
    ['GPS_LOST', 'GPS 신호 없음'],
    ['PAUSED', 'GPS 기록 일시정지'],
    ['RECOVERY_REQUIRED', '복구 대기'],
  ] as const)(
    '%s keeps its internal state but hides signal text behind the weather presentation',
    async (state, _label) => {
      await render(<WalkView {...props} state={state} />);
      expect(
        tree.root.findAllByProps({ testID: 'walk-gps-status' }),
      ).toHaveLength(0);
      expect(
        tree.root.findAllByProps({ testID: 'walk-weather-chip' }).length,
      ).toBeGreaterThan(0);
      expect(text()).not.toMatch(/GPS 기록 중|GPS 신호 양호|신호 대기/);
      if (state === 'GPS_WEAK' || state === 'GPS_LOST')
        expect(host('walk-signal-status')).toBeDefined();
    },
  );

  it('keeps only action labels and preserves separate pause, finish and recenter actions', async () => {
    await render(<WalkView {...props} />);
    expect(text()).not.toContain('거리 기록을 잠시 멈춰요');
    expect(text()).not.toContain('오늘의 산책을 마무리해요');
    expect(text()).not.toContain('기록은 계속돼요');
    expect(
      tree.root.findAll(n => ['paw', 'walk', 'clock'].includes(n.props.name)),
    ).toHaveLength(0);
    await act(async () => button('walk-primary').props.onPress());
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
    await act(async () => button('walk-finish').props.onPress());
    expect(onFinish).toHaveBeenCalledTimes(1);
    await act(async () => button('walk-recenter').props.onPress());
    expect(onRecenter).toHaveBeenCalledTimes(1);
    for (const id of ['walk-primary', 'walk-finish']) {
      expect(
        StyleSheet.flatten(button(id).props.style({ pressed: false }))
          .minHeight,
      ).toBeGreaterThanOrEqual(56);
      expect(host(id).props.accessibilityRole).toBe('button');
    }
  });

  it('centers the resume label and keeps the original touch height around the thinner button', async () => {
    await render(<WalkView {...props} state="PAUSED" />);
    expect(text()).toContain('산책 계속하기');
    expect(text()).not.toContain('잠시 쉬는 중');
    expect(host('walk-supporting-copy').props.children).toBe(
      '시간과 거리 기록을 멈췄어요',
    );
    expect(
      host('walk-context-row').findAllByProps({
        testID: 'walk-supporting-copy',
      }).length,
    ).toBeGreaterThan(0);
    expect(
      host('walk-context-row').findAllByProps({ testID: 'walk-weather-chip' })
        .length,
    ).toBeGreaterThan(0);
    expect(text()).not.toContain('준비되면 다시 걸어요');
    const target = StyleSheet.flatten(
      button('walk-primary').props.style({ pressed: false }),
    );
    expect(target).toMatchObject({ minHeight: 84, paddingVertical: 0 });
    expect(
      tree.root.findAllByProps({ testID: 'walk-primary-icon-slot' }),
    ).toHaveLength(0);
    expect(
      StyleSheet.flatten(host('walk-primary-label').props.style),
    ).toMatchObject({
      textAlign: 'center',
      fontSize: 15,
      lineHeight: 21,
    });
    expect(
      StyleSheet.flatten(host('walk-primary-face').props.style),
    ).toMatchObject({ minHeight: 48, paddingVertical: 6 });
  });

  it.each(['spring', 'summer', 'autumn', 'winter'] as const)(
    '%s uses canonical accent and unchanged compact geometry',
    async season => {
      await render(<WalkView {...props} season={season} />);
      const action = StyleSheet.flatten(host('walk-primary-face').props.style);
      expect(action.backgroundColor).toBe(SEASON_CTA[season].primary);
      expect(action.borderColor).toBe(SEASON_CTA[season].primary);
      expect(action).toMatchObject({
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 6,
      });
      expect(
        tree.root.findAllByProps({ testID: 'walk-primary-icon' }),
      ).toHaveLength(0);
      const theme = createTheme('light');
      const finish = resolveCtaPalette({
        role: 'destructiveConfirm',
        season,
        colorScheme: theme.mode,
        colors: theme.colors,
      });
      expect(
        StyleSheet.flatten(host('walk-finish-face').props.style),
      ).toMatchObject({
        backgroundColor: finish.background,
        borderColor: finish.border,
      });
      expect(
        StyleSheet.flatten(host('walk-finish-label').props.style).color,
      ).toBe(finish.text);
      const pressedFace = button('walk-finish').props.children({
        pressed: true,
      });
      expect(StyleSheet.flatten(pressedFace.props.style).backgroundColor).toBe(
        resolveCtaPalette({
          role: 'destructiveConfirm',
          season,
          colorScheme: theme.mode,
          colors: theme.colors,
          state: 'pressed',
        }).background,
      );
      expect(
        StyleSheet.flatten(host('walk-distance-value').props.style).fontSize,
      ).toBe(28);
      expect(
        StyleSheet.flatten(host('walk-bottom-sheet').props.style),
      ).toMatchObject({ borderTopLeftRadius: 28, borderTopRightRadius: 28 });
    },
  );

  it.each(
    GALLERY_STATES.filter(
      state =>
        state !== 'FINISH_CONFIRM' && state !== 'FUTURE_RECORD_CTA_PREVIEW',
    ).flatMap(state =>
      (['spring', 'summer', 'autumn', 'winter'] as const).map(season => ({
        state,
        season,
      })),
    ),
  )(
    '$state uses the canonical $season primary CTA without changing the action',
    async ({ state, season }) => {
      await render(<WalkView {...props} state={state} season={season} />);
      const id = 'walk-primary';
      const action = button(id);
      const faceStyle = (pressed: boolean) =>
        ['FINISHED_LOCAL', 'FUTURE_RECORD_CTA_PREVIEW', 'PRE_WALK'].includes(
          state,
        )
          ? StyleSheet.flatten(action.props.style({ pressed }))
          : StyleSheet.flatten(action.props.children({ pressed }).props.style);
      expect(faceStyle(false).backgroundColor).toBe(SEASON_CTA[season].primary);
      expect(faceStyle(true).backgroundColor).toBe(SEASON_CTA[season].pressed);
      expect(StyleSheet.flatten(host(`${id}-label`).props.style)).toMatchObject(
        {
          color: '#FFFFFF',
          fontSize: ['FINISHED_LOCAL', 'FUTURE_RECORD_CTA_PREVIEW'].includes(
            state,
          )
            ? 13
            : 15,
          lineHeight: ['FINISHED_LOCAL', 'FUTURE_RECORD_CTA_PREVIEW'].includes(
            state,
          )
            ? 20
            : 21,
        },
      );
      expect(tree.root.findAllByProps({ testID: `${id}-icon` })).toHaveLength(
        0,
      );
      const label = host(id).props.accessibilityLabel;
      expect(label).toBe(
        state === 'PRE_WALK'
          ? '함께 산책 시작하기'
          : state === 'PAUSED'
          ? '산책 계속하기'
          : state === 'RECOVERY_REQUIRED'
          ? '산책 이어가기'
          : ['FINISHED_LOCAL', 'FUTURE_RECORD_CTA_PREVIEW'].includes(state)
          ? '산책 화면 닫기'
          : '잠시 쉬기',
      );
      for (const future of tree.root
        .findAllByType(WalkAction)
        .filter(node => node.props.disabled)) {
        expect(future.props.onPress).toBeUndefined();
      }
    },
  );

  it('keeps busy start CTAs disabled rather than painting them as available seasonal actions', async () => {
    await render(<WalkView {...props} state="PRE_WALK" busy />);
    const theme = createTheme('light');
    const disabled = resolveCtaPalette({
      role: 'primary',
      season: 'autumn',
      colorScheme: theme.mode,
      colors: theme.colors,
      state: 'disabled',
    });
    expect(host('walk-primary').props.accessibilityState.disabled).toBe(true);
    expect(
      StyleSheet.flatten(button('walk-primary').props.style({ pressed: false }))
        .backgroundColor,
    ).toBe(disabled.background);
  });

  it('centers both metric labels and their values in equal-width areas', async () => {
    await render(<WalkView {...props} />);
    for (const id of [
      'walk-distance-label',
      'walk-time-label',
      'walk-distance-value',
      'walk-time-value',
    ]) {
      expect(StyleSheet.flatten(host(id).props.style).textAlign).toBe('center');
    }
    for (const id of ['walk-distance-group', 'walk-time-group']) {
      expect(StyleSheet.flatten(host(id).props.style)).toMatchObject({
        flex: 1,
        alignItems: 'center',
      });
    }
  });

  it('places the walking copy beside weather without the redundant walking title', async () => {
    await render(<WalkView {...props} />);
    expect(text()).not.toContain('누리와 걷는 중');
    expect(text()).not.toContain('함께 걷는 중');
    const row = host('walk-context-row');
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({
      flexDirection: 'row',
      alignItems: 'center',
    });
    expect(
      row.findAllByProps({ testID: 'walk-supporting-copy' }).length,
    ).toBeGreaterThan(0);
    expect(
      row.findAllByProps({ testID: 'walk-weather-chip' }).length,
    ).toBeGreaterThan(0);
    expect(host('walk-supporting-copy').props.children).toBe(
      '우리의 걸음이 차곡차곡 쌓이고 있어요.',
    );
  });

  it('places acquiring copy beside weather without the preparation title', async () => {
    await render(<WalkView {...props} state="GPS_ACQUIRING" />);
    expect(text()).not.toContain('산책 준비 중');
    expect(host('walk-supporting-copy').props.children).toBe(
      '함께 걸을 준비를 하고 있어요.',
    );
    const row = host('walk-context-row');
    expect(
      row.findAllByProps({ testID: 'walk-supporting-copy' }).length,
    ).toBeGreaterThan(0);
    expect(
      row.findAllByProps({ testID: 'walk-weather-chip' }).length,
    ).toBeGreaterThan(0);
  });

  it('keeps long names bounded, safe area scrollable and controls stacked at fontScale 1.3', async () => {
    mockDimensions = { width: 360, height: 780, scale: 3, fontScale: 1.3 };
    await render(
      <WalkView
        {...props}
        petName="우리집에서가장사랑스러운누리의아주긴이름"
      />,
    );
    expect(host('walk-header-pet').props.numberOfLines).toBe(2);
    expect(
      StyleSheet.flatten(host('walk-controls').props.style).flexDirection,
    ).toBe('column');
    expect(tree.root.findAllByType(ScrollView).length).toBeGreaterThan(0);
    expect(
      StyleSheet.flatten(host('walk-controls').props.style).paddingBottom,
    ).toBe(36);
    let ancestor = button('walk-primary').parent;
    while (ancestor) {
      expect(ancestor.type).not.toBe(ScrollView);
      ancestor = ancestor.parent;
    }
    expect(
      StyleSheet.flatten(host('walk-bottom-sheet').props.style).maxHeight,
    ).toBeLessThanOrEqual(780 * 0.56);
    expect(host('walk-distance-value').props.allowFontScaling).not.toBe(false);
    expect(
      StyleSheet.flatten(host('walk-context-row').props.style).flexDirection,
    ).toBe('row');
  });

  it('keeps the pet marker fully circular, centered and safe on image failure', async () => {
    await render(
      <PetPosition
        accent={SEASON_CTA.autumn.primary}
        image="https://example.invalid/public-pet.png"
      />,
    );
    const ring = StyleSheet.flatten(host('walk-pet-ring').props.style);
    expect(ring.width).toBe(36);
    expect(ring.width).toBe(ring.height);
    expect(ring.borderRadius ?? ring.borderTopLeftRadius).toBe(ring.width / 2);
    expect(ring.overflow).toBe('hidden');
    const image = tree.root.findByType(Image);
    expect(image.props.style).toMatchObject({
      width: 28,
      height: 28,
      borderRadius: 14,
    });
    expect(image.props.resizeMode).toBe('cover');
    await act(async () => image.props.onError());
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    expect(
      tree.root.findAll(n => n.props.name === 'paw').length,
    ).toBeGreaterThan(0);
  });

  it('does not confuse a cached URI with a photo rendered by the native Image view', async () => {
    const onStatus = jest.fn();
    await render(
      <PetPosition
        accent={SEASON_CTA.autumn.primary}
        image="https://example.invalid/public-pet.png"
        onImageStatus={onStatus}
      />,
    );
    expect(onStatus).toHaveBeenLastCalledWith('LOADING');
    expect(Image.prefetch).not.toHaveBeenCalled();
    expect(
      tree.root.findAll(n => n.props.name === 'paw').length,
    ).toBeGreaterThan(0);
    await act(async () => tree.root.findByType(Image).props.onLoad());
    expect(onStatus).toHaveBeenLastCalledWith('LOADED');
    expect(tree.root.findAll(n => n.props.name === 'paw')).toHaveLength(0);
    expect(tree.root.findByType(Image).props.source.uri).toBe(
      'https://example.invalid/public-pet.png',
    );
  });

  it('renders the pet photo outside the map snapshot renderer at the SDK projected point', async () => {
    await render(
      <WalkMapStage
        preview
        personalPreview
        page={null}
        accent={SEASON_CTA.autumn.primary}
        image="https://example.invalid/public-pet.png"
        mode="FOLLOW"
        recenterRevision={0}
        paused={false}
        showRoute
        onReady={jest.fn()}
        onLoaded={jest.fn()}
        onDrag={jest.fn()}
      />,
    );
    const map = tree.root.findAll(n => (n.type as unknown) === 'MapView')[0];
    await act(async () => map.props.onMapReady());
    expect(projectPoint).toHaveBeenCalled();
    let ancestor = tree.root.findByType(Image).parent;
    while (ancestor) {
      expect(ancestor.type as unknown).not.toBe('MapView');
      expect(ancestor.type as unknown).not.toBe('Marker');
      ancestor = ancestor.parent;
    }
    const markerStyle = StyleSheet.flatten(
      host('walk-fixture-marker').props.style,
    );
    expect(markerStyle.transform).toEqual([
      { translateX: 102 },
      { translateY: 182 },
    ]);
    expect(host('walk-pet-overlay').props.pointerEvents).toBe('none');
  });

  it('uses a neutral dark map without turning on the map SDK location source', async () => {
    await render(
      <WalkMapStage
        preview
        page={null}
        accent={SEASON_CTA.autumn.primary}
        image={null}
        mode="FOLLOW"
        recenterRevision={0}
        paused={false}
        showRoute
        onReady={jest.fn()}
        onLoaded={jest.fn()}
        onDrag={jest.fn()}
      />,
    );
    const map = tree.root.findAll(n => (n.type as unknown) === 'MapView')[0];
    expect(map.props.customMapStyle.length).toBeGreaterThan(0);
    expect(map.props.showsUserLocation).toBe(false);
    expect(map.props.mapPadding.bottom).toBe(28);
    expect(
      tree.root.findAll(n => (n.type as unknown) === 'Marker'),
    ).toHaveLength(1);
    expect(
      StyleSheet.flatten(host('walk-fixture-marker').props.style),
    ).toMatchObject({
      width: 36,
      height: 36,
    });
  });

  it('coalesces camera motion to 20Hz at most and never polls when the map is still', async () => {
    jest.useFakeTimers();
    await render(<WalkMapStage {...mapProps} />);
    const map = tree.root.findAll(n => (n.type as unknown) === 'MapView')[0];
    expect(projectPoint).not.toHaveBeenCalled();
    await act(async () => map.props.onMapReady());
    expect(projectPoint).toHaveBeenCalledTimes(1);
    projectPoint.mockResolvedValue({ x: 75, y: 90 });
    await act(async () => {
      for (let i = 0; i < 30; i++) map.props.onRegionChange();
      map.props.onRegionChangeComplete();
      jest.advanceTimersByTime(49);
    });
    expect(projectPoint).toHaveBeenCalledTimes(1);
    await act(async () => jest.advanceTimersByTime(1));
    expect(projectPoint).toHaveBeenCalledTimes(2);
    expect(
      StyleSheet.flatten(host('walk-fixture-marker').props.style).transform,
    ).toEqual([{ translateX: 57 }, { translateY: 72 }]);
    await act(async () => jest.advanceTimersByTime(5000));
    expect(projectPoint).toHaveBeenCalledTimes(2);
  });

  it('ignores a late preview projection after switching to the actual filtered target', async () => {
    let resolveOld: ((point: { x: number; y: number }) => void) | undefined;
    projectPoint.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveOld = resolve;
        }),
    );
    await render(<WalkMapStage {...mapProps} />);
    const map = tree.root.findAll(n => (n.type as unknown) === 'MapView')[0];
    await act(async () => map.props.onMapReady());
    projectPoint.mockResolvedValue({ x: 60, y: 80 });
    await act(async () =>
      tree.update(
        <ThemeProvider theme={createTheme('light')}>
          <WalkMapStage
            {...mapProps}
            preview={false}
            displayLocation={PUBLIC_ROUTE[0]}
          />
        </ThemeProvider>,
      ),
    );
    expect(projectPoint).toHaveBeenLastCalledWith(PUBLIC_ROUTE[0]);
    const expected = [{ translateX: 42 }, { translateY: 62 }];
    expect(
      StyleSheet.flatten(host('walk-actual-marker').props.style).transform,
    ).toEqual(expected);
    await act(async () => resolveOld?.({ x: 999, y: 999 }));
    expect(
      StyleSheet.flatten(host('walk-actual-marker').props.style).transform,
    ).toEqual(expected);
    expect(
      tree.root.findAllByProps({ testID: 'walk-fixture-marker' }),
    ).toHaveLength(0);
  });

  it('hides an unavailable projection rather than substituting a screen-center location', async () => {
    jest.useFakeTimers();
    projectPoint.mockRejectedValueOnce(new Error('SDK projection unavailable'));
    await render(<WalkMapStage {...mapProps} />);
    const map = tree.root.findAll(n => (n.type as unknown) === 'MapView')[0];
    await act(async () => map.props.onMapReady());
    expect(
      StyleSheet.flatten(host('walk-fixture-marker').props.style).opacity,
    ).toBe(0);
    await act(async () => {
      map.props.onRegionChangeComplete();
      jest.advanceTimersByTime(50);
    });
    expect(
      StyleSheet.flatten(host('walk-fixture-marker').props.style).opacity,
    ).toBe(1);
  });

  it('cancels queued projection work when a session loses its filtered fix', async () => {
    jest.useFakeTimers();
    await render(<WalkMapStage {...mapProps} />);
    const map = tree.root.findAll(n => (n.type as unknown) === 'MapView')[0];
    await act(async () => map.props.onMapReady());
    await act(async () => map.props.onRegionChange());
    await act(async () =>
      tree.update(
        <ThemeProvider theme={createTheme('light')}>
          <WalkMapStage {...mapProps} preview={false} page={null} />
        </ThemeProvider>,
      ),
    );
    await act(async () => jest.advanceTimersByTime(500));
    expect(projectPoint).toHaveBeenCalledTimes(1);
    expect(
      tree.root.findAllByProps({ testID: 'walk-pet-overlay' }),
    ).toHaveLength(0);
  });

  it('keeps free-look camera ownership while reprojecting the pet and restores explicit follow', async () => {
    await render(<WalkMapStage {...mapProps} mode="FREE_LOOK" />);
    const map = tree.root.findAll(n => (n.type as unknown) === 'MapView')[0];
    await act(async () => map.props.onMapReady());
    expect(projectPoint).toHaveBeenCalled();
    expect(animateCamera).not.toHaveBeenCalled();
    await act(async () => map.props.onPanDrag());
    expect(mapProps.onDrag).toHaveBeenCalledTimes(1);
    await act(async () =>
      tree.update(
        <ThemeProvider theme={createTheme('light')}>
          <WalkMapStage {...mapProps} recenterRevision={1} />
        </ThemeProvider>,
      ),
    );
    expect(animateCamera).toHaveBeenLastCalledWith(
      { center: PUBLIC_ROUTE.at(-1), zoom: 17 },
      { duration: 250 },
    );
  });

  it('does not apply a reply for a camera that moved while projection was in flight', async () => {
    jest.useFakeTimers();
    await render(<WalkMapStage {...mapProps} />);
    const map = tree.root.findAll(n => (n.type as unknown) === 'MapView')[0];
    await act(async () => map.props.onMapReady());
    const before = StyleSheet.flatten(host('walk-fixture-marker').props.style);
    let resolveOld: (point: { x: number; y: number }) => void = () => {};
    projectPoint.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveOld = resolve;
        }),
    );
    await act(async () => {
      map.props.onRegionChange(undefined, { isGesture: true });
      jest.advanceTimersByTime(50);
    });
    await act(async () => {
      map.props.onRegionChange(undefined, { isGesture: true });
      resolveOld({ x: 999, y: 999 });
    });
    expect(
      StyleSheet.flatten(host('walk-fixture-marker').props.style).transform,
    ).toEqual(before.transform);
    projectPoint.mockResolvedValue({ x: 75, y: 90 });
    await act(async () => jest.advanceTimersByTime(50));
    expect(
      StyleSheet.flatten(host('walk-fixture-marker').props.style).transform,
    ).toEqual([{ translateX: 57 }, { translateY: 72 }]);
    expect(projectPoint).toHaveBeenCalledTimes(3);
    expect(
      projectPoint.mock.calls.every(
        ([point]) =>
          point.latitude === PUBLIC_ROUTE.at(-1)!.latitude &&
          point.longitude === PUBLIC_ROUTE.at(-1)!.longitude,
      ),
    ).toBe(true);
  });

  it('does not hide the photo for a stale camera projection failure', async () => {
    jest.useFakeTimers();
    await render(<WalkMapStage {...mapProps} />);
    const map = tree.root.findAll(n => (n.type as unknown) === 'MapView')[0];
    await act(async () => map.props.onMapReady());
    let rejectOld: (reason: Error) => void = () => {};
    projectPoint.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectOld = reject;
        }),
    );
    await act(async () => {
      map.props.onRegionChange();
      jest.advanceTimersByTime(50);
    });
    await act(async () => {
      map.props.onRegionChange();
      rejectOld(new Error('obsolete camera'));
    });
    expect(
      StyleSheet.flatten(host('walk-fixture-marker').props.style).opacity,
    ).toBe(1);
    await act(async () => jest.advanceTimersByTime(50));
    expect(projectPoint).toHaveBeenCalledTimes(3);
  });

  it.each(['onRegionChangeStart', 'onRegionChange', 'onRegionChangeComplete'])(
    '%s transfers zoom gestures to free-look and blocks follow before parent commit',
    async event => {
      await render(
        <WalkMapStage
          {...mapProps}
          preview={false}
          displayLocation={PUBLIC_ROUTE[0]}
        />,
      );
      const map = tree.root.findAll(n => (n.type as unknown) === 'MapView')[0];
      await act(async () => map.props.onMapReady());
      animateCamera.mockClear();
      // Google Maps marks pinch and double-tap camera changes as gestures too.
      await act(async () => map.props[event](undefined, { isGesture: true }));
      expect(mapProps.onDrag).toHaveBeenCalledTimes(1);
      await act(async () =>
        tree.update(
          <ThemeProvider theme={createTheme('light')}>
            <WalkMapStage
              {...mapProps}
              preview={false}
              displayLocation={PUBLIC_ROUTE[1]}
            />
          </ThemeProvider>,
        ),
      );
      expect(animateCamera).not.toHaveBeenCalled();
      await act(async () =>
        tree.update(
          <ThemeProvider theme={createTheme('light')}>
            <WalkMapStage
              {...mapProps}
              preview={false}
              displayLocation={PUBLIC_ROUTE[1]}
              recenterRevision={1}
            />
          </ThemeProvider>,
        ),
      );
      expect(animateCamera).toHaveBeenCalledTimes(1);
      expect(animateCamera).toHaveBeenLastCalledWith(
        { center: PUBLIC_ROUTE[1], zoom: 17 },
        { duration: 250 },
      );
    },
  );

  it('keeps programmatic camera updates in follow and coalesces user gesture ownership', async () => {
    await render(<WalkMapStage {...mapProps} />);
    const map = tree.root.findAll(n => (n.type as unknown) === 'MapView')[0];
    await act(async () => {
      map.props.onMapReady();
      map.props.onRegionChangeStart(undefined, { isGesture: false });
      map.props.onRegionChange(undefined, { isGesture: false });
      map.props.onRegionChangeComplete(undefined, { isGesture: false });
    });
    expect(mapProps.onDrag).not.toHaveBeenCalled();
    await act(async () => {
      map.props.onPanDrag();
      map.props.onRegionChangeStart(undefined, { isGesture: true });
      map.props.onRegionChange(undefined, { isGesture: true });
      map.props.onRegionChangeComplete(undefined, { isGesture: true });
    });
    expect(mapProps.onDrag).toHaveBeenCalledTimes(1);
  });

  it('keeps the loaded photo leaf and image props stable through parent and camera updates', async () => {
    const onStatus = jest.fn();
    await render(<WalkMapStage {...mapProps} onImageStatus={onStatus} />);
    const map = tree.root.findAll(n => (n.type as unknown) === 'MapView')[0];
    await act(async () => {
      map.props.onMapReady();
      tree.root.findByType(Image).props.onLoad();
    });
    const image = tree.root.findByType(Image);
    const source = image.props.source;
    onStatus.mockClear();
    await act(async () =>
      tree.update(
        <ThemeProvider theme={createTheme('light')}>
          <WalkMapStage
            {...mapProps}
            onImageStatus={onStatus}
            onReady={jest.fn()}
          />
        </ThemeProvider>,
      ),
    );
    await act(async () =>
      map.props.onRegionChange(undefined, { isGesture: false }),
    );
    expect(tree.root.findByType(Image)).toBe(image);
    expect(image.props.source).toBe(source);
    expect(onStatus).not.toHaveBeenCalled();
  });

  it('does not reproject or recreate the marker when the elapsed leaf ticks', async () => {
    jest.useFakeTimers();
    jest.replaceProperty(AppState, 'currentState', 'active');
    await render(
      <WalkView
        {...props}
        preview={false}
        clockSessionKey="public-marker-timer-test"
        clockRunning
        map={<WalkMapStage {...mapProps} />}
      />,
    );
    const map = tree.root.findAll(n => (n.type as unknown) === 'MapView')[0];
    await act(async () => {
      map.props.onMapReady();
      tree.root.findByType(Image).props.onLoad();
    });
    const image = tree.root.findByType(Image);
    const source = image.props.source;
    const calls = projectPoint.mock.calls.length;
    expect(host('walk-time-value').props.children).toBe('32:00');
    await act(async () => jest.advanceTimersByTime(3000));
    expect(host('walk-time-value').props.children).toBe('32:03');
    expect(projectPoint).toHaveBeenCalledTimes(calls);
    expect(tree.root.findByType(Image)).toBe(image);
    expect(image.props.source).toBe(source);
  });

  it.each(['spring', 'summer', 'autumn', 'winter'] as const)(
    'keeps the %s ring centered around the reduced photo and paw fallback',
    async season => {
      await render(
        <PetPosition accent={SEASON_CTA[season].primary} image={null} />,
      );
      const ring = StyleSheet.flatten(host('walk-pet-ring').props.style);
      expect(ring).toMatchObject({
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: SEASON_CTA[season].primary,
      });
      expect(tree.root.findAll(n => n.props.name === 'paw')).toHaveLength(1);
    },
  );

  it('resets photo readiness on profile change and blocks private photos in public preview', async () => {
    const onStatus = jest.fn();
    await render(<WalkMapStage {...mapProps} onImageStatus={onStatus} />);
    await act(async () => tree.root.findByType(Image).props.onLoad());
    expect(onStatus).toHaveBeenLastCalledWith('LOADED');
    await act(async () =>
      tree.update(
        <ThemeProvider theme={createTheme('light')}>
          <WalkMapStage
            {...mapProps}
            image="https://example.invalid/another-public-pet.png"
            onImageStatus={onStatus}
          />
        </ThemeProvider>,
      ),
    );
    expect(onStatus).toHaveBeenLastCalledWith('LOADING');
    await act(async () =>
      tree.update(
        <ThemeProvider theme={createTheme('light')}>
          <WalkMapStage
            {...mapProps}
            personalPreview={false}
            onImageStatus={onStatus}
          />
        </ThemeProvider>,
      ),
    );
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    expect(onStatus).toHaveBeenLastCalledWith('NONE');
    expect(Image.prefetch).not.toHaveBeenCalled();
  });
});
