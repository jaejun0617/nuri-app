import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  buildFirstPetWelcomeCopy,
  consumeFirstPetWelcome,
  FIRST_PET_WELCOME_STORAGE_PREFIXES_FOR_TEST,
  isFirstPetOnboardingEntry,
  loadFirstPetWelcomePending,
  markFirstPetWelcomePending,
} from '../src/services/local/firstPetWelcome';

describe('first pet welcome copy', () => {
  it.each([
    ['보리', '보리와'],
    ['두부', '두부와'],
    ['몽실', '몽실과'],
    ['콩', '콩과'],
  ])('%s의 받침에 맞는 조사를 적용한다', (petName, expectedName) => {
    expect(buildFirstPetWelcomeCopy(petName)).toEqual({
      body: `${expectedName} 함께할 소중한 공간이 준비됐어요.`,
      cta: `${expectedName} 함께하기`,
    });
  });

  it.each([null, undefined, '', '   ', 'null', 'undefined'])(
    '유효하지 않은 펫 이름 %p은 안전한 문구로 대체한다',
    petName => {
      expect(buildFirstPetWelcomeCopy(petName)).toEqual({
        body: '반려동물과 함께할 소중한 공간이 준비됐어요.',
        cta: '반려동물과 함께하기',
      });
    },
  );

  it('비한글 이름에서도 crash 없이 안전한 조사를 사용한다', () => {
    expect(buildFirstPetWelcomeCopy('Nuri').cta).toBe('Nuri와 함께하기');
  });
});

describe('first pet welcome state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('NicknameSetup에서 auto 진입한 PetCreate만 최초 온보딩으로 인정한다', () => {
    expect(
      isFirstPetOnboardingEntry({
        entrySource: 'auto',
        previousRouteName: 'NicknameSetup',
      }),
    ).toBe(true);
    expect(
      isFirstPetOnboardingEntry({
        entrySource: 'auto',
        previousRouteName: 'AppTabs',
      }),
    ).toBe(false);
    expect(
      isFirstPetOnboardingEntry({
        entrySource: 'header_plus',
        previousRouteName: 'AppTabs',
      }),
    ).toBe(false);
  });

  it('pending 상태를 사용자별로 저장하고 복원한다', async () => {
    const storage = new Map<string, string>();
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
      Promise.resolve(storage.get(key) ?? null),
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(
      (key: string, value: string) => {
        storage.set(key, value);
        return Promise.resolve();
      },
    );

    await markFirstPetWelcomePending({
      userId: 'user-a',
      petId: 'pet-a',
      petName: '누리',
      now: 1234,
    });

    await expect(loadFirstPetWelcomePending('user-a')).resolves.toEqual({
      version: 1,
      petId: 'pet-a',
      petName: '누리',
      createdAt: 1234,
    });
    await expect(loadFirstPetWelcomePending('user-b')).resolves.toBeNull();
  });

  it('소비 상태를 먼저 기록한 뒤 pending을 제거한다', async () => {
    const calls: string[] = [];
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string) => {
      calls.push(`set:${key}`);
      return Promise.resolve();
    });
    (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
      calls.push(`remove:${key}`);
      return Promise.resolve();
    });

    await consumeFirstPetWelcome('user-a');

    expect(calls).toEqual([
      `set:${FIRST_PET_WELCOME_STORAGE_PREFIXES_FOR_TEST.consumed}:user-a`,
      `remove:${FIRST_PET_WELCOME_STORAGE_PREFIXES_FOR_TEST.pending}:user-a`,
    ]);
  });

  it('이미 소비한 사용자에게 pending을 다시 열지 않는다', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('consumed');

    await markFirstPetWelcomePending({
      userId: 'user-a',
      petId: 'pet-new',
      petName: '새 펫',
    });

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('손상된 pending 값은 표시 대상으로 복원하지 않는다', async () => {
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce('{broken-json')
      .mockResolvedValueOnce(null);

    await expect(loadFirstPetWelcomePending('user-a')).resolves.toBeNull();
  });
});
