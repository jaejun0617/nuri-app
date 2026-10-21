import React from 'react';
import * as Native from 'react-native';
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import PetDeleteConfirmDialog, {
  type PetDeleteConfirmation,
} from '../src/components/pets/PetDeleteConfirmDialog';
import PetManagementCard from '../src/components/pets/PetManagementCard';
import PetDeletionRecoveryMarker from '../src/components/pets/PetDeletionRecoveryMarker';
import PetManagementScreen from '../src/screens/Pets/PetManagementScreen';
import { formatPetAgeLabelFromBirthDate } from '../src/services/pets/age';
import {
  deletePetSafely,
  fetchMyPets,
  getPetDeleteErrorMessage,
} from '../src/services/supabase/pets';
import { useAuthStore } from '../src/store/authStore';
import { usePetStore, type Pet } from '../src/store/petStore';
import {
  PET_MANAGEMENT_TYPE as type,
  getPetManagementLayout,
  getPetDeleteLayout,
} from '../src/theme/pets/management';
import { diffDaysFromKst } from '../src/utils/date';

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
};
let mockDimensions = { width: 393, height: 852, scale: 3, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockDimensions,
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { entrySource: 'more' } }),
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 24, bottom: 18, left: 0, right: 0 }),
}));
jest.mock('../src/services/supabase/pets', () => ({
  deletePetSafely: jest.fn(),
  fetchMyPets: jest.fn(),
  getPetDeleteErrorMessage: jest.fn(() => '잠시 후 다시 시도해 주세요.'),
}));
jest.mock('../src/services/monitoring/sentry', () => ({
  captureMonitoringException: jest.fn(),
  captureMonitoringMessage: jest.fn(),
}));
jest.mock('../src/store/uiStore', () => ({
  ...jest.requireActual('../src/store/uiStore'),
  showToast: jest.fn(),
  openMoreDrawer: jest.fn(),
}));
const pet: Pet = {
  id: 'fixture-a',
  name: '샘플 A',
  avatarUrl: 'https://example.test/a.jpg',
  birthDate: '2020-03-01',
  adoptionDate: '2020-03-02',
  species: 'dog',
  speciesKey: 'DOG',
  speciesDetailKey: 'maltese',
  weightKg: 6,
  gender: 'male',
};
const other: Pet = { id: 'fixture-b', name: '샘플 B', deathDate: '2026-01-01' };
const callbacks = {
  onPressSelect: jest.fn(),
  onPressEdit: jest.fn(),
  onPressDelete: jest.fn(),
};
const confirmation = (p = pet): PetDeleteConfirmation => ({
  petId: p.id,
  consentChecked: true,
  confirmationText: '삭제하기',
});
const theme = createTheme('light');
function contentText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number')
    return String(value);
  if (Array.isArray(value)) return value.map(contentText).join('');
  return React.isValidElement<{ children?: React.ReactNode }>(value)
    ? contentText(value.props.children)
    : '';
}
const text = (r: TestRenderer.ReactTestRenderer) =>
  r.root
    .findAllByType(Text)
    .map(n => contentText(n.props.children))
    .join('\n');
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

