import React from 'react';
import { StyleSheet, View } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { NuriAlert as Alert } from '../src/app/ui/NuriAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PetProfileEditScreen from '../src/screens/Pets/PetProfileEditScreen';
import PhotoAddCard from '../src/components/media/PhotoAddCard';
import PetThemePicker from '../src/components/pets/PetThemePicker';
import CtaButton from '../src/app/ui/CtaButton';
import { usePetStore, type Pet } from '../src/store/petStore';
import { fetchMyPets, updatePet } from '../src/services/supabase/pets';
import { uploadPetAvatar } from '../src/services/supabase/storagePets';
import { pickPhotoAssets } from '../src/services/media/photoPicker';
import { captureSavedPetProfile } from '../src/screens/Pets/profileCompletionPresentation';
import { AppHeaderLayout } from '../src/components/navigation/AppHeaderLayout';
import { HeaderHelpButton } from '../src/components/navigation/HeaderHelpButton';
import { APP_HEADER } from '../src/components/navigation/headerAppearance';

const mockNavigation = { replace: jest.fn(), goBack: jest.fn(), reset: jest.fn() };
let mockPetId = 'qa-pet-a';
let mockUserId = 'qa-owner';
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { petId: mockPetId, entrySource: 'stack' } }),
  useIsFocused: () => true,
}));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (selector: (state: { session: { user: { id: string } } }) => unknown) => selector({ session: { user: { id: mockUserId } } }),
}));
jest.mock('../src/services/supabase/client', () => ({
  supabase: { auth: { getUser: jest.fn(async () => ({ data: { user: { id: mockUserId } } })) } },
}));
jest.mock('../src/services/supabase/pets', () => ({ fetchMyPets: jest.fn(), updatePet: jest.fn() }));
jest.mock('../src/services/supabase/storagePets', () => ({ uploadPetAvatar: jest.fn() }));
jest.mock('../src/services/media/photoPicker', () => ({ pickPhotoAssets: jest.fn() }));
jest.mock('../src/services/files/readFileAsBase64', () => ({ readFileAsBase64: jest.fn(async () => 'aW1hZ2U=') }));
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({ useEffectiveSeason: () => 'autumn' }));
jest.mock('../src/hooks/useEntryAwareBackAction', () => ({ useEntryAwareBackAction: () => jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 18, left: 0, right: 0 }) }));
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardStickyView: 'KeyboardStickyView', KeyboardAwareScrollView: 'KeyboardAwareScrollView',
  useReanimatedKeyboardAnimation: () => ({ progress: { value: 0 } }),
}));
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/app/ui/AppTextInput', () => 'AppTextInput');
jest.mock('../src/app/ui/CtaButton', () => ({ __esModule: true, default: 'CtaButton', CtaText: 'CtaText' }));
jest.mock('../src/components/media/PhotoAddCard', () => 'PhotoAddCard');
jest.mock('../src/components/pets/PetThemePicker', () => 'PetThemePicker');
jest.mock('../src/components/date-picker/DatePickerModal', () => 'DatePickerModal');
jest.mock('../src/components/health/WeightLogEntrySheet', () => 'WeightLogEntrySheet');
jest.mock('../src/components/icons/NuriFeatherIcon', () => 'Icon');

