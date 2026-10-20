import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import { SEASON_CTA } from '../src/app/theme/ctaPalette';
import CtaButton from '../src/app/ui/CtaButton';
import { HOME_FLOATING_WIDGET_MATERIAL } from '../src/components/home/HomeWidgetMaterial';
import PetDeleteConfirmDialog from '../src/components/pets/PetDeleteConfirmDialog';
import PetManagementCard from '../src/components/pets/PetManagementCard';
import PetManagementScreen from '../src/screens/Pets/PetManagementScreen';
import { formatPetAgeLabelFromBirthDate } from '../src/services/pets/age';
import { deletePetSafely, fetchMyPets } from '../src/services/supabase/pets';
import { useAuthStore } from '../src/store/authStore';
import { usePetStore, type Pet } from '../src/store/petStore';
import type { SeasonKey } from '../src/theme/seasonal/season';
import { diffDaysFromKst } from '../src/utils/date';

let mockSeason: SeasonKey = 'autumn';
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => mockSeason,
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { entrySource: 'more' } }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const runtime = jest.requireActual('react') as typeof React;
    runtime.useEffect(callback, [callback]);
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 24, bottom: 18, left: 0, right: 0 }),
}));
jest.mock('../src/services/supabase/pets', () => ({
  deletePetSafely: jest.fn(),
  fetchMyPets: jest.fn(),
  getPetDeleteErrorMessage: jest.fn(),
}));

const pet: Pet = {
  id: 'pet-card-fixture',
  name: '누리',
  avatarUrl: 'https://example.test/pet.jpg',
  birthDate: '2020-03-01',
  adoptionDate: '2020-03-02',
  species: 'dog',
  speciesKey: 'DOG',
  speciesDetailKey: 'maltese',
  weightKg: 6,
  gender: 'male',
};
const otherPet: Pet = { id: 'pet-other-fixture', name: '구름이' };
const callbacks = {
  onPressSelect: jest.fn(),
  onPressEdit: jest.fn(),
  onPressDelete: jest.fn(),
};
const theme = createTheme('light');

