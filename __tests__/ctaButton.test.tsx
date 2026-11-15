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
  it('adds borderless menu glass over an opaque face for return actions', () => {
    const onPress = jest.fn();
    act(() => {
      renderer = TestRenderer.create(wrap(
        <CtaButton testID="list-back" role="neutral" variant="opaqueGlass" onPress={onPress}>
          <CtaText>목록으로</CtaText>
        </CtaButton>,
      ));
    });
    expect(style()).toMatchObject({ backgroundColor: '#DCE8EE', borderWidth: 0 });
    expect(style(true).backgroundColor).toBe('#CADCE5');
    expect(StyleSheet.flatten(renderer.root.findAllByProps({ testID: 'home-reflective-fill' }).at(-1)?.props.style).borderWidth).toBe(0);
    act(() => button().props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it.each([[8, 7], [16, 15], [0, 0]])('fits the fill inside the %s dp rounded frame', (outer, inner) => {
    act(() => {
      renderer = TestRenderer.create(wrap(
        <CtaButton role="primary" style={{ borderRadius: outer }}><CtaText>구독하기</CtaText></CtaButton>,
      ));
    });
    expect(style()).toMatchObject({ borderRadius: outer, borderWidth: 1, overflow: 'hidden' });
    expect(StyleSheet.flatten(renderer.root.findByType(LinearGradient).props.style).borderRadius).toBe(inner);
  });
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
    ['autumn', '#6943B7'],
    ['winter', '#6943B7'],
    ['spring', '#6943B7'],
    ['summer', '#6943B7'],
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
      ).toBe('#FFFFFF');
      expect(renderer.root.findByType(LinearGradient).props.colors).toEqual(['#7C54CC', '#6943B7']);
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
    expect(style(true).backgroundColor).toBe('#5C38A6');
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
    expect(style().backgroundColor).toBe('#6943B7');
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
  it('keeps the profile registration exit on its legacy branch with a white label over lavender', () => {
    act(() => {
      renderer = TestRenderer.create(
        wrap(
          <ConfirmDialog
            visible
            title="등록을 멈추고 나갈까요?"
            message="내용"
            confirmLabel="나가기"
            cancelLabel="계속 작성하기"
            tone="warning"
            onConfirm={jest.fn()}
            onCancel={jest.fn()}
          />,
        ),
      );
    });
    expect(renderer.root.findAllByType(CtaButton)).toHaveLength(0);
    const [cancel, confirm] = renderer.root.findAllByType(TouchableOpacity);
    expect(cancel.findAllByType(LinearGradient)).toHaveLength(0);
    expect(confirm.findByType(LinearGradient).props.colors).toEqual(['#7C54CC', '#6943B7']);
    const label = confirm.find(node => String(node.type) === 'AppText');
    expect(StyleSheet.flatten(label.props.style).color).toBe('#FFFFFF');
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
