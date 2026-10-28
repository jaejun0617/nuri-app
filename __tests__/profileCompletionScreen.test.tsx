import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { BackHandler } from 'react-native';
import PetProfileEditDoneScreen from '../src/screens/Pets/PetProfileEditDoneScreen';
import {
  ProfileCompletionPhoto,
  ProfileCompletionArtwork,
} from '../src/screens/Pets/ProfileCompletionArtwork';
import type { ProfileCompletionReceipt } from '../src/screens/Pets/profileCompletionPresentation';
import { styles } from '../src/screens/Pets/PetProfileEditDoneScreen.styles';

const mockNavigation = { reset: jest.fn() };
let mockOwner = 'qa-owner';
let mockReceipt: ProfileCompletionReceipt;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { petId: 'edited', savedProfile: mockReceipt } }),
  useFocusEffect: (effect: () => void) => {
    jest
      .requireActual<typeof import('react')>('react')
      .useEffect(effect, [effect]);
  },
}));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (
    selector: (state: { session: { user: { id: string } } }) => unknown,
  ) => selector({ session: { user: { id: mockOwner } } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 384, height: 832, scale: 2.8125, fontScale: 1 }),
}));
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/components/icons/NuriSemanticIcon', () => 'Icon');
jest.mock('../src/components/pets/PetAvatar', () => 'PetAvatar');
jest.mock('@react-native-masked-view/masked-view', () => 'MaskedView');

describe('confirmed profile completion screen', () => {
  let tree: Renderer.ReactTestRenderer | undefined;
  beforeEach(() => {
    jest.clearAllMocks();
    mockOwner = 'qa-owner';
    mockReceipt = {
      ownerId: mockOwner,
      savedPet: {
        id: 'edited',
        name: '보리',
        avatarUrl: 'https://example.test/new.jpg',
        species: 'cat',
        speciesDisplayName: '코리안 쇼트헤어',
        weightKg: 4.15,
        gender: 'female',
      },
    };
  });
  afterEach(async () => {
    if (tree) await act(async () => tree?.unmount());
    tree = undefined;
  });
  const mount = async () => {
    await act(async () => {
      tree = Renderer.create(<PetProfileEditDoneScreen />);
    });
  };
  it('uses the same confirmed photo in both fixed-size containers without looking up selected pet', async () => {
    await mount();
    const photos = tree?.root.findAllByType(ProfileCompletionPhoto);
    expect(photos).toHaveLength(2);
    expect(photos?.map(photo => photo.props.uri)).toEqual([
      mockReceipt.savedPet.avatarUrl,
      mockReceipt.savedPet.avatarUrl,
    ]);
    const art = tree?.root.findByType(ProfileCompletionArtwork);
    expect(art?.props.name).toBe('보리');
    expect(art?.props.width).toBeGreaterThan(0);
  });
  it('shares photo failure fallback instead of leaving the old example dog in one container', async () => {
    await mount();
    await act(async () =>
      tree?.root.findAllByType(ProfileCompletionPhoto)[0].props.onError(),
    );
    expect(
      tree?.root
        .findAllByType(ProfileCompletionPhoto)
        .map(photo => photo.props.uri),
    ).toEqual([null, null]);
    expect(
      tree?.root.findAll(
        node =>
          typeof node.type === 'string' &&
          node.props.testID === 'profile-completion-photo-fallback',
      ),
    ).toHaveLength(2);
  });
  it('handles repeated CTA taps with one explicit Home reset', async () => {
    await mount();
    const button = tree?.root.findAll(
      node =>
        node.props.accessibilityLabel === '홈으로 가기' &&
        typeof node.props.onPress === 'function',
    )[0];
    expect(button).toBeDefined();
    act(() => {
      button?.props.onPress();
      button?.props.onPress();
    });
    expect(mockNavigation.reset).toHaveBeenCalledTimes(1);
    expect(mockNavigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
    });
  });
  it('routes Android Back to Home, not the completed editor', async () => {
    const add = jest.spyOn(BackHandler, 'addEventListener');
    try {
      await mount();
      const back = add.mock.calls.find(
        ([event]) => event === 'hardwareBackPress',
      )?.[1];
      expect(back).toBeDefined();
      act(() => {
        expect(back?.({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(true);
      });
      expect(mockNavigation.reset).toHaveBeenCalledTimes(1);
    } finally {
      add.mockRestore();
    }
  });
  it('never displays a previous owner receipt after an account switch', async () => {
    mockOwner = 'different-owner';
    await mount();
    expect(tree?.root.findAllByType(ProfileCompletionArtwork)).toHaveLength(0);
    expect(
      tree?.root.findAllByProps({ testID: 'profile-completion-summary' }),
    ).toHaveLength(0);
  });
  it('applies the latest PO total-minus-3sp adjustment to every success-screen text role', () => {
    expect([
      styles.title.fontSize,
      styles.compactTitle.fontSize,
      styles.body.fontSize,
      styles.name.fontSize,
      styles.savedText.fontSize,
      styles.label.fontSize,
      styles.value.fontSize,
      styles.guide.fontSize,
      styles.buttonText.fontSize,
    ]).toEqual([29, 25, 14, 21, 11, 11, 17, 11, 18]);
  });
  it.each(['wide', 'portrait', 'square'])(
    'keeps the photo window stable for %s input without an image-ratio layout callback',
    async shape => {
      mockReceipt.savedPet.avatarUrl = `https://example.test/${shape}.jpg`;
      await mount();
      const window = tree?.root.findAll(
        node =>
          typeof node.type === 'string' &&
          node.props.testID === 'profile-completion-photo-window',
      )[0];
      expect(window).toBeDefined();
      expect(window?.props.style.width).toBeCloseTo(
        (((384 * 480) / 852) * 256) / 480,
      );
      expect(window?.props.style.height).toBeCloseTo(
        (((384 * 480) / 852) * 274) / 480,
      );
      expect(window?.props.style.overflow).toBe('hidden');
      expect(window?.props.onLayout).toBeUndefined();
    },
  );
});
