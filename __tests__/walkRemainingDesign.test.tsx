import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AccessibilityInfo, Image, StyleSheet, View } from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import WalkView from '../src/screens/DevTest/walkPresentation/WalkView';

jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/components/icons/NuriFeatherIcon', () => 'Feather');
jest.mock('../src/components/icons/NuriSemanticIcon', () => 'SemanticIcon');
jest.mock(
  '../src/screens/DevTest/walkPresentation/WalkWeatherChip',
  () => 'WalkWeatherChip',
);

describe('remaining Walk presentation contracts', () => {
  let tree: Renderer.ReactTestRenderer;
  const primary = jest.fn(),
    finish = jest.fn();
  const props: React.ComponentProps<typeof WalkView> = {
    state: 'GPS_WEAK',
    petName: '여섯글자아이',
    season: 'autumn',
    preview: true,
    publicPreview: true,
    distanceM: '2430',
    activeMs: '1920000',
    busy: false,
    map: <View testID="public-map" />,
    insetTop: 24,
    insetBottom: 24,
    freeLook: false,
    error: false,
    qualityLabel: '확인 필요',
    onClose: jest.fn(),
    onQa: jest.fn(),
    onRecenter: jest.fn(),
    onPrimary: primary,
    onFinish: finish,
    onCancelFinish: jest.fn(),
  };
  const render = async (patch: Partial<typeof props> = {}) => {
    await act(async () => {
      tree = Renderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <WalkView {...props} {...patch} />
        </ThemeProvider>,
      );
    });
  };
  const host = (id: string) => tree.root.findAllByProps({ testID: id }).at(-1)!;
  const text = () =>
    tree.root
      .findAll(n => (n.type as unknown) === 'AppText')
      .map(n => n.props.children)
      .flat()
      .join(' ');
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
  });
  afterEach(async () => {
    if (tree) await act(async () => tree.unmount());
    jest.restoreAllMocks();
  });
  test.each(['GPS_WEAK', 'GPS_LOST'] as const)(
    '%s has text and an isolated loader, no illustration or center overlay',
    async state => {
      await render({ state });
      expect(tree.root.findAllByType(Image)).toHaveLength(0);
      expect(host('walk-signal-status')).toBeDefined();
      expect(host('walk-signal-progress')).toBeDefined();
      expect(
        tree.root.findAllByProps({ testID: 'walk-state-overlay' }),
      ).toHaveLength(0);
      expect(text()).toContain(
        state === 'GPS_WEAK'
          ? '정확한 지점만 골라 기록해요.'
          : '신호가 없는 구간은 거리로 더하지 않아요.',
      );
      expect(
        StyleSheet.flatten(host('walk-signal-status').props.style),
      ).not.toHaveProperty('position', 'absolute');
    },
  );
  test('acquiring uses contained illustration, truthful copy and unknown distance', async () => {
    await render({ state: 'GPS_ACQUIRING', distanceM: null, preview: false });
    expect(host('walk-acquiring-artwork').props.resizeMode).toBe('contain');
    expect(
      StyleSheet.flatten(host('walk-acquiring-artwork-frame').props.style),
    ).toMatchObject({ aspectRatio: 1.5, maxWidth: 320 });
    expect(text()).toContain('첫 위치를 확인하고 있어요.');
    expect(text()).not.toContain('GPS 기록 중');
    expect(host('walk-distance-value').props.children).toContain('—');
  });
  test('recovery shows one summary and requires explicit resume or finish', async () => {
    await render({ state: 'RECOVERY_REQUIRED' });
    expect(host('walk-recovery-artwork')).toBeDefined();
    expect(
      StyleSheet.flatten(host('walk-recovery-artwork-frame').props.style),
    ).toMatchObject({ aspectRatio: 2, maxWidth: 320 });
    expect(
      StyleSheet.flatten(host('walk-bottom-sheet').props.style).maxHeight,
    ).toBeGreaterThan(0);
    expect(
      tree.root.findAllByProps({ testID: 'walk-state-overlay' }),
    ).toHaveLength(0);
    expect(text()).toContain('이어가기를 누르기 전에는 기록하지 않아요.');
    expect(primary).not.toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
    await act(async () =>
      tree.root
        .find(
          n =>
            n.props.testID === 'walk-primary' &&
            typeof n.props.onPress === 'function',
        )
        .props.onPress(),
    );
    expect(primary).toHaveBeenCalledTimes(1);
    expect(finish).not.toHaveBeenCalled();
  });
  test('future result has fixed copy spacing and disabled fixture-only CTAs', async () => {
    await render({ state: 'FUTURE_RECORD_CTA_PREVIEW' });
    expect(host('walk-future-artwork').props.resizeMode).toBe('contain');
    expect(
      StyleSheet.flatten(host('walk-future-copy').props.style),
    ).toMatchObject({ paddingTop: 16, paddingBottom: 16, gap: 8 });
    expect(host('walk-future-record').props.accessibilityState.disabled).toBe(
      true,
    );
    expect(host('walk-future-later').props.accessibilityState.disabled).toBe(
      true,
    );
    expect(text()).not.toMatch(/서버 저장|XP|경험치|Lifetime/);
    expect(primary).not.toHaveBeenCalled();
  });
  test('reduced motion preserves a static signal indicator', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(true);
    await render();
    expect(host('walk-signal-progress-static')).toBeDefined();
  });
});
