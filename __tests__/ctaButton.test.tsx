import React from 'react';
import ReactNative, { StyleSheet, TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import CtaButton, { CtaText } from '../src/app/ui/CtaButton';
import ConfirmDialog from '../src/components/common/ConfirmDialog';
import type { CtaRole } from '../src/app/theme/ctaPalette';
import LinearGradient from 'react-native-linear-gradient';
let mockSeason = 'autumn';
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => mockSeason,
}));
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardAvoidingView: 'KeyboardAvoidingView',
}));
const wrap = (child: React.ReactNode) => (
  <ThemeProvider theme={createTheme('light')}>{child}</ThemeProvider>
);
describe('opt-in action component', () => {
  let renderer: TestRenderer.ReactTestRenderer;
  afterEach(() => {
    act(() => renderer?.unmount());
    jest.restoreAllMocks();
    mockSeason = 'autumn';
  });
  const button = () =>
    renderer.root.find(node => typeof node.props.style === 'function');
  const style = (pressed = false) =>
    StyleSheet.flatten(button().props.style({ pressed }));
  it('keeps the two compose controls solid lavender without changing ordinary CTA gradients', () => {
    act(() => { renderer = TestRenderer.create(wrap(<CtaButton role="primary" variant="solidLavender"><CtaText>작성</CtaText></CtaButton>)); });
    expect(style()).toMatchObject({ backgroundColor: '#7D5CE4', borderColor: '#7D5CE4' });
    expect(style(true).backgroundColor).toBe('#6345BE');
    expect(renderer.root.find(node => String(node.type) === 'AppText').props.color).toBe('#FFFFFF');
    expect(renderer.root.findAllByType(LinearGradient)).toHaveLength(0);
    act(() => renderer.update(wrap(<CtaButton role="primary" variant="solidLavender" disabled><CtaText>작성</CtaText></CtaButton>)));
    expect(style().backgroundColor).toBe('#E8EBEF');
    expect(button().props.disabled).toBe(true);
  });
  it.each([
    ['autumn', '#C4A9EF'],
    ['winter', '#C4A9EF'],
    ['spring', '#C4A9EF'],
    ['summer', '#C4A9EF'],
  ])(
    'uses global %s even when caller and pet palette disagree',
    (season, color) => {
      mockSeason = season;
      act(() => {
        renderer = TestRenderer.create(
          wrap(
            <CtaButton
              role="primary"
              style={{ backgroundColor: '#00FF00', height: 54, opacity: 0.2 }}
            >
              <CtaText>저장</CtaText>
            </CtaButton>,
          ),
        );
      });
      expect(style()).toMatchObject({
        backgroundColor: color,
        minHeight: 54,
        opacity: 1,
        height: undefined,
      });
      expect(
        renderer.root.find(node => String(node.type) === 'AppText').props.color,
      ).toBe('#251255');
      expect(renderer.root.findByType(LinearGradient).props.colors).toEqual(['#E7DAFC', '#C4A9EF']);
    },
  );
  it('renders pressed and disabled states, blocks loading without dimming', () => {
    const onPress = jest.fn();
    act(() => {
      renderer = TestRenderer.create(
        wrap(
          <CtaButton role="primary" onPress={onPress}>
            <CtaText>저장</CtaText>
          </CtaButton>,
        ),
      );
    });
    expect(style(true).backgroundColor).toBe('#B696E7');
    act(() =>
      renderer.update(
        wrap(
          <CtaButton role="primary" disabled>
            <CtaText>저장</CtaText>
          </CtaButton>,
        ),
      ),
    );
    expect(style().backgroundColor).toBe('#E8EBEF');
    expect(button().props.accessibilityState.disabled).toBe(true);
    expect(renderer.root.findAllByType(LinearGradient)).toHaveLength(0);
    act(() =>
      renderer.update(
        wrap(
          <CtaButton role="primary" loading disabled onPress={onPress}>
            <CtaText>저장 중</CtaText>
          </CtaButton>,
        ),
      ),
    );
    expect(style().backgroundColor).toBe('#C4A9EF');
    expect(button().props.disabled).toBe(true);
    expect(button().props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });
  });
  it.each([
    ['destructiveConfirm', 'neutral'],
    ['primary', 'destructiveConfirm'],
    ['neutral', 'neutral'],
    ['secondary', 'neutral'],
  ])(
    'maps confirm %s and cancel %s by actual action, not slot or tone',
    (confirm, cancel) => {
      act(() => {
        renderer = TestRenderer.create(
          wrap(
            <ConfirmDialog
              visible
              title="확인"
              message="내용"
              confirmLabel="진행"
              cancelLabel="취소"
              tone="danger"
              confirmRole={confirm as CtaRole}
              cancelRole={cancel as CtaRole}
              onConfirm={jest.fn()}
              onCancel={jest.fn()}
            />,
          ),
        );
      });
      const controls = renderer.root.findAllByType(CtaButton);
      expect(
        controls.find(n => n.props.testID === 'confirm-dialog-confirm')?.props
          .role,
      ).toBe(confirm);
      expect(
        controls.find(n => n.props.testID === 'confirm-dialog-cancel')?.props
          .role,
      ).toBe(cancel);
    },
  );
  it('keeps legacy excluded callers on their original button branch', () => {
    act(() => {
      renderer = TestRenderer.create(
        wrap(
          <ConfirmDialog
            visible
            title="확인"
            message="내용"
            confirmLabel="확인"
            onConfirm={jest.fn()}
            onCancel={jest.fn()}
          />,
        ),
      );
    });
    expect(renderer.root.findAllByType(CtaButton)).toHaveLength(0);
    expect(renderer.root.findAllByType(TouchableOpacity)).toHaveLength(2);
  });
  it('stacks dialog controls at 360dp / fontScale 1.5', () => {
    jest
      .spyOn(ReactNative, 'useWindowDimensions')
      .mockReturnValue({ width: 360, height: 800, scale: 3, fontScale: 1.5 });
    act(() => {
      renderer = TestRenderer.create(
        wrap(
          <ConfirmDialog
            visible
            title="확인"
            message="내용"
            confirmLabel="일정 삭제"
            cancelLabel="계속 유지하기"
            confirmRole="destructiveConfirm"
            cancelRole="neutral"
            onConfirm={jest.fn()}
            onCancel={jest.fn()}
          />,
        ),
      );
    });
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'confirm-dialog-actions' }).props
          .style,
      ).flexDirection,
    ).toBe('column');
  });
});