describe('profile photo draft and confirmed snapshot handoff', () => {
  let tree: Renderer.ReactTestRenderer | undefined;
  const originalStore = usePetStore.getState();
  const pet: Pet = { id: 'qa-pet-a', name: 'QA Pet', species: 'dog', speciesKey: 'DOG', themeColor: '#1234AA', avatarPath: 'qa/old.jpg', avatarUrl: 'https://example.test/old.jpg' };
  const localUri = 'file:///qa/new.jpg';
  const mount = async () => { await act(async () => { tree = Renderer.create(<PetProfileEditScreen />); }); };
  const photo = () => {
    if (!tree) throw Error('PROFILE_NOT_MOUNTED');
    return tree.root.findByType(PhotoAddCard);
  };
  const expectNoColorPicker = () => {
    if (!tree) throw Error('PROFILE_NOT_MOUNTED');
    expect(tree.root.findAllByType(PetThemePicker)).toHaveLength(0);
    expect(StyleSheet.flatten(photo().props.containerStyle).borderColor).toBe('#D5CBF6');
  };
  beforeEach(() => {
    jest.clearAllMocks();
    mockPetId = pet.id;
    mockUserId = 'qa-owner';
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    usePetStore.setState({ ...originalStore, pets: [{ ...pet }], selectedPetId: pet.id });
    jest.mocked(pickPhotoAssets).mockResolvedValue({ status: 'success', assets: [{ uri: localUri, mimeType: 'image/jpeg', fileName: 'new.jpg' }] });
    jest.mocked(uploadPetAvatar).mockResolvedValue({ path: 'qa/new-immutable.jpg' });
    jest.mocked(updatePet).mockResolvedValue(undefined);
  });
  afterEach(async () => {
    if (tree) await act(async () => tree?.unmount());
    tree = undefined;
    usePetStore.setState(originalStore);
  });
  it('uses menu glass and the shared header without modifying the profile', async () => {
    await mount();
    if (!tree) throw Error('PROFILE_NOT_MOUNTED');
    expect(tree.root.findByType(AppHeaderLayout).props.topInset).toBe(24);
    expect(tree.root.findByType(HeaderHelpButton).props.topic).toBe('petEdit');
    expect(StyleSheet.flatten(tree.root.findByProps({ testID: 'pet-edit-back' }).props.style)).toMatchObject({ width: APP_HEADER.targetSize, height: APP_HEADER.targetSize });
    const cards = tree.root.findAllByType(View).filter(node => node.props.testID === 'pet-edit-card-glass');
    expect(cards).toHaveLength(4);
    cards.forEach(node => {
      expect(StyleSheet.flatten(node.props.style).borderRadius).toBe(22);
      expect(node.props.pointerEvents).toBe('none');
      let card = node.parent;
      while (card && !card.props.style) card = card.parent;
      expect(StyleSheet.flatten(card?.props.style)).toMatchObject({ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.78)' });
    });
    expect(updatePet).not.toHaveBeenCalled();
    expect(usePetStore.getState().pets[0]).toEqual(pet);
  });
  it('does not rehydrate an active photo and keeps the removed color control absent on cache invalidation', async () => {
    await mount();
    await act(async () => photo().props.onPress());
    expectNoColorPicker();
    expect(photo().props.imageUri).toBe(localUri);
    await act(async () => usePetStore.getState().invalidatePetAvatar(pet.id, { userId: mockUserId, persist: false }));
    expect(photo().props.imageUri).toBe(localUri);
    expectNoColorPicker();
    expect(usePetStore.getState().pets[0].themeColor).toBe(pet.themeColor);
  });
  it('shows lavender for an unset color without writing it during an unrelated profile save', async () => {
    const uncolored = { ...pet, themeColor: null };
    usePetStore.setState({ pets: [uncolored], selectedPetId: pet.id });
    jest.mocked(fetchMyPets).mockResolvedValueOnce([uncolored]);
    await mount();
    expectNoColorPicker();
    await act(async () => photo().props.onPress());
    expectNoColorPicker();
    await act(async () => tree?.root.findByType(CtaButton).props.onPress());
    expect(updatePet).toHaveBeenCalledWith(expect.objectContaining({ themeColor: null }));
  });
  it('keeps the selected local preview until the confirmed server snapshot is ready without publishing an empty avatar', async () => {
    let resolvePets: ((pets: Pet[]) => void) | undefined;
    jest.mocked(fetchMyPets).mockImplementation(() => new Promise(resolve => { resolvePets = resolve; }));
    await mount();
    await act(async () => photo().props.onPress());
    if (!tree) throw Error('PROFILE_NOT_MOUNTED');
    const button = tree.root.findByType(CtaButton);
    let save: Promise<void> | undefined;
    await act(async () => { save = button.props.onPress(); await Promise.resolve(); });
    expect(fetchMyPets).toHaveBeenCalledTimes(1);
    expect(photo().props.imageUri).toBe(localUri);
    expect(usePetStore.getState().pets[0].avatarUrl).toBe(pet.avatarUrl);
    const selectedColor = pet.themeColor;
    expect(updatePet).toHaveBeenCalledWith(expect.objectContaining({ themeColor: selectedColor, avatarPath: 'qa/new-immutable.jpg' }));
    expect(jest.mocked(updatePet).mock.calls[0]?.[0]).not.toHaveProperty('speciesKey');
    if (!resolvePets) throw Error('SERVER_READ_NOT_STARTED');
    await act(async () => {
      resolvePets?.([{ ...pet, themeColor: selectedColor, avatarPath: 'qa/new-immutable.jpg', avatarUrl: 'https://example.test/new.jpg' }]);
      await save;
    });
    expect(photo().props.imageUri).toBe(localUri);
    expect(usePetStore.getState().pets[0].avatarUrl).toBe('https://example.test/new.jpg');
    expect(mockNavigation.replace).toHaveBeenCalledWith('PetProfileEditDone', {
      petId: pet.id, petName: pet.name,
      savedProfile: { ownerId: mockUserId, savedPet: captureSavedPetProfile(usePetStore.getState().pets[0]) },
    });
  });
  it('hydrates a genuinely different pet instead of carrying the previous local draft across identities', async () => {
    await mount();
    await act(async () => photo().props.onPress());
    mockPetId = 'qa-pet-b';
    await act(async () => {
      usePetStore.setState({ pets: [{ ...pet }, { id: mockPetId, name: 'QA B', avatarUrl: 'https://example.test/b.jpg', themeColor: '#448811' }] });
      tree?.update(<PetProfileEditScreen />);
    });
    expect(photo().props.imageUri).toBe('https://example.test/b.jpg');
  });
  it('preserves the photo and legacy saved value after upload failure without exposing a color editor', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.mocked(uploadPetAvatar).mockRejectedValueOnce(new Error('QA_UPLOAD_FAILURE'));
    try {
      await mount();
      await act(async () => photo().props.onPress());
      if (!tree) throw Error('PROFILE_NOT_MOUNTED');
      const button = tree.root.findByType(CtaButton);
      await act(async () => button.props.onPress());
      expect(photo().props.imageUri).toBe(localUri);
      expectNoColorPicker();
      expect(usePetStore.getState().pets[0].themeColor).toBe(pet.themeColor);
      expect(usePetStore.getState().pets[0].avatarUrl).toBe(pet.avatarUrl);
      expect(updatePet).not.toHaveBeenCalled();
      expect(mockNavigation.replace).not.toHaveBeenCalled();
      expect(alert).toHaveBeenCalledTimes(1);
    } finally {
      alert.mockRestore();
    }
  });
  it('latches same-frame save taps until the confirmed server read finishes', async () => {
    let resolvePets: ((pets: Pet[]) => void) | undefined;
    jest.mocked(fetchMyPets).mockImplementationOnce(() => new Promise(resolve => { resolvePets = resolve; }));
    await mount();
    if (!tree) throw Error('PROFILE_NOT_MOUNTED');
    const press = tree.root.findByType(CtaButton).props.onPress;
    let first: Promise<void> | undefined;
    await act(async () => { first = press(); await press(); });
    expect(updatePet).toHaveBeenCalledTimes(1);
    expect(mockNavigation.replace).not.toHaveBeenCalled();
    await act(async () => { resolvePets?.([pet]); await first; });
    expect(mockNavigation.replace).toHaveBeenCalledTimes(1);
  });
  it('does not publish a late read after the account changes', async () => {
    let resolvePets: ((pets: Pet[]) => void) | undefined;
    jest.mocked(fetchMyPets).mockImplementationOnce(() => new Promise(resolve => { resolvePets = resolve; }));
    await mount();
    if (!tree) throw Error('PROFILE_NOT_MOUNTED');
    let save: Promise<void> | undefined;
    await act(async () => { save = tree?.root.findByType(CtaButton).props.onPress(); await Promise.resolve(); });
    mockUserId = 'different-owner';
    await act(async () => { tree?.update(<PetProfileEditScreen />); });
    await act(async () => { resolvePets?.([{ ...pet, name: 'Late result' }]); await save; });
    expect(mockNavigation.replace).not.toHaveBeenCalled();
    expect(usePetStore.getState().pets[0].name).toBe(pet.name);
  });
  it('does not claim success if the confirmed read no longer contains the saved pet', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.mocked(fetchMyPets).mockResolvedValueOnce([{ id: 'different-pet', name: 'Other pet' }]);
    try {
      await mount();
      await act(async () => { await tree?.root.findByType(CtaButton).props.onPress(); });
      expect(mockNavigation.replace).not.toHaveBeenCalled();
      expect(usePetStore.getState().pets[0].id).toBe(pet.id);
      expect(alert).toHaveBeenCalledTimes(1);
    } finally { alert.mockRestore(); }
  });
});
