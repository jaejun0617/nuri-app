import React from 'react';
import { Modal, TextInput, TouchableOpacity } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import ConfirmDialog from '../src/components/common/ConfirmDialog';

jest.mock('react-native-keyboard-controller', () => {
  const ReactRuntime = jest.requireActual('react');

  return {
    KeyboardAvoidingView: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      ReactRuntime.createElement(
        'KeyboardControllerAvoidingView',
        props,
        children,
      ),
  };
});

const KEYBOARD_AWARE_HOST = 'KeyboardControllerAvoidingView';

type RenderDialogOptions = {
  keyboardAware?: boolean;
  confirmDisabled?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
};

function renderDialog({
  keyboardAware,
  confirmDisabled,
  onCancel = jest.fn(),
  onConfirm = jest.fn(),
}: RenderDialogOptions = {}) {
  let renderer!: TestRenderer.ReactTestRenderer;

  TestRenderer.act(() => {
    renderer = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <ConfirmDialog
          visible
          title="확인"
          message="계속 진행할까요?"
          confirmLabel="확인"
          keyboardAware={keyboardAware}
          confirmDisabled={confirmDisabled}
          onConfirm={onConfirm}
          onCancel={onCancel}
        >
          <TextInput testID="dialog-input" />
        </ConfirmDialog>
      </ThemeProvider>,
    );
  });

  return { onCancel, onConfirm, renderer };
}

describe('ConfirmDialog keyboard-aware opt-in', () => {
  it('keeps existing callers keyboard-disabled by default', () => {
    const { renderer } = renderDialog();

    const wrapper = renderer.root.find(
      node => String(node.type) === KEYBOARD_AWARE_HOST,
    );

    expect(wrapper.props.enabled).toBe(false);
    expect(wrapper.props.behavior).toBe('padding');
    expect(renderer.root.findByProps({ testID: 'dialog-input' })).toBeDefined();

    TestRenderer.act(() => renderer.unmount());
  });

  it('enables keyboard avoidance only when the caller opts in', () => {
    const { renderer } = renderDialog({ keyboardAware: true });

    const wrapper = renderer.root.find(
      node => String(node.type) === KEYBOARD_AWARE_HOST,
    );

    expect(wrapper.props.enabled).toBe(true);
    expect(wrapper.props.behavior).toBe('padding');
    expect(typeof wrapper.props.keyboardVerticalOffset).toBe('number');
    expect(renderer.root.findByProps({ testID: 'dialog-input' })).toBeDefined();

    TestRenderer.act(() => renderer.unmount());
  });

  it('routes Android back to the existing cancel handler', () => {
    const { onCancel, renderer } = renderDialog({
      keyboardAware: true,
    });

    expect(renderer.root.findByType(Modal).props.onRequestClose).toBe(onCancel);

    TestRenderer.act(() => renderer.unmount());
  });

  it('keeps a disabled destructive confirmation disabled', () => {
    const onConfirm = jest.fn();
    const { renderer } = renderDialog({
      confirmDisabled: true,
      onConfirm,
    });

    const buttons = renderer.root.findAllByType(TouchableOpacity);
    expect(buttons).toHaveLength(2);
    expect(buttons[1].props.disabled).toBe(true);
    expect(buttons[1].props.onPress).toBe(onConfirm);

    TestRenderer.act(() => renderer.unmount());
  });
});
