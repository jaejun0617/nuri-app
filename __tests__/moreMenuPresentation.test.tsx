import React from 'react';
import * as RN from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { SEASON_CTA } from '../src/app/theme/ctaPalette';
import type { SeasonKey } from '../src/theme/seasonal/season';
import type { AppFontMode } from '../src/app/typography/appFontMode';
import {
  MoreIdentityBand,
  MoreMenuHeader,
  MoreMenuSection,
} from '../src/components/MoreDrawer/MoreMenuPresentation';
import {
  getMoreMenuColors,
  MORE_MENU,
} from '../src/components/MoreDrawer/moreMenuVisualTokens';

let mockSeason: SeasonKey = 'autumn';
let mockFont: AppFontMode = 'pretendard';
let mockDimensions = { width: 384, height: 832, scale: 2.8125, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockDimensions,
}));
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => mockSeason,
}));
jest.mock('../src/app/providers/AppFontPreferenceProvider', () => ({
  ...jest.requireActual('../src/app/providers/AppFontPreferenceProvider'),
  useAppFontPreference: () => ({ mode: mockFont }),
}));

async function render(
  ui: React.ReactElement,
  mode: 'light' | 'dark' = 'light',
) {
  let renderer!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(
      <ThemeProvider theme={createTheme(mode)}>{ui}</ThemeProvider>,
    );
  });
  return renderer;
}

const quickItems = [
  '전체일정',
  '추억 다이어리',
  '건강관리',
  '실내 놀이 추천',
].map((label, i) => ({
  key: `item-${i}`,
  label,
  icon: 'calendar',
  onPress: jest.fn(),
}));

