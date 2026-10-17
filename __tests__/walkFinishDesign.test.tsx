import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AccessibilityInfo, Modal, StyleSheet, View } from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { SEASON_CTA } from '../src/app/theme/ctaPalette';
import WalkView from '../src/screens/DevTest/walkPresentation/WalkView';
import { getSeasonalWeatherVisualTheme } from '../src/theme/seasonal/weather';
import { buildPetThemePalette } from '../src/services/pets/themePalette';

let mockDimensions = { width: 384, height: 832, scale: 3, fontScale: 1 };
const mockScrollToEnd = jest.fn();
jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => {
  const runtime: typeof React = jest.requireActual('react');
  const Component = runtime.forwardRef(
    (props: { children?: React.ReactNode }, ref) => {
      runtime.useImperativeHandle(ref, () => ({
        scrollToEnd: mockScrollToEnd,
      }));
      return runtime.createElement('ScrollView', props, props.children);
    },
  );
  return { __esModule: true, default: Component };
});
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockDimensions,
}));
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/components/icons/NuriFeatherIcon', () => 'Feather');
jest.mock('../src/components/icons/NuriSemanticIcon', () => 'SemanticIcon');
jest.mock(
  '../src/screens/DevTest/walkPresentation/WalkWeatherChip',
  () => 'WalkWeatherChip',
);

