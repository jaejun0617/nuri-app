import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import {
  HomeHeroPhotoBackground,
  useHomeHeroPhoto,
} from '../src/screens/Main/components/LoggedInHome/HomeHeroPhotoBackground';
import { SeasonalHomeAutumnStage } from '../src/screens/Main/components/LoggedInHome/SeasonalHomeAutumn';
import type { SeasonKey } from '../src/theme/seasonal/season';

const homeSource = fs.readFileSync(
  path.join(
    __dirname,
    '../src/screens/Main/components/LoggedInHome/LoggedInHome.tsx',
  ),
  'utf8',
);

describe('Home Hero original photo review wiring', () => {
  it('places the current pet photo behind the existing header, not an attached design asset', () => {
    expect(homeSource).toContain(
      'const heroPhoto = useHomeHeroPhoto(selectedAvatarUri)',
    );
    const stage = homeSource.slice(
      homeSource.indexOf('<SeasonalHomeAutumnStage'),
      homeSource.indexOf('</SeasonalHomeAutumnStage>'),
    );
    expect(stage).toMatch(/background=\{\s*<HomeHeroPhotoBackground/);
    expect(stage).toContain('uri={selectedAvatarUri}');
    expect(stage).toContain('aspectRatio={heroPhoto.aspectRatio}');
    expect(stage).toContain('{homeHeader}');
    expect(stage).toContain('{activeAlarmNotice}');
    expect(stage).toContain('{homeHero}');
    expect(stage).not.toContain('codex-clipboard');
    expect(stage).not.toContain('resizeMode="cover"');
  });

  it('temporarily hides the ring while preserving edit and the lower information wiring', () => {
    expect(homeSource).toContain(
      'const HOME_HERO_PROFILE_RING_VISIBLE = false;',
    );
    const identity = homeSource.slice(
      homeSource.indexOf('const HeroProfileIdentity'),
      homeSource.indexOf('const HeroProfileAccordion'),
    );
    expect(identity).toContain('{HOME_HERO_PROFILE_RING_VISIBLE ? (');
    expect(identity).toContain('onPress={onPressPetProfileEdit}');
    expect(identity).toContain('accessibilityLabel="반려동물 프로필 수정"');
    expect(identity).toContain(
      '{ width: avatarDiameter, height: avatarDiameter }',
    );
    expect(identity).not.toContain('styles.heroTogetherPill');
    const info = homeSource.slice(
      homeSource.indexOf('<HomeHeroInfoPanel'),
      homeSource.indexOf(
        '<FixedTypographyBoundary>',
        homeSource.indexOf('<HomeHeroInfoPanel'),
      ),
    );
    expect(info).toContain('profilePetName={profilePetName}');
    expect(info).toContain('titleBadge={homeTitleBadge}');
    expect(info).not.toContain('topMetaLine=');
    expect(info).toContain('togetherDays={togetherDays}');
    expect(info).toContain('onPressProfileInfo={openProfileInfoSheet}');
  });

  it('moves structured pet basics into the first bottom-sheet item rather than parsing a Hero string', () => {
    expect(homeSource).toContain('basicInfo={profileBasicInfo}');
    const sheet = homeSource.slice(homeSource.indexOf('const ProfileInfoBottomSheet'), homeSource.indexOf('const HeroProfileSection'));
    expect(sheet).toContain('<HomePetBasicInfoSection');
    expect(sheet).toContain('info={basicInfo}');
    expect(sheet).toContain('${profilePetName}의 소개와 취향');
    expect(sheet).not.toContain('${profilePetName}의 취향 이야기');
    expect(sheet.indexOf('<HomePetBasicInfoSection')).toBeLessThan(sheet.indexOf('<HeroProfileAccordion'));
    expect(homeSource).not.toContain('const topMetaLine =');
    expect(homeSource).toContain('breed, age: ageText, weight: weightText, gender: genderText');
  });
});

type Dimensions = { width: number; height: number };
const photoUri = 'https://example.test/current-pet.jpg';

describe('original-ratio Hero photo background', () => {
  let renderer: TestRenderer.ReactTestRenderer;
  let requests: Map<
    string,
    {
      resolve: (dimensions: Dimensions) => void;
      reject: (error: Error) => void;
    }
  >;
  const pressed = jest.fn();

  function Harness({
    uri,
    width = 384,
    season = 'autumn',
  }: {
    uri: string | null;
    width?: number;
    season?: SeasonKey;
  }) {
    const photo = useHomeHeroPhoto(uri);
    const photoHeight = photo.aspectRatio ? width / photo.aspectRatio : 0;
    return (
      <SeasonalHomeAutumnStage
        atmosphere={1}
        atmosphereAspectRatio={1}
        backgroundImageVisible={false}
        ambientSeason={season}
        minHeight={Math.max(704, photoHeight)}
        background={
          <HomeHeroPhotoBackground
            uri={uri}
            aspectRatio={photo.aspectRatio}
            onError={photo.onError}
          />
        }
      >
        <TouchableOpacity testID="preserved-header-action" onPress={pressed} />
      </SeasonalHomeAutumnStage>
    );
  }

  async function render(
    uri: string | null = photoUri,
    width = 384,
    season: SeasonKey = 'autumn',
  ) {
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <Harness uri={uri} width={width} season={season} />,
      );
    });
  }

  async function resolve(uri: string, dimensions: Dimensions) {
    const request = requests.get(uri);
    if (!request) throw new Error('Photo metadata request not found');
    await TestRenderer.act(async () => request.resolve(dimensions));
  }

  beforeEach(() => {
    pressed.mockReset();
    requests = new Map();
    jest.spyOn(Image, 'getSize').mockImplementation(
      (uri: string) =>
        new Promise<Dimensions>((resolveSize, reject) => {
          requests.set(uri, { resolve: resolveSize, reject });
        }),
    );
  });
  afterEach(() => {
    TestRenderer.act(() => renderer?.unmount());
    jest.restoreAllMocks();
  });

  it.each([
    [1200, 1600],
    [1600, 900],
    [1000, 1000],
  ])(
    'shows the full %s x %s source with its native aspect ratio',
    async (width, height) => {
      await render();
      expect(renderer.root.findAllByType(Image)).toHaveLength(0);
      await resolve(photoUri, { width, height });
      const image = renderer.root.findByType(Image);
      expect(image.props.source).toEqual({ uri: photoUri });
      expect(image.props.resizeMode).toBe('contain');
      expect(StyleSheet.flatten(image.props.style)).toMatchObject({
        width: '100%',
        top: 0,
        left: 0,
        position: 'absolute',
        aspectRatio: width / height,
      });
      const style = StyleSheet.flatten(image.props.style);
      expect(style.height).toBeUndefined();
      expect(style.borderRadius).toBeUndefined();
      expect(style.transform).toBeUndefined();
    },
  );

  it.each<SeasonKey>(['spring', 'summer', 'autumn', 'winter'])(
    'uses identical untouchable photo geometry behind the %s content',
    async season => {
      await render(photoUri, 384, season);
      await resolve(photoUri, { width: 1200, height: 1600 });
      const views = renderer.root.findAllByType(View);
      const stage = views[0];
      const background = views.find(
        view => view.props.testID === 'home-hero-photo-background',
      );
      if (!background) throw new Error('Photo background missing');
      expect(background.props.pointerEvents).toBe('none');
      expect(background.props.accessible).toBe(false);
      expect(background.props.importantForAccessibility).toBe(
        'no-hide-descendants',
      );
      expect(StyleSheet.flatten(background.props.style)).toMatchObject({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      });
      expect(StyleSheet.flatten(stage.props.style)).toMatchObject({
        marginHorizontal: -16,
        minHeight: 704,
        backgroundColor: 'transparent',
      });
      const directChildren = stage.children.filter(
        child => typeof child !== 'string',
      );
      expect(
        directChildren[0].findByProps({
          testID: 'home-hero-photo-background',
        }),
      ).toBe(background);
      expect(directChildren[0].findAllByType(Image)).toHaveLength(1);
      renderer.root
        .findByProps({ testID: 'preserved-header-action' })
        .props.onPress();
      expect(pressed).toHaveBeenCalledTimes(1);
    },
  );

  it.each([320, 384, 430])(
    'allows a tall original photo to fit at %s dp without clipping it',
    async width => {
      await render(photoUri, width);
      await resolve(photoUri, { width: 1000, height: 3000 });
      const stage = renderer.root.findAllByType(View)[0];
      expect(StyleSheet.flatten(stage.props.style).minHeight).toBe(width * 3);
      expect(renderer.root.findByType(Image).props.resizeMode).toBe('contain');
    },
  );

  it.each([
    [0, 10],
    [10, 0],
    [-1, 10],
    [NaN, 10],
    [10, Infinity],
  ])(
    'does not invent a photo ratio from invalid dimensions %s x %s',
    async (width, height) => {
      await render();
      await resolve(photoUri, { width, height });
      expect(renderer.root.findAllByType(Image)).toHaveLength(0);
    },
  );

  it('uses the unchanged seasonal canvas when no photo exists or metadata fails', async () => {
    await render(null);
    expect(Image.getSize).not.toHaveBeenCalled();
    expect(renderer.root.findAllByType(Image)).toHaveLength(0);
    await TestRenderer.act(async () =>
      renderer.update(<Harness uri={photoUri} />),
    );
    const request = requests.get(photoUri);
    if (!request) throw new Error('Photo metadata request missing');
    await TestRenderer.act(async () =>
      request.reject(new Error('fixture unavailable')),
    );
    expect(renderer.root.findAllByType(Image)).toHaveLength(0);
  });

  it('removes the old pet photo immediately and ignores its late metadata', async () => {
    await render();
    const oldRequest = requests.get(photoUri);
    if (!oldRequest) throw new Error('Old metadata request missing');
    const nextUri = 'https://example.test/other-pet.jpg';
    await TestRenderer.act(async () =>
      renderer.update(<Harness uri={nextUri} />),
    );
    expect(renderer.root.findAllByType(Image)).toHaveLength(0);
    await resolve(nextUri, { width: 1600, height: 900 });
    await TestRenderer.act(async () =>
      oldRequest.resolve({ width: 900, height: 1600 }),
    );
    const image = renderer.root.findByType(Image);
    expect(image.props.source).toEqual({ uri: nextUri });
    expect(StyleSheet.flatten(image.props.style).aspectRatio).toBe(1600 / 900);
  });

  it('clears a failed image but an old image error cannot clear a new photo', async () => {
    await render();
    await resolve(photoUri, { width: 1200, height: 1600 });
    const oldError = renderer.root.findByType(Image).props.onError;
    const nextUri = 'https://example.test/new-photo.jpg';
    await TestRenderer.act(async () =>
      renderer.update(<Harness uri={nextUri} />),
    );
    await resolve(nextUri, { width: 1600, height: 900 });
    await TestRenderer.act(async () => oldError());
    expect(renderer.root.findByType(Image).props.source.uri).toBe(nextUri);
    await TestRenderer.act(async () =>
      renderer.root.findByType(Image).props.onError(),
    );
    expect(renderer.root.findAllByType(Image)).toHaveLength(0);
  });
});