describe('More presentation contracts (not native pixel QA)', () => {
  beforeEach(() => {
    mockSeason = 'autumn';
    mockFont = 'pretendard';
    mockDimensions = { width: 384, height: 832, scale: 2.8125, fontScale: 1 };
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([360, 384, 430])(
    'uses two quick columns at %sdp, single-column at larger text',
    async width => {
      for (const fontScale of [1, 1.3, 1.5]) {
        mockDimensions = { width, height: 832, scale: 2.8125, fontScale };
        const tree = await render(
          <MoreMenuSection title="빠른 이동" items={quickItems} quick />,
        );
        const grid = RN.StyleSheet.flatten(
          tree.root.findByProps({ testID: 'more-quick-grid' }).props.style,
        );
        expect(grid?.flexDirection).toBe(fontScale === 1 ? 'row' : undefined);
        for (const item of quickItems) {
          const button = tree.root.findByProps({
            testID: `more-entry-${item.key}`,
          });
          const style = RN.StyleSheet.flatten(button.props.style);
          expect(style.minHeight).toBe(56);
          expect(style.height).toBeUndefined();
          expect(style.flexBasis).toBe(fontScale === 1 ? '45%' : undefined);
          expect(button.props.accessibilityRole).toBe('button');
        }
        await TestRenderer.act(async () => tree.unmount());
      }
    },
  );

  it.each(['autumn', 'winter', 'spring', 'summer'] as const)(
    'uses shared %s accents without changing geometry',
    async season => {
      mockSeason = season;
      const tree = await render(
        <MoreMenuSection title="빠른 이동" items={quickItems} quick />,
      );
      expect(getMoreMenuColors(createTheme('light'), season).accent).toBe(
        SEASON_CTA[season].primary,
      );
      const boxes = tree.root.findAll(
        node =>
          RN.StyleSheet.flatten(node.props.style)?.backgroundColor ===
          SEASON_CTA[season].subtle,
      );
      expect(boxes.length).toBeGreaterThan(0);
      expect(RN.StyleSheet.flatten(boxes[0].props.style)).toEqual(
        expect.objectContaining({ width: 28, height: 28, borderRadius: 8 }),
      );
      await TestRenderer.act(async () => tree.unmount());
    },
  );

  it.each(['jisu', 'pretendard'] as const)(
    'keeps %s font but makes menu 15/22 and group 13/18',
    async font => {
      mockFont = font;
      const tree = await render(
        <MoreMenuSection
          title="앱 설정"
          items={[
            {
              key: 'font',
              label: '앱 글꼴',
              valueLabel: '귀염발랄체',
              onPress: jest.fn(),
            },
          ]}
        />,
      );
      const texts = tree.root.findAllByType(RN.Text);
      const label = texts.find(node => node.props.children === '앱 글꼴');
      const heading = texts.find(node => node.props.children === '앱 설정');
      expect(RN.StyleSheet.flatten(label?.props.style)).toEqual(
        expect.objectContaining({
          fontSize: 15,
          lineHeight: 22,
          letterSpacing: 0,
        }),
      );
      expect(RN.StyleSheet.flatten(heading?.props.style)).toEqual(
        expect.objectContaining({ fontSize: 13, lineHeight: 18 }),
      );
      expect(RN.StyleSheet.flatten(label?.props.style).fontFamily).toBe(
        font === 'jisu' ? 'insungitCutelivelyjisu' : 'PretendardVariable',
      );
      expect(label?.props.allowFontScaling).toBe(true);
      await TestRenderer.act(async () => tree.unmount());
    },
  );

  it('stacks values, keeps neutral headings and communicates unread state without relying on color', async () => {
    mockDimensions = { width: 360, height: 800, scale: 3, fontScale: 1.5 };
    const tree = await render(
      <MoreMenuSection
        title="앱 설정"
        items={[
          {
            key: 'font',
            label: '앱 글꼴',
            valueLabel: '귀염발랄체',
            badge: 'dot',
            onPress: jest.fn(),
          },
        ]}
      />,
      'dark',
    );
    const button = tree.root.findByProps({ testID: 'more-entry-font' });
    expect(button.props.accessibilityLabel).toContain('읽지 않은 알림 있음');
    const value = button
      .findAllByType(RN.Text)
      .find(node => node.props.children === '귀염발랄체');
    expect(RN.StyleSheet.flatten(value?.props.style).maxWidth).toBeUndefined();
    expect(RN.StyleSheet.flatten(value?.props.style).color).toBe(
      createTheme('dark').colors.textSecondary,
    );
    expect(
      button.findAllByProps({
        importantForAccessibility: 'no-hide-descendants',
      }).length,
    ).toBeGreaterThan(0);
    await TestRenderer.act(async () => tree.unmount());
  });

  it('keeps long names flexible, pet count real and user/pet actions distinct', async () => {
    const onProfile = jest.fn(),
      onPets = jest.fn();
    const tree = await render(
      <MoreIdentityBand
        loggedIn
        nickname="길고 긴 닉네임"
        petName="길고 긴 반려동물 이름"
        petCount={2}
        petSelected={false}
        avatarUri="https://example.invalid/pet.png"
        petColor="#F00"
        onProfile={onProfile}
        onPets={onPets}
      />,
    );
    TestRenderer.act(() =>
      tree.root
        .findByProps({ testID: 'more-entry-my-profile' })
        .props.onPress(),
    );
    expect(onProfile).toHaveBeenCalledTimes(1);
    expect(onPets).not.toHaveBeenCalled();
    const petRow = tree.root.findByProps({ testID: 'more-entry-pet-manage' });
    expect(petRow.props.accessibilityLabel).toContain('등록된 아이 · 총 2마리');
    expect(petRow.props.accessibilityLabel).not.toContain('선택된 아이');
    TestRenderer.act(() => petRow.props.onPress());
    expect(onPets).toHaveBeenCalledTimes(1);
    const image = tree.root.findByType(RN.Image);
    TestRenderer.act(() => image.props.onError());
    expect(tree.root.findAllByType(RN.Image)).toHaveLength(0);
    const nameText = tree.root
      .findAllByType(RN.Text)
      .find(node => node.props.children === '길고 긴 반려동물 이름');
    expect(nameText?.props.numberOfLines).toBeUndefined();
    expect(nameText?.props.adjustsFontSizeToFit).toBeUndefined();
    await TestRenderer.act(async () => tree.unmount());
  });

  it('provides 48dp settings and close controls and a quiet destructive entry', async () => {
    const close = jest.fn(),
      settings = jest.fn(),
      remove = jest.fn();
    const tree = await render(
      <>
        <MoreMenuHeader onClose={close} onSettings={settings} />
        <MoreMenuSection
          title="계정"
          items={[
            {
              key: 'delete',
              label: '회원탈퇴',
              onPress: remove,
              command: true,
              destructive: true,
            },
          ]}
        />
      </>,
    );
    for (const id of ['more-close', 'more-settings-shortcut']) {
      const button = tree.root.findByProps({ testID: id });
      expect(RN.StyleSheet.flatten(button.props.style)).toEqual(
        expect.objectContaining({ width: MORE_MENU.toolTarget, height: 48 }),
      );
      TestRenderer.act(() => button.props.onPress());
    }
    expect(close).toHaveBeenCalledTimes(1);
    expect(settings).toHaveBeenCalledTimes(1);
    const deletion = tree.root.findByProps({ testID: 'more-entry-delete' });
    expect(
      RN.StyleSheet.flatten(deletion.props.style).backgroundColor,
    ).toBeUndefined();
    expect(remove).not.toHaveBeenCalled();
    expect(
      deletion
        .findAllByType(RN.Text)
        .map(node => RN.StyleSheet.flatten(node.props.style).color),
    ).toContain('#B93645');
    await TestRenderer.act(async () => tree.unmount());
  });

  it.each([0, 1, 4])(
    'handles %s pets without inventing a selected pet or picture',
    async count => {
      const tree = await render(
        <MoreIdentityBand
          loggedIn
          nickname={null}
          petName={count ? 'QA' : null}
          petCount={count}
          petSelected={count > 0}
          avatarUri={null}
          petColor="#F00"
          onProfile={jest.fn()}
          onPets={jest.fn()}
        />,
      );
      const pet = tree.root.findByProps({ testID: 'more-entry-pet-manage' });
      expect(pet.props.accessibilityLabel).toContain(
        count ? `총 ${count}마리` : '등록된 아이가 없어요',
      );
      expect(tree.root.findAllByType(RN.Image)).toHaveLength(0);
      await TestRenderer.act(async () => tree.unmount());
    },
  );
});
