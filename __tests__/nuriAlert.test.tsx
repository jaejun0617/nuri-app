import React from 'react';
import { Alert as NativeAlert, Modal, Platform, StyleSheet } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { androidAlertState, NuriAlert } from '../src/app/ui/NuriAlert';
import NuriAlertHost from '../src/app/ui/NuriAlertHost';

let renderer: TestRenderer.ReactTestRenderer;
function button(index: number) {
  return renderer.root
    .findAllByProps({ testID: `nuri-alert-action-${index}` })
    .find(node => typeof node.props.onPress === 'function');
}

beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
  act(() => {
    renderer = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <NuriAlertHost />
      </ThemeProvider>,
    );
  });
});

afterEach(() => {
  act(() => {
    NuriAlert.alert('reset');
    const alert = androidAlertState.getSnapshot();
    if (alert) androidAlertState.choose(alert.id, 0);
    renderer.unmount();
  });
  jest.restoreAllMocks();
});

it('renders the app notice without an implicit Back or backdrop action', () => {
  act(() => NuriAlert.alert('제목을 입력해 주세요.'));
  expect(JSON.stringify(renderer.toJSON())).toContain('제목을 입력해 주세요.');
  const card = renderer.root.findByProps({ testID: 'confirm-dialog-card' });
  expect(StyleSheet.flatten(card.props.style)).toMatchObject({ backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 });
  expect(card.findAllByProps({ testID: 'menu-glass-surface' }).length).toBeGreaterThan(0);
  act(() => renderer.root.findByType(Modal).props.onRequestClose());
  expect(button(0)).toBeDefined();
  act(() => button(0)?.props.onPress());
  expect(androidAlertState.getSnapshot()).toBeNull();
});

it('keeps all three choices and opens a follow-up exactly once', () => {
  const remove = jest.fn();
  const followUp = jest.fn(() =>
    NuriAlert.alert('삭제할까요?', undefined, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: remove },
    ]),
  );
  act(() =>
    NuriAlert.alert('알림 관리', undefined, [
      { text: '취소', style: 'cancel' },
      { text: '이 알림 삭제', onPress: followUp },
      { text: '전체 알림 삭제', style: 'destructive', onPress: remove },
    ]),
  );
  expect(button(2)).toBeDefined();
  const choose = button(1)?.props.onPress;
  act(() => {
    choose?.();
    choose?.();
  });
  expect(followUp).toHaveBeenCalledTimes(1);
  expect(androidAlertState.getSnapshot()?.title).toBe('삭제할까요?');
  act(() => button(0)?.props.onPress());
  expect(remove).not.toHaveBeenCalled();
  expect(androidAlertState.getSnapshot()).toBeNull();
});

it('calls only onDismiss for an explicitly cancelable alert', () => {
  const onPress = jest.fn();
  const onDismiss = jest.fn();
  act(() =>
    NuriAlert.alert('제목', '내용', [{ text: '확인', onPress }], {
      cancelable: true,
      onDismiss,
    }),
  );
  act(() => renderer.root.findByType(Modal).props.onRequestClose());
  expect(onDismiss).toHaveBeenCalledTimes(1);
  expect(onPress).not.toHaveBeenCalled();
});

it('does not replace the native iOS alert', () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  const native = jest.spyOn(NativeAlert, 'alert').mockImplementation(() => {});
  NuriAlert.alert('제목', '내용');
  expect(native).toHaveBeenCalledWith('제목', '내용', undefined, undefined);
  expect(androidAlertState.getSnapshot()).toBeNull();
  jest.replaceProperty(Platform, 'OS', 'android');
});
