import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import MainScreen from '../src/screens/Main/MainScreen';

let mockFocused = false;
const mockLoadWelcome = jest.fn();
const mockConsumeWelcome = jest.fn().mockResolvedValue(undefined);
const mockAuth = {
  isLoggedIn: true, session: { user: { id: 'qa-owner' } },
  profile: { nickname: 'QA' }, profileSyncStatus: 'ready',
  passwordRecoveryFlow: { status: 'inactive' },
};
const mockPets = {
  pets: [{ id: 'qa-pet', name: 'QA' }], selectedPetId: 'qa-pet',
  loading: false, errorMessage: null,
};
jest.mock('@react-navigation/native', () => {
  const runtime: typeof React = jest.requireActual('react');
  return {
    useNavigation: () => ({ getParent: () => undefined, reset: jest.fn(), navigate: jest.fn() }),
    useFocusEffect: (callback: () => void | (() => void)) => runtime.useEffect(
      () => mockFocused ? callback() : undefined, [callback, mockFocused],
    ),
  };
});
jest.mock('../src/store/authStore', () => ({ useAuthStore: (select: (state: typeof mockAuth) => unknown) => select(mockAuth) }));
jest.mock('../src/store/petStore', () => ({ usePetStore: (select: (state: typeof mockPets) => unknown) => select(mockPets) }));
jest.mock('../src/store/uiStore', () => ({ showToast: jest.fn() }));
jest.mock('../src/services/monitoring/sentry', () => ({ captureMonitoringException: jest.fn() }));
jest.mock('../src/services/local/firstPetWelcome', () => ({
  loadFirstPetWelcomePending: () => mockLoadWelcome(),
  consumeFirstPetWelcome: (owner: string) => mockConsumeWelcome(owner),
}));
jest.mock('../src/screens/Main/components/LoggedInHome/LoggedInHome', () => 'LoggedInHome');
jest.mock('../src/components/common/ConfirmDialog', () => 'ConfirmDialog');
jest.mock('../src/components/onboarding/FirstPetWelcomeModal', () => 'FirstPetWelcomeModal');

test('a preloaded Home cannot open or consume the first-pet welcome before focus', async () => {
  mockFocused = false;
  mockLoadWelcome.mockResolvedValue({ userId: 'qa-owner', petId: 'qa-pet', petName: 'QA' });
  let tree: Renderer.ReactTestRenderer | null = null;
  try {
    await act(async () => { tree = Renderer.create(<MainScreen />); });
    if (!tree) throw Error('MainScreen did not mount');
    const mounted: Renderer.ReactTestRenderer = tree;
    const modal = () => mounted.root.find(node => (node.type as unknown) === 'FirstPetWelcomeModal');
    expect(mockLoadWelcome).not.toHaveBeenCalled();
    expect(modal().props.visible).toBe(false);
    expect(mockConsumeWelcome).not.toHaveBeenCalled();
    mockFocused = true;
    await act(async () => mounted.update(<MainScreen />));
    expect(mockLoadWelcome).toHaveBeenCalledTimes(1);
    expect(modal().props.visible).toBe(true);
    await act(async () => modal().props.onConfirm());
    expect(mockConsumeWelcome).toHaveBeenCalledWith('qa-owner');
    expect(modal().props.visible).toBe(false);
  } finally {
    if (tree) await act(async () => tree?.unmount());
  }
});
