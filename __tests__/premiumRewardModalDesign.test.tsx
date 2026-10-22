import React from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import PremiumRewardModal from '../src/components/common/PremiumRewardModal';
import { buildPremiumRewardLevelStatus } from '../src/services/activity/rewardNoticePresentation';
import { getResponsiveOverlayMaxHeight } from '../src/services/app/responsiveLayout';

let mockWindow = { width: 393, height: 852, scale: 3, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockWindow,
}));
jest.mock('../src/hooks/useOptionalSafeAreaInsets', () => ({
  useOptionalSafeAreaInsets: () => ({ top: 24, bottom: 18, left: 0, right: 0 }),
}));
type Props = React.ComponentProps<typeof PremiumRewardModal>;
const close = jest.fn();
const dismiss = jest.fn();
const defaults: Props = { visible: true, petName: '누리', xpAwarded: 39, totalXp: 835, level: 5, streakDays: 1, onClose: close, onDismissToday: dismiss };
let tree: TestRenderer.ReactTestRenderer | undefined;
function render(props: Partial<Props> = {}) {
  act(() => { tree = TestRenderer.create(<ThemeProvider theme={createTheme('light')}><PremiumRewardModal {...defaults} {...props} /></ThemeProvider>); });
  if (!tree) throw new Error('Reward modal missing');
  return tree;
}
function button(id: string) {
  const node = tree?.root.findAllByType(TouchableOpacity).find(item => item.props.testID === id);
  if (!node) throw new Error(`Missing reward action: ${id}`);
  return node;
}
function copy() {
  return tree?.root.findAllByType(Text).flatMap(node => React.Children.toArray(node.props.children)).filter(x => typeof x === 'string' || typeof x === 'number').join(' ') ?? '';
}
beforeEach(() => {
  jest.clearAllMocks();
  mockWindow = { width: 393, height: 852, scale: 3, fontScale: 1 };
});
afterEach(() => { act(() => tree?.unmount()); tree = undefined; });

describe('Reference reward modal design', () => {
  it('shows supplied award data and the existing policy, not a hardcoded balance', () => {
    const result = render();
    const status = buildPremiumRewardLevelStatus({ totalXp: 835, level: 5 });
    expect(copy()).toContain('+39 XP');
    expect(copy()).toContain('835');
    expect(copy()).toContain(status.statusLabel);
    const progress = result.root.findAllByProps({ testID: 'reward-level-progress' }).at(-1);
    expect(progress?.props.accessibilityValue).toMatchObject({ now: Math.round(status.progress * 100) });
    expect(result.root.findAllByType(Image).find(node => node.props.testID === 'reward-streak-brand')?.props.source).toEqual(require('../src/assets/logo/logo_v2.png'));
    expect(result.root.findAllByType(Image).find(node => node.props.testID === 'reward-illustration')?.props.source).toEqual(require('../src/assets/activity/growth-companion.png'));
  });

  it('does not save a suppression preference when the checkbox alone is toggled', () => {
    render();
    expect(button('reward-dismiss-today').props.accessibilityState.checked).toBe(false);
    act(() => button('reward-dismiss-today').props.onPress());
    expect(button('reward-dismiss-today').props.accessibilityState.checked).toBe(true);
    expect(dismiss).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    act(() => button('reward-confirm').props.onPress());
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
  });

  it('confirms normally without checking suppression and resets checkbox on reopening', () => {
    const result = render();
    act(() => button('reward-confirm').props.onPress());
    expect(close).toHaveBeenCalledTimes(1);
    expect(dismiss).not.toHaveBeenCalled();
    act(() => button('reward-dismiss-today').props.onPress());
    act(() => result.update(<ThemeProvider theme={createTheme('light')}><PremiumRewardModal {...defaults} visible={false} /></ThemeProvider>));
    expect(result.root.findAllByType(Modal)).toHaveLength(0);
    act(() => result.update(<ThemeProvider theme={createTheme('light')}><PremiumRewardModal {...defaults} /></ThemeProvider>));
    expect(button('reward-dismiss-today').props.accessibilityState.checked).toBe(false);
  });

  it('keeps close and Android Back from persisting an unchecked confirmation', () => {
    const result = render();
    act(() => button('reward-dismiss-today').props.onPress());
    act(() => button('reward-modal-close').props.onPress());
    act(() => result.root.findByType(Modal).props.onRequestClose());
    expect(close).toHaveBeenCalledTimes(2);
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('handles zero award, maximum level, no streak and absent suppression callback', () => {
    render({ xpAwarded: 0, totalXp: 1250000, level: 100, streakDays: 0, onDismissToday: undefined });
    expect(copy()).toContain('성장 기록 반영');
    expect(copy()).toContain('최고 레벨 달성');
    expect(tree?.root.findAllByProps({ testID: 'reward-streak-brand' })).toHaveLength(0);
    expect(tree?.root.findAllByProps({ testID: 'reward-dismiss-today' })).toHaveLength(0);
    act(() => button('reward-confirm').props.onPress());
    expect(close).toHaveBeenCalledTimes(1);
  });

  it.each([[320,568],[360,640],[393,852],[412,915],[430,932]])('bounds scrollable content and fixed actions at %sx%s', (width, height) => {
    mockWindow = { width, height, fontScale: 1.6, scale: 3 };
    const result = render({ message: '내용이 긴 경우에도 본문은 스크롤되고 확인 버튼은 접근할 수 있어요.' });
    const card = result.root.findAllByProps({ testID: 'reward-modal-card' }).at(-1);
    expect(StyleSheet.flatten(card?.props.style)).toMatchObject({ maxHeight: getResponsiveOverlayMaxHeight({ windowHeight: height, topInset: 24, bottomInset: 18, verticalMargin: 20 }) });
    expect(result.root.findAllByType(ScrollView)).toHaveLength(1);
    expect(StyleSheet.flatten(button('reward-confirm').props.style)).toMatchObject({ minHeight: 48 });
    expect(StyleSheet.flatten(button('reward-dismiss-today').props.style)).toMatchObject({ minHeight: 48 });
    expect(card?.props.accessibilityViewIsModal).toBe(true);
  });
});