describe('approved finish confirmation and device-local result redesign', () => {
  let tree: Renderer.ReactTestRenderer;
  const onFinish = jest.fn(),
    onCancel = jest.fn(),
    onCloseResult = jest.fn();
  const base: React.ComponentProps<typeof WalkView> = {
    state: 'FINISHED_LOCAL',
    petName: '누리',
    season: 'autumn',
    preview: true,
    publicPreview: true,
    distanceM: '2430',
    activeMs: '1920000',
    busy: false,
    map: <View testID="bounded-route-map" />,
    insetTop: 24,
    insetBottom: 24,
    freeLook: false,
    error: false,
    qualityLabel: '위치 기록 품질: 양호',
    onClose: jest.fn(),
    onQa: jest.fn(),
    onRecenter: jest.fn(),
    onPrimary: onCloseResult,
    onFinish,
    onCancelFinish: onCancel,
  };
  const node = (id: string) => tree.root.findAllByProps({ testID: id })[0];
  const text = () =>
    tree.root
      .findAll(n => (n.type as unknown) === 'AppText')
      .map(n => n.props.children)
      .flat()
      .filter(v => typeof v === 'string')
      .join(' ');
  const render = async (overrides: Partial<typeof base> = {}) => {
    await act(async () => {
      tree = Renderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <WalkView {...base} {...overrides} />
        </ThemeProvider>,
      );
    });
  };
  const press = async (id: string) =>
    act(async () => {
      node(id).props.onPress();
    });
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    mockDimensions = { width: 384, height: 832, scale: 3, fontScale: 1 };
  });
  afterEach(async () => {
    if (tree) await act(async () => tree.unmount());
    jest.restoreAllMocks();
  });

  test('finish confirmation is an illustrated bottom sheet, not a white center-map wash', async () => {
    await render({ state: 'FINISH_CONFIRM' });
    expect(node('walk-finish-sheet')).toBeDefined();
    expect(node('walk-finish-artwork').props.resizeMode).toBe('contain');
    expect(node('walk-finish-artwork').props.source).toBe(
      require('../src/assets/images/walk/finish-confirm-autumn-v1.png'),
    );
    expect(
      StyleSheet.flatten(node('walk-finish-artwork-frame').props.style),
    ).toMatchObject({ width: '100%', maxWidth: 264, aspectRatio: 2 });
    expect(text()).toContain('오늘 산책, 기분 좋게 마칠까요?');
    expect(
      tree.root.findAllByProps({ testID: 'walk-state-overlay' }),
    ).toHaveLength(0);
    expect(
      tree.root.findAllByType(
        'WalkWeatherChip' as unknown as React.ComponentType,
      ),
    ).toHaveLength(0);
    expect(text()).not.toMatch(/평균|위치 기록 품질|기기에 안전하게 남겨요/);
  });
  test.each(['FINISH_CONFIRM', 'FINISHED_LOCAL'] as const)(
    '%s keeps two compact columns and exact native summary values',
    async state => {
      await render({ state });
      expect(node('walk-distance-label').props.children).toBe('함께 걸은 거리');
      expect(node('walk-time-label').props.children).toBe('산책 시간');
      expect(text()).toContain('2.43');
      expect(text()).toContain('32:00');
      expect(
        StyleSheet.flatten(node('walk-distance-value').props.style).fontSize,
      ).toBe(22);
      expect(
        StyleSheet.flatten(node('walk-time-value').props.style).fontSize,
      ).toBe(22);
    },
  );
  test('finish and continue remain separate explicit choices with 48dp touch targets', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(true);
    await render({ state: 'FINISH_CONFIRM' });
    await press('walk-finish-confirm');
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    await press('walk-finish-cancel');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(
      StyleSheet.flatten(
        node('walk-finish-confirm').props.style({ pressed: false }),
      ).minHeight,
    ).toBeGreaterThanOrEqual(48);
  });
  test('busy finish blocks dismissal and duplicate finish; back never confirms', async () => {
    await render({ state: 'FINISH_CONFIRM', busy: true });
    await press('walk-finish-confirm');
    await act(async () => {
      tree.root.findByType(Modal).props.onRequestClose();
    });
    expect(onFinish).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
  test('local result is an image-led white page, with no map mounted by default', async () => {
    await render();
    expect(node('walk-result-screen')).toBeDefined();
    expect(node('walk-result-artwork').props.source).toBe(
      require('../src/assets/images/walk/finished-local-autumn-v1.png'),
    );
    expect(node('walk-result-artwork').props.resizeMode).toBe('contain');
    const artFrame = StyleSheet.flatten(
      node('walk-result-artwork-frame').props.style,
    );
    expect(artFrame).toMatchObject({ width: '100%', aspectRatio: 1402 / 1122 });
    expect(artFrame.height).toBeUndefined();
    expect(artFrame.maxHeight).toBeUndefined();
    expect(text()).toContain('우리, 오늘도 잘 다녀왔어요!');
    expect(text()).toContain('누리와 남긴 소중한 발자국');
    expect(text()).toContain('산책 결과를 기기에 저장했어요.');
    expect(
      tree.root.findAll(
        n =>
          (n.type as unknown) === 'View' &&
          n.props.testID === 'bounded-route-map',
      ),
    ).toHaveLength(0);
    expect(
      tree.root.findAllByProps({ testID: 'walk-state-overlay' }),
    ).toHaveLength(0);
    expect(text()).not.toMatch(
      /평균|위치 기록 품질|서버 저장|XP|경험치|Lifetime|Walk Level/,
    );
    expect(text()).not.toMatch(/합성 미리보기|합성 경로|합성 결과/);
  });
  test('route disclosure mounts only the existing bounded map and closes again', async () => {
    await render();
    await press('walk-result-route-toggle');
    expect(
      tree.root.findAll(
        n =>
          (n.type as unknown) === 'View' &&
          n.props.testID === 'bounded-route-map',
      ),
    ).toHaveLength(1);
    expect(
      node('walk-result-route-toggle').props.accessibilityState.expanded,
    ).toBe(true);
    await press('walk-result-route-toggle');
    expect(
      tree.root.findAllByProps({ testID: 'bounded-route-map' }),
    ).toHaveLength(0);
  });
  test('result exit keeps the existing close action, not an invented Home or record navigation', async () => {
    await render();
    await press('walk-primary');
    expect(onCloseResult).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
    expect(text()).not.toMatch(/홈으로|기록하고|경험치 받기/);
  });
  test('a result without a route cannot open a fake map', async () => {
    await render({ preview: false, routeAvailable: false });
    expect(node('walk-result-route-toggle').props.disabled).toBe(true);
    await press('walk-result-route-toggle');
    expect(
      tree.root.findAllByProps({ testID: 'walk-result-route' }),
    ).toHaveLength(0);
    expect(text()).toContain('표시할 경로가 없어요');
  });
  test('only an explicit quality warning appears on a result needing review', async () => {
    await render({ qualityNeedsReview: true });
    expect(text()).toContain('일부 구간의 위치 기록을 확인해야 해요.');
    expect(text()).not.toContain('위치 기록 품질: 양호');
  });
  test.each(['spring', 'summer', 'winter'] as const)(
    '%s reuses its own existing artwork, not autumn leaves',
    async season => {
      await render({ season });
      expect(node('walk-result-artwork').props.source).not.toBe(
        require('../src/assets/images/walk/finished-local-autumn-v1.png'),
      );
      expect(
        StyleSheet.flatten(node('walk-primary').props.style({ pressed: false }))
          .backgroundColor,
      ).toBe(SEASON_CTA[season].primary);
    },
  );
  test('long personalized name and fontScale 1.3 keep copy wrapping instead of truncating', async () => {
    mockDimensions = { width: 320, height: 640, scale: 3, fontScale: 1.3 };
    await render({ petName: '사랑스러운우리강아지' });
    expect(text()).toContain('사랑스러운우리강아지와 남긴 소중한 발자국');
    expect(node('walk-result-pet-copy').props.numberOfLines).toBeUndefined();
    expect(node('walk-result-pet-copy').props.allowFontScaling).not.toBe(false);
    expect(
      StyleSheet.flatten(node('walk-primary-label').props.style).fontSize,
    ).toBe(13);
  });
  test('expanding the route scrolls only after content layout and never on unrelated updates', async () => {
    await render();
    const body = node('walk-result-body');
    await act(async () => body.props.onContentSizeChange(384, 900));
    expect(mockScrollToEnd).not.toHaveBeenCalled();
    await press('walk-result-route-toggle');
    expect(mockScrollToEnd).not.toHaveBeenCalled();
    await act(async () =>
      node('walk-result-body').props.onContentSizeChange(384, 1140),
    );
    expect(mockScrollToEnd).toHaveBeenCalledTimes(1);
    expect(mockScrollToEnd).toHaveBeenLastCalledWith({ animated: true });
    await act(async () =>
      node('walk-result-body').props.onContentSizeChange(384, 1141),
    );
    expect(mockScrollToEnd).toHaveBeenCalledTimes(1);
    await press('walk-result-route-toggle');
    await act(async () =>
      node('walk-result-body').props.onContentSizeChange(384, 900),
    );
    expect(mockScrollToEnd).toHaveBeenCalledTimes(1);
  });
  test('reduced motion still reveals the full route without an animated scroll', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(true);
    await render();
    await press('walk-result-route-toggle');
    await act(async () =>
      node('walk-result-body').props.onContentSizeChange(384, 1100),
    );
    expect(mockScrollToEnd).toHaveBeenCalledWith({ animated: false });
  });
  test('small viewports constrain route height and disclose bounded partial routes', async () => {
    await render({ routePartial: true });
    await act(async () =>
      node('walk-result-body').props.onLayout({
        nativeEvent: { layout: { height: 180 } },
      }),
    );
    await press('walk-result-route-toggle');
    expect(
      StyleSheet.flatten(node('walk-result-route').props.style).height,
    ).toBeLessThanOrEqual(164);
    expect(text()).toContain('경로 일부를 표시하고 있어요.');
  });
  test.each(['spring', 'summer', 'autumn', 'winter'] as const)(
    '%s uses the approved weather accent deep tone for important result text',
    async season => {
      await render({ season });
      const accent = getSeasonalWeatherVisualTheme(season)!.card.accent;
      const deep = buildPetThemePalette(accent).deep;
      for (const id of [
        'walk-result-title',
        'walk-distance-value',
        'walk-time-value',
        'walk-result-route-label',
      ]) {
        expect(StyleSheet.flatten(node(id).props.style).color).toBe(deep);
      }
    },
  );
});
