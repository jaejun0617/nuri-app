import React from 'react';
import fs from 'fs';
import path from 'path';
import TestRenderer, { act } from 'react-test-renderer';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { SEASON_CTA } from '../src/app/theme/ctaPalette';
import type { SeasonKey } from '../src/theme/seasonal/season';
import MarkerText from '../src/app/ui/MarkerText';
import HeaderTextActionButton from '../src/components/navigation/HeaderTextActionButton';
import RecordChoiceGrid from '../src/components/records/RecordChoiceGrid';
import { BlurView } from '@sbaiahmed1/react-native-blur';
import { MoreMenuSection } from '../src/components/MoreDrawer/MoreMenuPresentation';
import { formatPetCopy, getPetDisplayName } from '../src/utils/petDisplayName';
import { usePetDisplayName } from '../src/hooks/usePetDisplayName';
import { usePetStore } from '../src/store/petStore';

let mockSeason: SeasonKey = 'autumn';
let mockDimensions = { width: 384, height: 832, scale: 2.8125, fontScale: 1 };
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => mockSeason,
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockDimensions,
}));

describe('pet copy and context', () => {
  it.each([
    ['누리', '누리를', '누리와'],
    ['똥', '똥을', '똥과'],
    [' 구름 ', '구름을', '구름과'],
    ['', '반려동물을', '반려동물과'],
    [null, '반려동물을', '반려동물과'],
    ['Nuri', 'Nuri를', 'Nuri와'],
  ])('keeps existing particle policy for %s', (name, object, companion) => {
    expect(formatPetCopy('우리 아이를 위한', name)).toBe(`${object} 위한`);
    expect(formatPetCopy('우리 아이와 함께', name)).toBe(`${companion} 함께`);
    expect(formatPetCopy('우리 아이의 기록', name)).toBe(
      `${getPetDisplayName(name)}의 기록`,
    );
  });
  it('switches Home names but never substitutes another pet for a missing explicit ID', () => {
    const before = usePetStore.getState();
    const Name = ({ id }: { id?: string | null }) => (
      <Text>{usePetDisplayName(id)}</Text>
    );
    let tree!: TestRenderer.ReactTestRenderer;
    try {
      act(() => {
        usePetStore.setState({
          pets: [
            { id: 'a', name: '누리' },
            { id: 'b', name: '똥' },
          ],
          selectedPetId: 'a',
        });
        tree = TestRenderer.create(
          <>
            <Name />
            <Name id="b" />
            <Name id="missing" />
            <Name id={null} />
          </>,
        );
      });
      expect(
        tree.root.findAllByType(Text).map(node => node.props.children),
      ).toEqual(['누리', '똥', '반려동물', '반려동물']);
      act(() => usePetStore.setState({ selectedPetId: 'b' }));
      expect(tree.root.findAllByType(Text)[0].props.children).toBe('똥');
    } finally {
      act(() => {
        tree?.unmount();
        usePetStore.setState(before);
      });
    }
  });
});

describe('compact controls and seasonal emphasis', () => {
  let tree: TestRenderer.ReactTestRenderer;
  const render = (children: React.ReactNode) =>
    act(() => {
      tree = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>{children}</ThemeProvider>,
      );
    });
  afterEach(() => act(() => tree?.unmount()));
  it.each(['autumn', 'winter', 'spring', 'summer'] as const)(
    'uses %s marker and text-only action without changing hit geometry',
    season => {
      mockSeason = season;
      const onPress = jest.fn();
      render(
        <>
          <MarkerText>제목</MarkerText>
          <HeaderTextActionButton
            appearance="seasonalText"
            label="등록"
            accessibilityLabel="기록 등록"
            onPress={onPress}
          />
        </>,
      );
      const marker = tree.root.findByType(MarkerText).findByType(Text);
      act(() =>
        marker.props.onTextLayout({
          nativeEvent: { lines: [{ x: 0, y: 0, width: 100, height: 24 }] },
        }),
      );
      const paint = tree.root
        .findByType(MarkerText)
        .findAllByType(View)
        .find(node => node.props.pointerEvents === 'none');
      expect(StyleSheet.flatten(paint?.props.style).backgroundColor).toBe(
        SEASON_CTA[season].border,
      );
      const button = tree.root.findByType(TouchableOpacity);
      expect(StyleSheet.flatten(button.props.style)).toMatchObject({
        minHeight: 48,
        minWidth: 48,
        borderWidth: 0,
        backgroundColor: 'transparent',
        paddingHorizontal: 6,
      });
      expect(
        StyleSheet.flatten(button.findByType(Text).props.style).color,
      ).toBe(SEASON_CTA[season].primary);
      act(() => button.props.onPress());
      expect(onPress).toHaveBeenCalledTimes(1);
    },
  );
  it.each([360, 384, 430])(
    'keeps equal selector widths and 48dp targets at %s',
    width => {
      for (const fontScale of [1, 1.3, 1.5]) {
        mockDimensions = { ...mockDimensions, width, fontScale };
        const onSelect = jest.fn();
        render(
          <RecordChoiceGrid
            options={[
              { key: 'bath', label: '목욕' },
              { key: 'trim', label: '부분 미용' },
            ]}
            selected={['bath']}
            onSelect={onSelect}
            multiple
          />,
        );
        const buttons = tree.root.findAllByType(TouchableOpacity);
        expect(
          buttons.map(node => StyleSheet.flatten(node.props.style).width),
        ).toEqual(Array(2).fill(fontScale === 1 ? '33.333333%' : '50%'));
        expect(
          buttons.every(
            node => StyleSheet.flatten(node.props.style).minHeight === 48,
          ),
        ).toBe(true);
        expect(buttons[0].props.accessibilityState.checked).toBe(true);
        act(() => buttons[1].props.onPress());
        expect(onSelect).toHaveBeenCalledWith('trim');
        act(() => tree.unmount());
      }
    },
  );
  it('blocks the header action while saving', () => {
    render(
      <HeaderTextActionButton
        appearance="seasonalText"
        loading
        label="수정"
        accessibilityLabel="기록 수정"
        onPress={jest.fn()}
      />,
    );
    const button = tree.root.findByType(TouchableOpacity);
    expect(button.props.disabled).toBe(true);
    expect(button.props.accessibilityState.busy).toBe(true);
  });
  it('uses one glass material per menu group without losing the destination', () => {
    const onPress = jest.fn();
    render(
      <MoreMenuSection
        title="생활 정보"
        items={[{ key: 'guide', label: '집사 꿀팁', onPress }]}
      />,
    );
    expect(tree.root.findAllByType(BlurView)).toHaveLength(1);
    act(() => tree.root.findByType(TouchableOpacity).props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('keeps backdrop outside foreground capture exclusion and removes persistent drawer texture caches', () => {
    const read = (file: string) =>
      fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const drawer = read('src/components/MoreDrawer/MoreDrawer.tsx');
    expect(drawer).not.toContain('renderToHardwareTextureAndroid');
    expect(drawer).not.toContain('shouldRasterizeIOS');
    const menu = read('src/screens/More/MoreDrawerContent.tsx');
    expect(menu.indexOf('<SeasonalAmbientBackground')).toBeLessThan(
      menu.indexOf('<BlurCaptureExclusion'),
    );
    expect(
      menu.slice(
        menu.indexOf('<BlurCaptureExclusion'),
        menu.indexOf('</BlurCaptureExclusion>'),
      ),
    ).toContain('<ScrollView');
    expect(read('src/components/common/BlurCaptureExclusion.tsx')).toContain(
      "requireNativeComponent<ViewProps>('NuriBlurCaptureExclusion')",
    );
  });
});
