import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import ReactNative, {
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import LinearGradient from 'react-native-linear-gradient';

import AppText from '../src/app/ui/AppText';
import { HomePetSelectionSheet } from '../src/screens/Main/components/LoggedInHome/HomePetSelectionSheet';
import { HomePetSheetHeader } from '../src/screens/Main/components/LoggedInHome/HomePetSheetHeader';
import { HOME_SEASONAL_BACKGROUND_GRADIENTS } from '../src/theme/home/seasonalAmbient';
import type { SeasonKey } from '../src/theme/seasonal/season';

jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 28, left: 0, right: 0 }),
}));

const homeSource = fs.readFileSync(
  path.join(
    __dirname,
    '../src/screens/Main/components/LoggedInHome/LoggedInHome.tsx',
  ),
  'utf8',
);
const pets = [
  { id: 'pet-one', name: '누리', avatarUrl: 'https://example.test/nuri.jpg' },
  { id: 'pet-two', name: '보리', avatarUrl: null },
  { id: 'pet-three', name: '콩이', avatarUrl: null },
  { id: 'pet-four', name: '두부', avatarUrl: null },
  {
    id: 'pet-five',
    name: '아주 긴 이름을 가진 소중한 우리 아이',
    avatarUrl: null,
  },
];

describe('Home pet selection and contextual editing', () => {
  const renderers: TestRenderer.ReactTestRenderer[] = [];
  const events: string[] = [];
  const onClose = jest.fn(() => {
    events.push('close');
  });
  const onSelect = jest.fn((id: string) => {
    events.push(`select:${id}`);
  });
  const onManage = jest.fn(() => {
    events.push('manage');
  });

  async function renderSheet(
    overrides: Partial<React.ComponentProps<typeof HomePetSelectionSheet>> = {},
  ) {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <HomePetSelectionSheet
          visible
          pets={pets}
          selectedPetId="pet-one"
          season="autumn"
          accentColor="#22C55E"
          onClose={onClose}
          onSelect={onSelect}
          onManage={onManage}
          {...overrides}
        />,
      );
    });
    renderers.push(renderer);
    return renderer;
  }

  beforeEach(() => {
    events.length = 0;
    jest.clearAllMocks();
    jest
      .spyOn(ReactNative, 'useWindowDimensions')
      .mockReturnValue({ width: 320, height: 700, scale: 3, fontScale: 1.3 });
  });
  afterEach(async () => {
    for (const renderer of renderers.splice(0))
      await act(async () => renderer.unmount());
    jest.restoreAllMocks();
  });

  it('removes duplicate header identity while reusing the existing selection, management and edit routes', () => {
    const header = homeSource.slice(
      homeSource.indexOf('const HomeHeaderSection'),
      homeSource.indexOf('const HeroProfileIdentity'),
    );
    expect(header).not.toContain('petSwitcherRow');
    expect(header).not.toContain('petAddChip');
    expect(homeSource).not.toContain('pets.slice(0, 4)');
    expect(homeSource).toContain('onPressPetSelect={openPetSelectionSheet}');
    expect(homeSource).toContain('onSelect={onPressPetChip}');
    expect(homeSource).toContain(
      "navigation.navigate('PetManagement', { entrySource: 'home' })",
    );
    expect(homeSource).toContain("navigation.navigate('PetProfileEdit', {");
    expect(homeSource).toContain('petSelectionOwnerId === sessionUserId');
    expect(homeSource).toContain("key={sessionUserId ?? 'guest'}");
    expect(homeSource).toContain(
      '!hasMultiplePets || !isScreenFocused || petSelectionOwnerId !== sessionUserId',
    );
  });

  it('renders every actual pet, one selected radio, and no registration or per-row edit control', async () => {
    const renderer = await renderSheet();
    const rows = renderer.root
      .findAllByType(TouchableOpacity)
      .filter(node => node.props.accessibilityRole === 'radio');
    expect(rows).toHaveLength(5);
    expect(
      rows.filter(node => node.props.accessibilityState.checked),
    ).toHaveLength(1);
    expect(rows[0].props.accessibilityLabel).toBe('누리, 보고 있어요');
    expect(rows[1].props.accessibilityLabel).toBe('보리, 선택하기');
    expect(
      renderer.root.findAllByProps({ testID: 'home-profile-sheet-edit' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'home-pet-manage' }),
    ).toBeDefined();
    expect(
      rows.every(row => StyleSheet.flatten(row.props.style).minHeight >= 48),
    ).toBe(true);
  });

  it('dismisses before one context switch and ignores repeated taps', async () => {
    const renderer = await renderSheet();
    const row = renderer.root.findByProps({
      testID: 'home-pet-option-pet-two',
    });
    await act(async () => {
      row.props.onPress();
      row.props.onPress();
    });
    expect(events).toEqual(['close', 'select:pet-two']);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('dismisses the already selected pet without fetching or switching it again', async () => {
    const renderer = await renderSheet();
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'home-pet-option-pet-one' })
        .props.onPress(),
    );
    expect(events).toEqual(['close']);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('closes before opening existing management', async () => {
    const renderer = await renderSheet();
    await act(async () =>
      renderer.root.findByProps({ testID: 'home-pet-manage' }).props.onPress(),
    );
    expect(events).toEqual(['close', 'manage']);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it.each(['hardware', 'backdrop', 'close'] as const)(
    'dismisses through %s without any selection',
    async way => {
      const renderer = await renderSheet();
      await act(async () => {
        if (way === 'hardware')
          renderer.root.findByType(Modal).props.onRequestClose();
        else if (way === 'backdrop')
          renderer.root
            .findByProps({ accessibilityLabel: '아이 선택 바깥 영역 닫기' })
            .props.onPress();
        else
          renderer.root
            .findByProps({ testID: 'home-pet-sheet-close' })
            .props.onPress();
      });
      expect(events).toEqual(['close']);
    },
  );

  it('does not render a hidden sheet and resets its one-action lock when reopened', async () => {
    const renderer = await renderSheet({ visible: false });
    expect(renderer.root.findAllByType(Modal)).toHaveLength(0);
    const props = {
      pets,
      selectedPetId: 'pet-one',
      season: 'autumn' as const,
      accentColor: '#22C55E',
      onClose,
      onSelect,
      onManage,
    };
    await act(async () =>
      renderer.update(<HomePetSelectionSheet visible {...props} />),
    );
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'home-pet-sheet-close' })
        .props.onPress(),
    );
    await act(async () =>
      renderer.update(<HomePetSelectionSheet visible={false} {...props} />),
    );
    await act(async () =>
      renderer.update(<HomePetSelectionSheet visible {...props} />),
    );
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'home-pet-option-pet-two' })
        .props.onPress(),
    );
    expect(events).toEqual(['close', 'close', 'select:pet-two']);
  });

  it('supports missing photos, long names and safe-area bounds with small scalable text', async () => {
    const renderer = await renderSheet();
    const missing = renderer.root.findByProps({
      testID: 'home-pet-option-pet-five',
    });
    expect(missing.findAllByType(Image)).toHaveLength(0);
    const name = missing
      .findAllByType(AppText)
      .find(node => node.props.children === pets[4].name);
    if (!name) throw new Error('Full pet name missing');
    expect(name.props.children).toBe(pets[4].name);
    expect(name.props.numberOfLines).toBeUndefined();
    expect(name.props.allowFontScaling).not.toBe(false);
    expect(StyleSheet.flatten(name.props.style)).toMatchObject({
      minWidth: 0,
      flexShrink: 1,
      fontSize: 14,
    });
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'home-pet-selection-sheet' }).props
          .style,
      ),
    ).toMatchObject({ maxHeight: 644, paddingBottom: 40 });
  });

  it.each<SeasonKey>(['spring', 'summer', 'autumn', 'winter'])(
    'reuses the %s canvas with unchanged geometry',
    async season => {
      const renderer = await renderSheet({ season });
      const background = renderer.root
        .findAllByType(LinearGradient)
        .find(
          node =>
            node.props.colors[0] ===
            HOME_SEASONAL_BACKGROUND_GRADIENTS[season][0],
        );
      expect(background?.props.colors).toEqual([
        ...HOME_SEASONAL_BACKGROUND_GRADIENTS[season],
      ]);
      expect(
        StyleSheet.flatten(
          renderer.root.findByProps({ testID: 'home-pet-selection-sheet' })
            .props.style,
        ),
      ).toMatchObject({ borderTopLeftRadius: 28, borderTopRightRadius: 28 });
    },
  );

  it('keeps a compact title and black close control without duplicating the Home edit action', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <HomePetSheetHeader
          title="아주 긴 이름을 가진 누리의 소개와 취향"
          closeLabel="프로필 상세 닫기"
          onClose={onClose}
        />,
      );
    });
    renderers.push(renderer);
    expect(
      renderer.root.findAllByProps({ testID: 'home-profile-sheet-edit' }),
    ).toHaveLength(0);
    const close = renderer.root.findByProps({ testID: 'home-pet-sheet-close' });
    expect(StyleSheet.flatten(close.props.style)).toMatchObject({
      width: 48,
      height: 48,
    });
    expect(close.props.hitSlop).toEqual({
      top: 8,
      bottom: 8,
      left: 8,
      right: 8,
    });
    const cross = close.findAll(node => node.props.name === 'x')[0];
    expect(cross.props.color).toBe('#000000');
    const title = renderer.root
      .findAllByType(AppText)
      .find(node => node.props.accessibilityRole === 'header');
    expect(StyleSheet.flatten(title?.props.style)).toMatchObject({
      minWidth: 0,
      flexShrink: 1,
      fontSize: 16,
    });
    expect(title?.props.numberOfLines).toBeUndefined();
    await act(async () => close.props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(renderer.root.findAllByType(Image)).toHaveLength(0);
  });
});
