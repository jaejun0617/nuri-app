import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PetProfileEditScreen from '../src/screens/Pets/PetProfileEditScreen';
import PhotoAddCard from '../src/components/media/PhotoAddCard';
import PetThemePicker from '../src/components/pets/PetThemePicker';
import CtaButton from '../src/app/ui/CtaButton';
import { usePetStore, type Pet } from '../src/store/petStore';
import { fetchMyPets, updatePet } from '../src/services/supabase/pets';
import { uploadPetAvatar } from '../src/services/supabase/storagePets';
import { pickPhotoAssets } from '../src/services/media/photoPicker';
import { recommendPetThemeColor } from '../src/services/pets/themePalette';

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
  const theme = () => {
    if (!tree) throw Error('PROFILE_NOT_MOUNTED');
    return tree.root.findByType(PetThemePicker);
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
  it('does not rehydrate an active photo and color draft when the same pet cache is invalidated', async () => {
    await mount();
    await act(async () => photo().props.onPress());
    const selectedColor = theme().props.selectedColor;
    expect(selectedColor).toBe(recommendPetThemeColor({ imageBase64: 'aW1hZ2U=', name: pet.name, petId: pet.id }));
    expect(photo().props.imageUri).toBe(localUri);
    await act(async () => usePetStore.getState().invalidatePetAvatar(pet.id, { userId: mockUserId, persist: false }));
    expect(photo().props.imageUri).toBe(localUri);
    expect(theme().props.selectedColor).toBe(selectedColor);
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
    const selectedColor = recommendPetThemeColor({ imageBase64: 'aW1hZ2U=', name: pet.name, petId: pet.id });
    expect(updatePet).toHaveBeenCalledWith(expect.objectContaining({ themeColor: selectedColor, avatarPath: 'qa/new-immutable.jpg' }));
    expect(jest.mocked(updatePet).mock.calls[0]?.[0]).not.toHaveProperty('speciesKey');
    if (!resolvePets) throw Error('SERVER_READ_NOT_STARTED');
    await act(async () => {
      resolvePets?.([{ ...pet, themeColor: selectedColor, avatarPath: 'qa/new-immutable.jpg', avatarUrl: 'https://example.test/new.jpg' }]);
      await save;
    });
    expect(photo().props.imageUri).toBe(localUri);
    expect(usePetStore.getState().pets[0].avatarUrl).toBe('https://example.test/new.jpg');
    expect(mockNavigation.replace).toHaveBeenCalledWith('PetProfileEditDone', { petId: pet.id, petName: pet.name });
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
  it('preserves the selected photo and explicit color after an upload failure without publishing success', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.mocked(uploadPetAvatar).mockRejectedValueOnce(new Error('QA_UPLOAD_FAILURE'));
    try {
      await mount();
      await act(async () => photo().props.onPress());
      await act(async () => theme().props.onSelectColor('#663399'));
      if (!tree) throw Error('PROFILE_NOT_MOUNTED');
      const button = tree.root.findByType(CtaButton);
      await act(async () => button.props.onPress());
      expect(photo().props.imageUri).toBe(localUri);
      expect(theme().props.selectedColor).toBe('#663399');
      expect(usePetStore.getState().pets[0].avatarUrl).toBe(pet.avatarUrl);
      expect(updatePet).not.toHaveBeenCalled();
      expect(mockNavigation.replace).not.toHaveBeenCalled();
      expect(alert).toHaveBeenCalledTimes(1);
    } finally {
      alert.mockRestore();
    }
  });
});
