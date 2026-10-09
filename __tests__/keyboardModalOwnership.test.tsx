import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import WeightLogEntrySheet from '../src/components/health/WeightLogEntrySheet';
import { PasswordChangeModal } from '../src/screens/More/MoreDrawerContent';
import ConfirmDialog from '../src/components/common/ConfirmDialog';
import PetDeleteConfirmDialog from '../src/components/pets/PetDeleteConfirmDialog';

let mockKeyboardProgress = 0;

jest.mock('react-native-keyboard-controller', () => ({
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  useReanimatedKeyboardAnimation: () => ({ progress: { value: mockKeyboardProgress } }),
}));
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/app/ui/AppTextInput', () => 'AppTextInput');
jest.mock('../src/components/date-picker/DatePickerModal', () => () => null);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
}));

describe('modal keyboard-space ownership', () => {
  let renderer: TestRenderer.ReactTestRenderer;
  beforeEach(() => { mockKeyboardProgress = 0; });
  afterEach(() => act(() => renderer?.unmount()));
  async function mount(element: React.ReactElement) {
    await act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>{element}</ThemeProvider>,
      );
    });
  }
  const noop = jest.fn();
  it.each([0, 1])('weight entry retains one space owner at keyboard progress %i', async progress => {
    mockKeyboardProgress = progress;
    await mount(
      <WeightLogEntrySheet
        visible
        petId="p"
        petName="누리"
        accentColor="#E45A58"
        entrySource="health_report"
        onClose={noop}
      />,
    );
    const scroll = renderer.root.findByType(ScrollView);
    expect(scroll.props.testID).toBe('weight-entry-scroll');
    expect(scroll.props).not.toHaveProperty('extraHeight');
    expect(scroll.props).not.toHaveProperty('extraScrollHeight');
    expect(scroll.props.keyboardDismissMode).toBe('none');
    for (const testID of [
      'weight-entry-header',
      'weight-entry-close',
      'weight-entry-actions',
    ]) {
      expect(scroll.findAll(node => node.props.testID === testID)).toHaveLength(
        0,
      );
      expect(
        renderer.root.findAll(node => node.props.testID === testID).length,
      ).toBeGreaterThan(0);
    }
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'weight-entry-sheet' }).props.style,
      ),
    ).toMatchObject({
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      overflow: 'hidden',
      paddingBottom: progress ? 12 : 24,
    });
    const stopPropagation = jest.fn();
    renderer.root
      .findByProps({ testID: 'weight-entry-touch-boundary' })
      .props.onPress({ stopPropagation });
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(
      renderer.root.findAll(
        node =>
          node.type ===
          ('KeyboardAvoidingView' as TestRenderer.ReactTestInstance['type']),
      ),
    ).toHaveLength(1);
    expect(
      renderer.root.findAll(node => node.props.testID === 'weight-entry-note')
        .length,
    ).toBeGreaterThan(0);
    expect(noop).not.toHaveBeenCalled();
  });
  it('password fields preserve secure visibility and callbacks without adding keyboard padding twice', async () => {
    await mount(
      <PasswordChangeModal
        visible
        bottomInset={24}
        currentPassword=""
        nextPassword=""
        confirmPassword=""
        currentPasswordVisible={false}
        nextPasswordVisible={false}
        confirmPasswordVisible={false}
        saving={false}
        accentColor="#E45A58"
        onClose={noop}
        onChangeCurrentPassword={noop}
        onChangeNextPassword={noop}
        onChangeConfirmPassword={noop}
        onToggleCurrentPasswordVisible={noop}
        onToggleNextPasswordVisible={noop}
        onToggleConfirmPasswordVisible={noop}
        onSubmit={noop}
      />,
    );
    const scroll = renderer.root.findByType(ScrollView);
    expect(scroll.props.testID).toBe('password-change-scroll');
    expect(scroll.props).not.toHaveProperty('extraHeight');
    expect(scroll.props).not.toHaveProperty('extraScrollHeight');
    expect(
      scroll.findAll(node => node.props.testID === 'password-change-actions'),
    ).toHaveLength(0);
    expect(
      renderer.root.findAll(node => node.props.secureTextEntry === true).length,
    ).toBeGreaterThanOrEqual(3);
    expect(noop).not.toHaveBeenCalled();
  });
  it('keeps shared confirm actions reachable while only long content scrolls', async () => {
    await mount(
      <ConfirmDialog
        visible
        title="QA"
        message={'안내\n'.repeat(100)}
        confirmLabel="확인"
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    const scroll = renderer.root.findByType(ScrollView);
    expect(
      scroll.findAll(node => node.props.testID === 'confirm-dialog-actions'),
    ).toHaveLength(0);
    expect(
      renderer.root.findAll(
        node => node.props.testID === 'confirm-dialog-actions',
      ).length,
    ).toBeGreaterThan(0);
    expect(noop).not.toHaveBeenCalled();
  });
  it('fixes pet deletion header/actions without weakening the deletion consent guard', async () => {
    await mount(
      <PetDeleteConfirmDialog
        visible
        pet={{ id: 'p', name: '누리' }}
        deleting={false}
        onCancel={noop}
        onConfirm={noop}
      />,
    );
    const scroll = renderer.root.findByType(ScrollView);
    for (const testID of ['pet-delete-header', 'pet-delete-actions']) {
      expect(scroll.findAll(node => node.props.testID === testID)).toHaveLength(
        0,
      );
    }
    expect(
      renderer.root.findByProps({ testID: 'pet-delete-confirm' }).props
        .disabled,
    ).toBe(true);
    expect(scroll.props.keyboardDismissMode).toBe('none');
    expect(noop).not.toHaveBeenCalled();
  });
});