describe('pet profile management reference and safety', () => {
  let renderer: TestRenderer.ReactTestRenderer;
  const initialPets = usePetStore.getState();
  const initialAuth = useAuthStore.getState();
  function mount(child: React.ReactElement) {
    act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={theme}>{child}</ThemeProvider>,
      );
    });
  }
  function update(child: React.ReactElement) {
    act(() =>
      renderer.update(<ThemeProvider theme={theme}>{child}</ThemeProvider>),
    );
  }
  function button(id: string) {
    const node = renderer.root
      .findAllByType(TouchableOpacity)
      .find(n => n.props.testID === id);
    if (!node) throw Error('Missing button: ' + id);
    return node;
  }
  function view(id: string) {
    const node = renderer.root
      .findAllByType(View)
      .find(n => n.props.testID === id);
    if (!node) throw Error('Missing view: ' + id);
    return node;
  }
  function label(id: string) {
    const node = renderer.root
      .findAllByType(Text)
      .find(n => n.props.testID === id);
    if (!node) throw Error('Missing text: ' + id);
    return node;
  }
  function openDelete(p = pet) {
    act(() =>
      button('pet-more-' + p.id).props.onPress({ stopPropagation: jest.fn() }),
    );
    act(() => button('pet-delete-entry-' + p.id).props.onPress());
  }
  function screen(list = [pet, other], selected = pet.id) {
    usePetStore.setState({ pets: list, selectedPetId: selected });
    mount(<PetManagementScreen />);
  }
  function dialog(
    p = pet,
    props: Partial<React.ComponentProps<typeof PetDeleteConfirmDialog>> = {},
  ) {
    return (
      <PetDeleteConfirmDialog
        visible
        pet={p}
        deleting={false}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
        {...props}
      />
    );
  }
  beforeEach(() => {
    jest.clearAllMocks();
    mockDimensions = { width: 393, height: 852, scale: 3, fontScale: 1 };
    jest.spyOn(Native.Keyboard, 'isVisible').mockReturnValue(false);
    useAuthStore.setState({
      session: {
        access_token: 'fixture',
        refresh_token: 'fixture',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'fixture-owner',
          aud: 'authenticated',
          app_metadata: {},
          user_metadata: {},
          created_at: '2026-01-01T00:00:00Z',
        },
      },
    });
  });
  afterEach(() => {
    act(() => renderer?.unmount());
    usePetStore.setState(initialPets);
    useAuthStore.setState(initialAuth);
    jest.restoreAllMocks();
  });

  it.each([
    [320, 568],
    [360, 640],
    [393, 852],
    [412, 915],
    [430, 932],
  ])(
    'fits square photos and safe overlay limits at %i x %i',
    (width, height) => {
      const layout = getPetManagementLayout(width);
      expect(
        layout.cardWidth -
          layout.cardInset * 2 -
          layout.photoSize -
          layout.photoGap,
      ).toBeGreaterThan(100);
      expect(layout.photoSize).toBeLessThanOrEqual(138);
      expect(getPetDeleteLayout(height, 24, 18).maxHeight).toBe(height - 66);
      mount(
        <PetManagementCard
          pet={pet}
          isSelected
          {...callbacks}
          availableWidth={width}
        />,
      );
      const frame = StyleSheet.flatten(
        view('pet-photo-frame-' + pet.id).props.style,
      );
      expect(frame.width).toBe(frame.height);
      expect(renderer.root.findByType(Image).props.resizeMode).toBe('cover');
    },
  );
  it('uses final PO font reductions and retains enlarged text support', () => {
    expect(type.title.fontSize).toBe(22);
    expect(type.managementTitle.fontSize).toBe(19);
    expect(type.value.fontSize).toBe(15);
    expect(type.action.fontSize).toBe(13);
    expect(type.dialogAction.fontSize).toBe(14);
    mockDimensions = { width: 320, height: 568, scale: 3, fontScale: 2 };
    mount(
      <PetManagementCard
        pet={{ ...pet, name: '긴 이름을 가진 합성 반려동물' }}
        isSelected
        {...callbacks}
      />,
    );
    expect(
      renderer.root
        .findAllByType(Text)
        .every(n => n.props.allowFontScaling !== false),
    ).toBe(true);
    expect(
      StyleSheet.flatten(view('pet-card-' + pet.id).props.style).height,
    ).toBeUndefined();
    expect(
      StyleSheet.flatten(button('pet-edit-' + pet.id).props.style).minHeight,
    ).toBeGreaterThanOrEqual(48);
  });
  it('centers CTA labels and removes the profile edit pencil icon', () => {
    mount(<PetManagementCard pet={pet} isSelected {...callbacks} />);
    const edit = button('pet-edit-' + pet.id);
    expect(
      edit.findAll(
        n => String(n.type) === 'Feather' && n.props.name === 'edit-2',
      ),
    ).toHaveLength(0);
    expect(
      StyleSheet.flatten(label('pet-edit-label-' + pet.id).props.style),
    ).toMatchObject({
      textAlign: 'center',
      textAlignVertical: 'center',
      includeFontPadding: false,
      flex: 1,
    });
    expect(StyleSheet.flatten(edit.props.style).flexWrap).toBeUndefined();
  });
  it('retains taxonomy, gender, valid age, weight and existing inclusive day policy', () => {
    mount(<PetManagementCard pet={pet} isSelected {...callbacks} />);
    const value = text(renderer);
    for (const s of [
      '말티즈',
      '남아',
      '6kg',
      '2020.03.01',
      formatPetAgeLabelFromBirthDate(pet.birthDate) ?? '',
      (diffDaysFromKst(pet.adoptionDate ?? '') ?? 0).toLocaleString('ko-KR') +
        '일',
    ])
      expect(value).toContain(s);
  });
  it('keeps memorial and selected states independent and does not select on edit/menu', () => {
    mount(<PetManagementCard pet={other} isSelected={false} {...callbacks} />);
    expect(text(renderer)).toContain('추모');
    act(() => button('pet-edit-' + other.id).props.onPress());
    openDelete(other);
    expect(callbacks.onPressEdit).toHaveBeenCalledWith(other.id);
    expect(callbacks.onPressDelete).toHaveBeenCalledWith(other.id);
    expect(callbacks.onPressSelect).not.toHaveBeenCalled();
    expect(text(renderer)).toContain(other.name);
  });
  it.each([0, -1, NaN, Infinity, null])(
    'does not invent weight from %s',
    weightKg => {
      mount(
        <PetManagementCard
          pet={{ ...pet, weightKg }}
          isSelected
          {...callbacks}
        />,
      );
      expect(
        view('pet-weight-' + pet.id)
          .findAllByType(Text)
          .some(n => n.props.children === '미입력'),
      ).toBe(true);
    },
  );
  it('reserves the frame through load failure and a new URL retry', () => {
    mount(<PetManagementCard pet={pet} isSelected {...callbacks} />);
    const before = StyleSheet.flatten(
      view('pet-photo-frame-' + pet.id).props.style,
    );
    act(() => renderer.root.findByType(Image).props.onError());
    expect(text(renderer)).toContain('사진을 불러오지 못했어요');
    update(
      <PetManagementCard
        pet={{ ...pet, avatarUrl: 'https://example.test/b.jpg' }}
        isSelected
        {...callbacks}
      />,
    );
    expect(renderer.root.findByType(Image).props.source.uri).toBe(
      'https://example.test/b.jpg',
    );
    expect(
      StyleSheet.flatten(view('pet-photo-frame-' + pet.id).props.style),
    ).toEqual(before);
  });
  it.each([0, 1, 3])('renders real count %i without inventing pets', count => {
    const list = Array.from({ length: count }, (_, i) => ({
      ...pet,
      id: 'fixture-' + i,
    }));
    screen(list);
    expect(renderer.root.findByType(FlatList).props.data).toEqual(list);
    expect(text(renderer)).toContain(count + '마리');
    if (count === 0)
      expect(text(renderer)).toContain('아직 등록된 아이가 없어요');
  });
  it('keeps edit/add routes, immediate selection, ordering and safe-area padding', () => {
    screen();
    act(() => button('pet-edit-' + pet.id).props.onPress());
    expect(mockNavigation.navigate).toHaveBeenCalledWith('PetProfileEdit', {
      petId: pet.id,
      entrySource: 'stack',
    });
    act(() => button('pet-management-add').props.onPress());
    expect(mockNavigation.navigate).toHaveBeenCalledWith('PetCreate', {
      from: 'header_plus',
    });
    act(() => button('pet-select-' + other.id).props.onPress());
    expect(usePetStore.getState().selectedPetId).toBe(other.id);
    expect(usePetStore.getState().pets.map(p => p.id)).toEqual([
      pet.id,
      other.id,
    ]);
    expect(
      StyleSheet.flatten(view('pet-management-screen').props.style)
        .paddingBottom,
    ).toBe(18);
    expect(renderer.root.findByType(FlatList).props.extraData).toBe(other.id);
  });
  it('opens the explicit unselected target without mutating count/order/selection', () => {
    screen();
    openDelete(other);
    expect(
      renderer.root.findByType(PetDeleteConfirmDialog.type).props.pet.id,
    ).toBe(other.id);
    expect(usePetStore.getState().selectedPetId).toBe(pet.id);
    expect(usePetStore.getState().pets).toEqual([pet, other]);
    expect(deletePetSafely).not.toHaveBeenCalled();
  });
  it('preserves the last-pet guard', () => {
    screen([pet]);
    openDelete();
    expect(
      renderer.root.findAllByType(PetDeleteConfirmDialog.type),
    ).toHaveLength(0);
    expect(text(renderer)).toContain('최소 1개의 아이 프로필은 필요해요.');
    expect(deletePetSafely).not.toHaveBeenCalled();
  });
  it('rechecks target and both inputs at the submit boundary', async () => {
    screen();
    openDelete();
    const submit = renderer.root.findByType(PetDeleteConfirmDialog.type).props
      .onConfirm;
    await act(async () => {
      submit({ ...confirmation(), petId: other.id });
      submit({ ...confirmation(), consentChecked: false });
      submit({ ...confirmation(), confirmationText: '삭제하기 ' });
      await flush();
    });
    expect(deletePetSafely).not.toHaveBeenCalled();
  });
  it.each([pet.id, other.id])(
    'deletes confirmed %s once and applies existing selection fallback',
    async id => {
      screen();
      const target = id === pet.id ? pet : other;
      openDelete(target);
      let resolve!: (
        value: Awaited<ReturnType<typeof deletePetSafely>>,
      ) => void;
      jest.mocked(deletePetSafely).mockImplementationOnce(
        () =>
          new Promise(r => {
            resolve = r;
          }),
      );
      const submit = renderer.root.findByType(PetDeleteConfirmDialog.type).props
        .onConfirm;
      act(() => {
        submit(confirmation(target));
        submit(confirmation(target));
      });
      expect(deletePetSafely).toHaveBeenCalledTimes(1);
      expect(deletePetSafely).toHaveBeenCalledWith(target.id);
      expect(button('pet-delete-cancel').props.disabled).toBe(true);
      const remaining = [pet, other].filter(p => p.id !== id);
      jest.mocked(fetchMyPets).mockResolvedValueOnce(remaining);
      await act(async () => {
        resolve({
          deletedPetId: id,
          userId: 'fixture-owner',
          walkCleanupPending: true,
          storageCleanup: { failedBuckets: [] },
        });
        await flush();
      });
      expect(usePetStore.getState().pets).toEqual(remaining);
      expect(usePetStore.getState().selectedPetId).toBe(remaining[0].id);
      expect(
        renderer.root.findAllByType(PetDeleteConfirmDialog.type),
      ).toHaveLength(0);
    },
  );
  it('retains the target/list and readable inline error after failure, then retries', async () => {
    screen();
    openDelete(other);
    jest
      .mocked(deletePetSafely)
      .mockRejectedValueOnce(new Error('internal fixture error'));
    await act(async () => {
      renderer.root
        .findByType(PetDeleteConfirmDialog.type)
        .props.onConfirm(confirmation(other));
      await flush();
    });
    expect(getPetDeleteErrorMessage).toHaveBeenCalled();
    expect(text(renderer)).toContain('잠시 후 다시 시도해 주세요.');
    expect(text(renderer)).not.toContain('internal fixture error');
    expect(usePetStore.getState().pets).toEqual([pet, other]);
    jest
      .mocked(deletePetSafely)
      .mockResolvedValueOnce({
        deletedPetId: other.id,
        userId: 'fixture-owner',
        storageCleanup: { failedBuckets: [] },
      });
    jest.mocked(fetchMyPets).mockResolvedValueOnce([pet]);
    await act(async () => {
      renderer.root
        .findByType(PetDeleteConfirmDialog.type)
        .props.onConfirm(confirmation(other));
      await flush();
    });
    expect(deletePetSafely).toHaveBeenCalledTimes(2);
  });
  it('ignores a result after the authenticated owner changes', async () => {
    screen();
    openDelete();
    let resolve!: (value: Awaited<ReturnType<typeof deletePetSafely>>) => void;
    jest.mocked(deletePetSafely).mockImplementationOnce(
      () =>
        new Promise(r => {
          resolve = r;
        }),
    );
    act(() =>
      renderer.root
        .findByType(PetDeleteConfirmDialog.type)
        .props.onConfirm(confirmation()),
    );
    useAuthStore.setState({ session: null });
    await act(async () => {
      resolve({
        deletedPetId: pet.id,
        userId: 'fixture-owner',
        storageCleanup: { failedBuckets: [] },
      });
      await flush();
    });
    expect(usePetStore.getState().pets).toEqual([pet, other]);
  });
  it('requires consent plus exact text even when an onPress is invoked directly', () => {
    const onConfirm = jest.fn();
    mount(dialog(pet, { onConfirm }));
    const press = () => act(() => button('pet-delete-confirm').props.onPress());
    press();
    act(() => button('pet-delete-consent').props.onPress());
    press();
    act(() =>
      renderer.root.findByType(TextInput).props.onChangeText('삭제하기 '),
    );
    press();
    expect(onConfirm).not.toHaveBeenCalled();
    act(() =>
      renderer.root.findByType(TextInput).props.onChangeText('삭제하기'),
    );
    act(() => {
      button('pet-delete-confirm').props.onPress();
      button('pet-delete-confirm').props.onPress();
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(confirmation());
  });
  it('resets consent/text when hidden, reopened or switched to another target', () => {
    mount(dialog());
    act(() => {
      button('pet-delete-consent').props.onPress();
      renderer.root.findByType(TextInput).props.onChangeText('삭제하기');
    });
    update(dialog(other));
    expect(renderer.root.findByType(TextInput).props.value).toBe('');
    expect(button('pet-delete-consent').props.accessibilityState.checked).toBe(
      false,
    );
    update(dialog(other, { visible: false }));
    update(dialog(other));
    expect(button('pet-delete-confirm').props.disabled).toBe(true);
  });
  it('dismisses the IME before the modal, and blocks close/edit during a request', () => {
    const onCancel = jest.fn();
    const dismiss = jest.spyOn(Native.Keyboard, 'dismiss');
    mount(dialog(pet, { onCancel }));
    jest.mocked(Native.Keyboard.isVisible).mockReturnValue(true);
    act(() => renderer.root.findByType(Modal).props.onRequestClose());
    expect(dismiss).toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    jest.mocked(Native.Keyboard.isVisible).mockReturnValue(false);
    act(() => renderer.root.findByType(Modal).props.onRequestClose());
    expect(onCancel).toHaveBeenCalledTimes(1);
    update(dialog(pet, { onCancel, deleting: true }));
    act(() => {
      renderer.root.findByType(Modal).props.onRequestClose();
      button('pet-delete-close').props.onPress();
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(renderer.root.findByType(TextInput).props.editable).toBe(false);
  });
  it('follows wrapped recovery text with separate full-height marker strokes', () => {
    mount(<PetDeletionRecoveryMarker />);
    act(() =>
      label('pet-delete-recovery-copy').props.onTextLayout({
        nativeEvent: {
          lines: [
            { x: 0, y: 0, width: 120, height: 28 },
            { x: 0, y: 28, width: 50, height: 28 },
          ],
        },
      }),
    );
    const strokes = renderer.root
      .findAllByType(View)
      .filter(n => n.props.testID === 'pet-delete-marker-line');
    expect(strokes).toHaveLength(2);
    const first = StyleSheet.flatten(strokes[0].props.style);
    const second = StyleSheet.flatten(strokes[1].props.style);
    expect(first.width).toBe(124);
    expect(first.height).toBeGreaterThan(20);
    expect(Number(second.top) - Number(first.top)).toBe(28);
    expect(second.width).toBe(54);
  });
  it('sizes the named delete menu to content rather than a fixed width', () => {
    mount(
      <PetManagementCard
        pet={{ ...pet, name: '아주 긴 이름의 합성 반려동물' }}
        isSelected
        {...callbacks}
      />,
    );
    act(() =>
      button('pet-more-' + pet.id).props.onPress({
        stopPropagation: jest.fn(),
      }),
    );
    const style = StyleSheet.flatten(view('pet-management-menu').props.style);
    expect(style.width).toBeUndefined();
    expect(style.maxWidth).toBe(361);
    expect(text(renderer)).toContain(
      '아주 긴 이름의 합성 반려동물 프로필 삭제',
    );
  });
});
