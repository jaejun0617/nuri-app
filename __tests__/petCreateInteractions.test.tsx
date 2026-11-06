import React from 'react';
import PetThemePicker from '../src/components/pets/PetThemePicker';
import { Keyboard, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { AppHeaderLayout } from '../src/components/navigation/AppHeaderLayout';
import { APP_HEADER } from '../src/components/navigation/headerAppearance';
import ConfirmDialog from '../src/components/common/ConfirmDialog';
import { createPet, fetchMyPets } from '../src/services/supabase/pets';
import PetRegistrationCompleteModal from '../src/components/pets/PetRegistrationCompleteModal';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import PetCreateScreen from '../src/screens/Pets/PetCreateScreen';
import { loadPetCreateDraft } from '../src/services/local/onboardingDraft';
import { useAppFontPreference } from '../src/app/providers/AppFontPreferenceProvider';
import AppFontSettingsModal from '../src/components/settings/AppFontSettingsModal';
import FirstPetFontSelectorModal from '../src/components/onboarding/FirstPetFontSelectorModal';

jest.mock('../src/app/ui/AppTextInput', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return ReactModule.forwardRef<unknown, React.ComponentProps<typeof RN.TextInput>>(
    function MockInput(props, ref) {
      ReactModule.useImperativeHandle(ref, () => ({
        focus: mockFocus,
        isFocused: mockIsFocused,
        measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) =>
          callback(20, 400, 220, 50),
      }));
      return ReactModule.createElement(RN.TextInput, props);
    },
  );
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    getState: () => ({ routes: [{ name: 'AppTabs' }, { key: 'create' }] }),
    canGoBack: () => true,
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({ key: 'create', params: { from: 'header_plus' } }),
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
}));
jest.mock('react-native-keyboard-controller', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    KeyboardStickyView: 'KeyboardStickyView',
    KeyboardAwareScrollView: ReactModule.forwardRef<unknown, { children?: React.ReactNode }>(
      function MockScroll(props, ref) {
        ReactModule.useImperativeHandle(ref, () => ({
          scrollTo: mockScrollTo,
          assureFocusedInputVisible: jest.fn(),
          measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) =>
            callback(0, 100, 360, 600),
        }));
        return ReactModule.createElement('KeyboardAwareScrollView', props, props.children);
      },
    ),
    useReanimatedKeyboardAnimation: () => ({ progress: { value: 0 } }),
  };
});
jest.mock('../src/app/providers/AppFontPreferenceProvider', () => ({
  useAppFontPreference: jest.fn(),
  useTypographyScope: () => 'app-preference',
}));
jest.mock('../src/components/settings/AppFontSettingsModal', () => 'AppFontSettingsModal');
jest.mock('../src/components/onboarding/FirstPetFontSelectorModal', () => 'FirstPetFontSelectorModal');
jest.mock('../src/components/date-picker/DatePickerModal', () => 'DatePickerModal');
jest.mock('../src/components/common/ConfirmDialog', () => 'ConfirmDialog');
jest.mock('../src/components/common/WaveText', () => 'WaveText');
jest.mock('../src/components/pets/PetRegistrationCompleteModal', () => 'PetRegistrationCompleteModal');
jest.mock('../src/components/pets/PetThemePicker', () => 'PetThemePicker');
jest.mock('../src/services/supabase/client', () => ({ supabase: { auth: { getUser: () => Promise.resolve({ data: { user: { id: 'qa-owner' } } }) } } }));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: Object.assign(
    <T,>(selector: (state: typeof mockAuthState) => T) => selector(mockAuthState),
    { getState: () => mockAuthState },
  ),
}));
jest.mock('../src/services/supabase/pets', () => ({
  createPet: jest.fn(), fetchMyPets: jest.fn(), toPublicPetAvatarUrl: jest.fn(),
}));
jest.mock('../src/services/supabase/storagePets', () => ({ uploadPetAvatar: jest.fn() }));
jest.mock('../src/services/supabase/petWeightLogs', () => ({ upsertPetWeightLog: jest.fn() }));
jest.mock('../src/services/local/onboardingDraft', () => ({
  loadPetCreateDraft: jest.fn(),
  savePetCreateDraft: jest.fn(() => Promise.resolve()),
  clearPetCreateDraft: jest.fn(() => Promise.resolve()),
}));