describe('pet management photo cards', () => {
  let renderer: TestRenderer.ReactTestRenderer;
  const originalStore = usePetStore.getState();

  function card(nextPet = pet, isSelected = true) {
    return (
      <ThemeProvider theme={theme}>
        <PetManagementCard
          pet={nextPet}
          isSelected={isSelected}
          {...callbacks}
        />
      </ThemeProvider>
    );
  }
  function renderCard(nextPet = pet, isSelected = true) {
    TestRenderer.act(() => {
      renderer = TestRenderer.create(card(nextPet, isSelected));
    });
  }
  function view(testID: string) {
    const node = renderer.root
      .findAllByType(View)
      .find(item => item.props.testID === testID);
    if (!node) throw new Error(`Missing view: ${testID}`);
    return node;
  }
  function texts() {
    return renderer.root.findAllByType(Text).map(node => node.props.children);
  }
  function action(testID: string) {
    return renderer.root
      .findAllByType(CtaButton)
      .find(node => node.props.testID === testID);
  }
  function renderScreen(pets = [pet, otherPet]) {
    usePetStore.setState({ pets, selectedPetId: pet.id });
    TestRenderer.act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={theme}>
          <PetManagementScreen />
        </ThemeProvider>,
      );
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockSeason = 'autumn';
  });
  afterEach(() => {
    TestRenderer.act(() => {
      renderer?.unmount();
    });
    usePetStore.setState(originalStore);
  });

  it.each([
    [1600, 900],
    [900, 1600],
    [1000, 1000],
  ])(
    'shows the whole %s x %s photo in the left portrait area without distortion',
    (width, height) => {
      renderCard();
      const image = renderer.root.findByType(Image);
      expect(image.props.source).toEqual({ uri: pet.avatarUrl });
      expect(image.props.resizeMode).toBe('contain');
      TestRenderer.act(() => {
        image.props.onLoad?.({
          nativeEvent: { source: { width, height, uri: pet.avatarUrl } },
        });
      });
      const frame = StyleSheet.flatten(
        view(`pet-photo-frame-${pet.id}`).props.style,
      );
      expect(frame).toMatchObject({
        width: '50%',
        overflow: 'hidden',
      });
      expect(frame.aspectRatio).toBeUndefined();
      expect(frame.padding).toBeUndefined();
      expect(StyleSheet.flatten(image.props.style)).toMatchObject({
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      });
    },
  );

  it('does not use photo load dimensions to change the layout', () => {
    renderCard();
    const image = renderer.root.findByType(Image);
    expect(image.props.resizeMode).toBe('contain');
    expect(image.props.onLoad).toBeUndefined();
  });

  it('keeps the frame size unchanged when the profile photo changes', () => {
    renderCard();
    const firstLoad = renderer.root.findByType(Image).props.onLoad;
    TestRenderer.act(() => {
      firstLoad?.({
        nativeEvent: {
          source: { width: 900, height: 1600, uri: pet.avatarUrl },
        },
      });
      renderer.update(
        card({ ...pet, avatarUrl: 'https://example.test/landscape.jpg' }),
      );
    });
    expect(
      StyleSheet.flatten(view(`pet-photo-frame-${pet.id}`).props.style).width,
    ).toBe('50%');
    TestRenderer.act(() => {
      renderer.root.findByType(Image).props.onLoad?.({
        nativeEvent: {
          source: {
            width: 1600,
            height: 900,
            uri: 'https://example.test/landscape.jpg',
          },
        },
      });
    });
    TestRenderer.act(() => {
      firstLoad?.({
        nativeEvent: {
          source: { width: 900, height: 1600, uri: pet.avatarUrl },
        },
      });
    });
    expect(
      StyleSheet.flatten(view(`pet-photo-frame-${pet.id}`).props.style).width,
    ).toBe('50%');
  });

  it('places the portrait and information side by side, with the actions underneath', () => {
    renderCard();
    const content = view(`pet-content-${pet.id}`);
    expect(StyleSheet.flatten(content.props.style)).toMatchObject({
      flexDirection: 'row',
      alignItems: 'stretch',
      minHeight: 224,
    });
    expect(
      content.findAllByProps({ testID: `pet-photo-frame-${pet.id}` }),
    ).not.toHaveLength(0);
    expect(
      content.findAllByProps({ testID: `pet-info-${pet.id}` }),
    ).not.toHaveLength(0);
    expect(
      content.findAllByProps({ testID: `pet-actions-${pet.id}` }),
    ).toHaveLength(0);
    const info = StyleSheet.flatten(view(`pet-info-${pet.id}`).props.style);
    expect(info).toMatchObject({
      flex: 1,
      minWidth: 0,
      padding: 16,
      justifyContent: 'center',
    });
    expect(info.height).toBeUndefined();
  });

  it('aligns the four basic fields and time together as compact label/value rows', () => {
    renderCard();
    for (const field of ['age', 'gender', 'weight', 'birthday', 'together']) {
      const row = view(`pet-${field}-${pet.id}`);
      expect(StyleSheet.flatten(row.props.style)).toMatchObject({
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
      });
      const [label, value] = row.findAllByType(Text);
      expect(StyleSheet.flatten(label.props.style)).toMatchObject({
        fontSize: 12,
        lineHeight: 18,
      });
      expect(StyleSheet.flatten(value.props.style)).toMatchObject({
        flex: 1,
        minWidth: 0,
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'right',
      });
      expect(value.props.allowFontScaling).toBe(true);
      expect(value.props.numberOfLines).toBeUndefined();
      expect(
        StyleSheet.flatten(row.props.style).borderLeftWidth,
      ).toBeUndefined();
    }
    expect(
      view(`pet-age-${pet.id}`).findAllByType(Text)[1].props.children,
    ).toBe(formatPetAgeLabelFromBirthDate(pet.birthDate));
    expect(
      view(`pet-weight-${pet.id}`).findAllByType(Text)[1].props.children,
    ).toBe('6kg');
    expect(
      view(`pet-stats-${pet.id}`)
        .findAllByType(Text)
        .map(node => node.props.children),
    ).toEqual([
      '나이',
      formatPetAgeLabelFromBirthDate(pet.birthDate),
      '성별',
      '남아',
      '몸무게',
      '6kg',
      '생일',
      '2020.03.01',
      '함께한 시간',
      `${diffDaysFromKst(pet.adoptionDate ?? '')}일`,
    ]);
  });

  it('separates readable information from the photo on the shared beveled glass', () => {
    renderCard();
    expect(
      StyleSheet.flatten(view('home-reflective-fill').props.style),
    ).toEqual(expect.objectContaining(HOME_FLOATING_WIDGET_MATERIAL));
    expect(view(`pet-photo-frame-${pet.id}`).findAllByType(Text)).toHaveLength(
      0,
    );
    expect(texts()).toContain('누리');
    expect(texts()).toContain('말티즈');
    expect(texts()).not.toContain('말티즈 · 남아');
    expect(texts()).toContain(formatPetAgeLabelFromBirthDate(pet.birthDate));
    expect(texts()).toContain('몸무게');
    expect(texts()).toContain('6kg');
  });

  it('uses the stored display name for custom breeds and keeps memorial status', () => {
    renderCard({
      ...pet,
      speciesDetailKey: 'custom',
      speciesDisplayName: '믹스견',
      deathDate: '2026-01-01',
    });
    expect(texts()).toContain('믹스견');
    expect(texts()).toContain('추모');
  });

  it('keeps missing data honest instead of fabricating weight or gender', () => {
    renderCard({ id: pet.id, name: pet.name, avatarUrl: null });
    expect(renderer.root.findAllByType(Image)).toHaveLength(0);
    expect(texts()).toContain('등록된 사진이 없어요');
    expect(texts()).toContain('미입력');
    for (const field of ['age', 'gender', 'weight', 'birthday', 'together']) {
      expect(
        view(`pet-${field}-${pet.id}`).findAllByType(Text)[1].props.children,
      ).toBe('미입력');
    }
    expect(texts()).not.toContain('남아');
    expect(texts()).not.toContain('6kg');
  });

  it.each([null, 0, -1, NaN, Infinity])(
    'marks invalid weight %s as missing without removing the row',
    weightKg => {
      renderCard({ ...pet, weightKg });
      expect(
        view(`pet-weight-${pet.id}`).findAllByType(Text)[1].props.children,
      ).toBe('미입력');
    },
  );

  it.each<Pet['gender']>([null, undefined, 'unknown'])(
    'marks unspecified gender %s as missing',
    gender => {
      renderCard({ ...pet, gender });
      expect(
        view(`pet-gender-${pet.id}`).findAllByType(Text)[1].props.children,
      ).toBe('미입력');
    },
  );

  it.each([null, '', 'invalid', '2020-02-30', '2020-13-01'])(
    'does not invent an age or birthday from %s',
    birthDate => {
      renderCard({ ...pet, birthDate });
      for (const field of ['age', 'birthday']) {
        expect(
          view(`pet-${field}-${pet.id}`).findAllByType(Text)[1].props.children,
        ).toBe('미입력');
      }
    },
  );

  it.each([null, '', 'invalid', '2020-02-30', '2999-01-01'])(
    'does not invent time together from missing or unusable adoption date %s',
    adoptionDate => {
      renderCard({ ...pet, adoptionDate });
      expect(
        view(`pet-together-${pet.id}`).findAllByType(Text)[1].props.children,
      ).toBe('미입력');
    },
  );

  it('updates birthday, age and time together when the stored dates change', () => {
    renderCard();
    TestRenderer.act(() => {
      renderer.update(card({ ...pet, adoptionDate: '2021-01-01' }));
    });
    expect(
      view(`pet-together-${pet.id}`).findAllByType(Text)[1].props.children,
    ).toBe(`${diffDaysFromKst('2021-01-01')}일`);
    TestRenderer.act(() => {
      renderer.update(
        card({ ...pet, adoptionDate: '2021-01-01', birthDate: '2021-12-25' }),
      );
    });
    expect(
      view(`pet-birthday-${pet.id}`).findAllByType(Text)[1].props.children,
    ).toBe('2021.12.25');
    expect(
      view(`pet-age-${pet.id}`).findAllByType(Text)[1].props.children,
    ).toBe(formatPetAgeLabelFromBirthDate('2021-12-25'));
  });

  it('handles a failed photo and retries when a different profile URL arrives', () => {
    renderCard();
    TestRenderer.act(() => {
      renderer.root.findByType(Image).props.onError();
    });
    expect(texts()).toContain('사진을 불러오지 못했어요');
    TestRenderer.act(() => {
      renderer.update(
        card({ ...pet, avatarUrl: 'https://example.test/updated.jpg' }),
      );
    });
    expect(renderer.root.findByType(Image).props.source.uri).toBe(
      'https://example.test/updated.jpg',
    );
  });

  it('updates weight, sex and species labels without remounting the memoized card', () => {
    renderCard();
    TestRenderer.act(() => {
      renderer.update(
        card({
          ...pet,
          weightKg: 5.25,
          gender: 'female',
          speciesDisplayName: '새 품종',
        }),
      );
    });
    expect(texts()).toContain('5.25kg');
    expect(texts()).toContain('새 품종');
    expect(texts()).toContain('여아');
    expect(texts()).not.toContain('6kg');
  });

  it('places the selected status, edit and delete in one row with unchanged callbacks', () => {
    renderCard();
    expect(
      StyleSheet.flatten(view(`pet-actions-${pet.id}`).props.style),
    ).toMatchObject({ flexDirection: 'row' });
    expect(view(`pet-selected-status-${pet.id}`).props.accessibilityLabel).toBe(
      '누리, 지금 보고 있는 아이',
    );
    expect(action(`pet-select-${pet.id}`)).toBeUndefined();
    TestRenderer.act(() => {
      action(`pet-edit-${pet.id}`)?.props.onPress();
      action(`pet-delete-entry-${pet.id}`)?.props.onPress();
    });
    expect(callbacks.onPressEdit).toHaveBeenCalledWith(pet.id);
    expect(callbacks.onPressDelete).toHaveBeenCalledWith(pet.id);
    expect(callbacks.onPressSelect).not.toHaveBeenCalled();
  });

  it.each<SeasonKey>(['spring', 'summer', 'autumn', 'winter'])(
    'uses the existing %s subtle season palette for selected and selectable pets',
    season => {
      mockSeason = season;
      renderCard({ ...pet, themeColor: '#000000' });
      const selected = view(`pet-selected-status-${pet.id}`);
      expect(StyleSheet.flatten(selected.props.style)).toMatchObject({
        backgroundColor: SEASON_CTA[season].subtle,
        minHeight: 48,
      });
      expect(selected.props.onPress).toBeUndefined();
      const selectedLabel = selected
        .findAllByType(Text)
        .find(node => node.props.children === '보고 있어요');
      expect(StyleSheet.flatten(selectedLabel?.props.style).color).toBe(
        SEASON_CTA[season].primary,
      );
      const check = selected.find(
        node => String(node.type) === 'Feather' && node.props.name === 'check',
      );
      expect(check.props.color).toBe(SEASON_CTA[season].primary);
      TestRenderer.act(() => {
        renderer.update(card({ ...pet, themeColor: '#000000' }, false));
      });
      const select = renderer.root
        .findAllByType(TouchableOpacity)
        .find(node => node.props.accessibilityLabel === '누리 선택하기');
      expect(select).toBeDefined();
      expect(StyleSheet.flatten(select?.props.style)).toMatchObject({
        backgroundColor: SEASON_CTA[season].subtle,
        minHeight: 48,
      });
      expect(
        StyleSheet.flatten(select?.findByType(Text).props.style).color,
      ).toBe(SEASON_CTA[season].primary);
    },
  );

  it.each<SeasonKey>(['spring', 'summer', 'autumn', 'winter'])(
    'keeps %s add primary, edit charcoal and delete soft pink/red',
    season => {
      mockSeason = season;
      renderScreen();
      const buttons = renderer.root.findAllByType(CtaButton);
      const add = buttons.find(button =>
        button
          .findAllByType(Text)
          .some(label => label.props.children === '+ 아이 등록하기'),
      );
      if (!add) throw new Error('Missing add pet action');
      const edit = action(`pet-edit-${pet.id}`);
      const remove = action(`pet-delete-entry-${pet.id}`);
      if (!edit || !remove) throw new Error('Missing pet card actions');
      for (const [button, palette] of [
        [
          add,
          { backgroundColor: SEASON_CTA[season].primary, color: '#FFFFFF' },
        ],
        [edit, { backgroundColor: 'rgba(255,255,255,0.62)', color: '#243042' }],
        [
          remove,
          { backgroundColor: 'rgba(255,241,243,0.85)', color: '#B93645' },
        ],
      ] as const) {
        const host = button.find(
          node => typeof node.props.style === 'function',
        );
        expect(
          StyleSheet.flatten(host.props.style({ pressed: false })),
        ).toMatchObject({
          backgroundColor: palette.backgroundColor,
          minHeight: 48,
        });
        expect(
          StyleSheet.flatten(button.findByType(Text).props.style).color,
        ).toBe(palette.color);
      }
    },
  );

  it('selects only the requested pet and exposes clear accessible action names', () => {
    renderCard(pet, false);
    const select = renderer.root.findAllByProps({
      accessibilityLabel: '누리 선택하기',
    })[0];
    expect(select).toBeDefined();
    TestRenderer.act(() => {
      select.props.onPress();
    });
    expect(callbacks.onPressSelect).toHaveBeenCalledWith(pet.id);
    expect(action(`pet-edit-${pet.id}`)?.props.accessibilityLabel).toBe(
      '누리 프로필 수정하기',
    );
    expect(action(`pet-delete-entry-${pet.id}`)?.props.accessibilityHint).toBe(
      '확인 절차를 열며 바로 삭제하지 않습니다.',
    );
  });

  it('allows long names and enlarged fonts without imposing a fixed card height', () => {
    const name = '정말긴이름을가지고있는우리집사랑스러운반려동물';
    renderCard({ ...pet, name });
    const label = renderer.root
      .findAllByType(Text)
      .find(node => node.props.children === name);
    expect(label?.props.numberOfLines).toBeUndefined();
    expect(label?.props.allowFontScaling).toBe(true);
    expect(StyleSheet.flatten(label?.props.style)).toMatchObject({
      fontSize: 18,
      lineHeight: 24,
      flexShrink: 1,
    });
    const row = StyleSheet.flatten(view(`pet-actions-${pet.id}`).props.style);
    expect(row.height).toBeUndefined();
    for (const button of renderer.root.findAllByType(CtaButton)) {
      const layout = StyleSheet.flatten(button.props.style);
      expect(layout).toMatchObject({ flex: 1, minWidth: 0, minHeight: 48 });
    }
  });

  it('uses the compact count subtitle and retains edit and add destinations', () => {
    renderScreen();
    expect(texts()).toContain('우리 아이 2마리');
    TestRenderer.act(() => {
      action(`pet-edit-${pet.id}`)?.props.onPress();
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith('PetProfileEdit', {
      petId: pet.id,
      entrySource: 'stack',
    });
    const add = renderer.root
      .findAllByType(CtaButton)
      .find(node =>
        node
          .findAllByType(Text)
          .some(text => text.props.children === '+ 아이 등록하기'),
      );
    TestRenderer.act(() => {
      add?.props.onPress();
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith('PetCreate', {
      from: 'header_plus',
    });
  });

  it('keeps the scrolling viewport above system navigation as well as padding the content end', () => {
    renderScreen();
    expect(
      StyleSheet.flatten(view('pet-management-screen').props.style),
    ).toMatchObject({ paddingBottom: 18 });
  });

  it('opens the existing confirmation without immediately deleting any pet', () => {
    renderScreen();
    TestRenderer.act(() => {
      action(`pet-delete-entry-${pet.id}`)?.props.onPress();
    });
    expect(
      renderer.root.findByType(PetDeleteConfirmDialog.type).props.pet.id,
    ).toBe(pet.id);
    expect(deletePetSafely).not.toHaveBeenCalled();
  });

  it('keeps the last-pet deletion guard', () => {
    renderScreen([pet]);
    TestRenderer.act(() => {
      action(`pet-delete-entry-${pet.id}`)?.props.onPress();
    });
    expect(
      renderer.root.findAllByType(PetDeleteConfirmDialog.type),
    ).toHaveLength(0);
    expect(texts()).toContain('최소 1개의 아이 프로필은 필요해요.');
    expect(deletePetSafely).not.toHaveBeenCalled();
  });
  it('removes a confirmed deleted pet even while local Walk cleanup is pending', async () => {
    useAuthStore.setState({ session: { access_token: 'fixture', refresh_token: 'fixture', expires_in: 3600, token_type: 'bearer', user: { id: 'fixture-owner', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00.000Z' } } });
    jest.mocked(deletePetSafely).mockResolvedValueOnce({ deletedPetId: pet.id, userId: 'fixture-owner', walkCleanupPending: true, storageCleanup: { failedBuckets: [] } });
    jest.mocked(fetchMyPets).mockResolvedValueOnce([otherPet]); renderScreen();
    TestRenderer.act(() => action(`pet-delete-entry-${pet.id}`)?.props.onPress());
    await TestRenderer.act(async () => { renderer.root.findByType(PetDeleteConfirmDialog.type).props.onConfirm(); await new Promise<void>(r => setImmediate(r)); });
    expect(usePetStore.getState().pets.map(p => p.id)).toEqual([otherPet.id]);
  });
});