const mockFocus = jest.fn();
const mockAuthState = { session: { user: { id: 'qa-owner' } } };
const mockScrollTo = jest.fn();
const mockIsFocused = jest.fn(() => true);
const fontPreference = {
  mode: 'jisu' as const,
  hydrated: true,
  hasStoredPreference: true,
  setMode: jest.fn(() => Promise.resolve()),
};

async function renderScreen() {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <PetCreateScreen />
      </ThemeProvider>,
    );
  });
  return renderer;
}

async function goToDetails(renderer: TestRenderer.ReactTestRenderer) {
  const nameInput = renderer.root.findAllByType(TextInput).find(
    node => node.props.placeholder === '이름을 입력해 주세요',
  );
  if (!nameInput) throw new Error('Name input missing');
  await act(async () => nameInput.props.onChangeText('QA Nuri'));
  const next = renderer.root.findAllByType(TouchableOpacity).find(
    node => node.props.accessibilityLabel === '다음 등록 단계로 이동',
  );
  if (!next) throw new Error('Next step action missing');
  expect(next.props.disabled).toBe(false);
  await act(async () => next.props.onPress());
}

describe('pet registration interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(loadPetCreateDraft).mockResolvedValue(null);
    jest.mocked(useAppFontPreference).mockReturnValue(fontPreference);
    mockIsFocused.mockReturnValue(true);
    mockAuthState.session.user.id = 'qa-owner';
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
    jest.spyOn(Keyboard, 'metrics').mockReturnValue({
      screenX: 0, screenY: 600, width: 360, height: 300,
    });
    jest.spyOn(View.prototype, 'measureInWindow').mockImplementation((callback: unknown) => {
      if (typeof callback === 'function') callback(20, 200, 320, 500);
    });
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback: (timestamp: number) => void) => {
      callback(0);
      return 1;
    });
    jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('centers the photo instruction across the circle instead of shrink-wrapping the label', async () => {
    const renderer = await renderScreen();
    const photo = renderer.root.findByProps({ placeholderText: '사진 추가' });
    expect(photo.props.placeholderText).toBe('사진 추가');
    expect(StyleSheet.flatten(photo.props.placeholderStyle)).toMatchObject({
      width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 7,
    });
    expect(StyleSheet.flatten(photo.props.placeholderTextStyle)).toMatchObject({
      width: '100%', textAlign: 'center', fontSize: 12, lineHeight: 18, includeFontPadding: false,
    });
    expect(StyleSheet.flatten(photo.props.imageStyle)).toMatchObject({ width: '100%', height: '100%' });
    expect(createPet).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
  });

  it('keeps menu glass in both registration steps and uses the guarded header back without submitting', async () => {
    const renderer = await renderScreen();
    const header = renderer.root.findByType(AppHeaderLayout);
    expect(header.props.topInset).toBe(24);
    expect(header.props.subtitle).toBe('함께할 아이의 이야기를 시작해요');
    const glass = () => renderer.root.findAllByType(View).filter(node => node.props.testID === 'pet-create-card-glass');
    const back = () => renderer.root.findAllByType(TouchableOpacity).find(node => node.props.testID === 'pet-create-back');
    expect(glass()).toHaveLength(3);
    glass().forEach(node => {
      expect(StyleSheet.flatten(node.props.style).borderRadius).toBe(22);
      expect(node.props.pointerEvents).toBe('none');
      let card = node.parent;
      while (card && !card.props.style) card = card.parent;
      expect(StyleSheet.flatten(card?.props.style)).toMatchObject({ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.78)' });
    });
    expect(StyleSheet.flatten(back()?.props.style)).toMatchObject({ width: APP_HEADER.targetSize, height: APP_HEADER.targetSize });
    await act(async () => back()?.props.onPress());
    expect(renderer.root.findByType(ConfirmDialog).props.visible).toBe(true);
    await act(async () => renderer.root.findByType(ConfirmDialog).props.onCancel());
    await goToDetails(renderer);
    expect(glass()).toHaveLength(2);
    await act(async () => back()?.props.onPress());
    expect(renderer.root.findAllByType(TextInput).find(node => node.props.placeholder === '이름을 입력해 주세요')?.props.value).toBe('QA Nuri');
    expect(createPet).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
  });

  it.each(['좋아하는 것 (최소 1개)', '싫어하는 것 (최소 1개)', '취미 (최소 1개)'])(
    '%s adds a normalized chip and refocuses the cleared input',
    async label => {
      const renderer = await renderScreen();
      await goToDetails(renderer);
      mockScrollTo.mockClear();
      const getInput = () => renderer.root.findAllByType(TextInput).find(
        node => node.props.accessibilityLabel === label,
      );
      const input = getInput();
      if (!input) throw new Error('Multi input missing');
      await act(async () => input.props.onChangeText('  QA   item  '));
      const add = renderer.root.findAllByType(TouchableOpacity).find(
        node => node.props.accessibilityLabel === `${label} 추가`,
      );
      if (!add) throw new Error('Add action missing');
      await act(async () => add.props.onPress());
      expect(getInput()?.props.value).toBe('');
      expect(mockFocus).toHaveBeenCalledTimes(1);
      expect(mockScrollTo).toHaveBeenCalledTimes(1);
      expect(mockScrollTo).toHaveBeenCalledWith({ x: 0, y: 136, animated: true });
      const chipCount = () => renderer.root.findAllByType(TouchableOpacity).filter(
        node => node.findAll(child => child.props.children === 'QA item').length > 0,
      ).length;
      expect(chipCount()).toBe(1);
      await act(async () => getInput()?.props.onChangeText('QA item'));
      await act(async () => getInput()?.props.onSubmitEditing());
      expect(getInput()?.props.submitBehavior).toBe('submit');
      expect(getInput()?.props.value).toBe('');
      expect(chipCount()).toBe(1);
      expect(mockFocus).toHaveBeenCalledTimes(2);
      expect(mockScrollTo).toHaveBeenCalledTimes(1);
      await act(async () => renderer.unmount());
    },
  );

  it('does not reveal hydrated chips or scroll after the keyboard closes or focus moves', async () => {
    const renderer = await renderScreen();
    await goToDetails(renderer);
    mockScrollTo.mockClear();
    const input = () => renderer.root.findAllByType(TextInput).find(
      node => node.props.accessibilityLabel === '태그 (최소 1개)',
    );
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false);
    await act(async () => input()?.props.onChangeText('QA closed'));
    await act(async () => input()?.props.onSubmitEditing());
    expect(mockScrollTo).not.toHaveBeenCalled();
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
    mockIsFocused.mockReturnValue(false);
    await act(async () => input()?.props.onChangeText('QA moved'));
    await act(async () => input()?.props.onSubmitEditing());
    expect(mockScrollTo).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
  });

  it('offers a labeled global font field in both forms without losing the draft', async () => {
    const renderer = await renderScreen();
    for (const step of [1, 2]) {
      if (step === 2) await goToDetails(renderer);
      expect(renderer.root.findAllByType(PetThemePicker)).toHaveLength(0);
      const action = renderer.root.findAllByType(TouchableOpacity).find(
        node => node.props.testID === 'pet-create-font-settings',
      );
      if (!action) throw new Error('Font settings action missing');
      const field = renderer.root.findByProps({ testID: 'pet-create-font-field' });
      expect(field.findAll(child => child.props.children === '앱 글꼴')).not.toHaveLength(0);
      expect(field.findByProps({ testID: 'pet-create-font-settings' })).toBe(action);
      expect(action.props.accessibilityLabel).toBe('앱 글꼴 선택');
      expect(action.props.disabled).toBe(false);
      expect(action.props.accessibilityValue.text).toBe('귀염발랄체');
      await act(async () => action.props.onPress());
      const modal = renderer.root.findByType(AppFontSettingsModal);
      expect(modal.props.visible).toBe(true);
      await act(async () => modal.props.onClose());
      expect(modal.props.visible).toBe(false);
      expect(renderer.root.findByType(FirstPetFontSelectorModal).props.visible).toBe(false);
    }
    const previous = renderer.root.findAllByType(TouchableOpacity).find(
      node => node.findAll(child => child.props.children === '이전 단계로').length > 0,
    );
    if (!previous) throw new Error('Previous step action missing');
    await act(async () => previous.props.onPress());
    expect(renderer.root.findAllByType(TextInput).find(
      node => node.props.placeholder === '이름을 입력해 주세요',
    )?.props.value).toBe('QA Nuri');
    await act(async () => renderer.unmount());
  });

  it('disables manual font settings until the stored preference is hydrated', async () => {
    jest.mocked(useAppFontPreference).mockReturnValue({ ...fontPreference, hydrated: false });
    const renderer = await renderScreen();
    const action = renderer.root.findAllByType(TouchableOpacity).find(
      node => node.props.testID === 'pet-create-font-settings',
    );
    expect(action?.props.disabled).toBe(true);
    await act(async () => renderer.unmount());
  });

  it('uses the saved new-pet receipt, dismisses the keyboard, and guards rapid submit before rerender', async () => {
    let finish!: (pet: Awaited<ReturnType<typeof createPet>>) => void;
    jest.mocked(createPet).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const saved = { id: 'saved-qa', name: 'QA Nuri', breed: '실제 저장 품종', gender: 'female' as const, birthDate: '2023-09-06' };
    jest.mocked(fetchMyPets).mockResolvedValue([saved]);
    const dismiss = jest.spyOn(Keyboard, 'dismiss');
    const renderer = await renderScreen();
    await goToDetails(renderer);
    for (const label of ['좋아하는 것 (최소 1개)', '싫어하는 것 (최소 1개)', '취미 (최소 1개)', '태그 (최소 1개)']) {
      const input = () => renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label);
      await act(async () => input()?.props.onChangeText('QA'));
      await act(async () => input()?.props.onSubmitEditing());
    }
    const submit = renderer.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === '반려동물 등록 완료');
    if (!submit || submit.props.disabled) throw new Error('Valid submit missing');
    await act(async () => { submit.props.onPress(); submit.props.onPress(); });
    expect(createPet).toHaveBeenCalledTimes(1);
    await act(async () => finish(saved));
    const receipt = renderer.root.findByType(PetRegistrationCompleteModal);
    expect(receipt.props.visible).toBe(true);
    expect(receipt.props.pet).toEqual(saved);
    expect(dismiss).toHaveBeenCalled();
    await act(async () => renderer.unmount());
  });

  it('does not publish a saved receipt after the request owner changes', async () => {
    let finish!: (pet: Awaited<ReturnType<typeof createPet>>) => void;
    jest.mocked(createPet).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const renderer = await renderScreen();
    await goToDetails(renderer);
    for (const label of ['좋아하는 것 (최소 1개)', '싫어하는 것 (최소 1개)', '취미 (최소 1개)', '태그 (최소 1개)']) {
      const input = () => renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label);
      await act(async () => input()?.props.onChangeText('QA'));
      await act(async () => input()?.props.onSubmitEditing());
    }
    const submit = renderer.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === '반려동물 등록 완료');
    await act(async () => { submit?.props.onPress(); });
    mockAuthState.session.user.id = 'different-owner';
    await act(async () => finish({ id: 'old-owner-pet', name: 'QA Nuri' }));
    expect(renderer.root.findByType(PetRegistrationCompleteModal).props.visible).toBe(false);
    expect(fetchMyPets).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
  });
});
