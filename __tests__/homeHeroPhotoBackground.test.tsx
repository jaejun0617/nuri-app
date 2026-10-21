import React from 'react';
import { Image, StyleSheet } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { HomeHeroPhotoBackground } from '../src/screens/Main/components/LoggedInHome/HomeHeroPhotoBackground';
import { getHomeHeroPhotoGeometry, getHomeHeroMinimumHeight, getHomeHeroTypography, HOME_HERO_TOOLBAR_RADIUS } from '../src/theme/home/heroLayout';

jest.mock('../src/app/ui/AppText', () => 'AppText');

describe('fixed full-bleed Home photo frame', () => {
  let renderer: Renderer.ReactTestRenderer;
  const uri = 'https://example.test/pet-a.jpg';
  const render = async (photo: string | null = uri, width = 412) => {
    await act(async () => {
      renderer = Renderer.create(<HomeHeroPhotoBackground uri={photo} frameWidth={width} />);
    });
  };
  const frame = () => StyleSheet.flatten(renderer.root.findByProps({ testID: 'home-hero-photo-frame' }).props.style);
  const image = () => renderer.root.findByType(Image);
  afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); });

  it.each([[1600, 900], [1000, 1000], [900, 1200], [900, 1600], [500, 4000]])(
    'ignores source metadata %s x %s both before and after loading',
    async (width, height) => {
      const metadata = jest.spyOn(Image, 'getSize');
      await render();
      const before = frame();
      await act(async () => image().props.onLoad({ nativeEvent: { source: { width, height } } }));
      expect(frame()).toEqual(before);
      expect(frame()).toMatchObject({ width: '100%', height: 412 * 1061 / 852 });
      expect(image().props.resizeMode).toBe('cover');
      expect(StyleSheet.flatten(image().props.style)).toMatchObject({ top: 0, bottom: 0, left: 0, right: 0, opacity: 1 });
      expect(metadata).not.toHaveBeenCalled();
      metadata.mockRestore();
    },
  );

  it('reserves the same frame for missing, loading, error and retry', async () => {
    await render(null);
    const initial = frame();
    await act(async () => renderer.update(<HomeHeroPhotoBackground uri={uri} frameWidth={412} />));
    expect(frame()).toEqual(initial);
    const firstAttempt = image().props;
    await act(async () => firstAttempt.onError());
    expect(frame()).toEqual(initial);
    const retry = renderer.root.findByProps({ accessibilityLabel: '프로필 사진 다시 불러오기' });
    expect(StyleSheet.flatten(retry.props.style).minHeight).toBe(48);
    await act(async () => retry.props.onPress());
    await act(async () => firstAttempt.onError());
    expect(renderer.root.findAllByType(Image)).toHaveLength(1);
    expect(frame()).toEqual(initial);
    await act(async () => image().props.onLoad());
    expect(frame()).toEqual(initial);
  });

  it('ignores late load and error callbacks belonging to the previous photo', async () => {
    await render();
    const old = image().props;
    await act(async () => renderer.update(<HomeHeroPhotoBackground uri="https://example.test/pet-b.jpg" frameWidth={412} />));
    await act(async () => { old.onLoad(); old.onError(); });
    expect(image().props.source.uri).toBe('https://example.test/pet-b.jpg');
    expect(StyleSheet.flatten(image().props.style).opacity).toBe(0);
    await act(async () => image().props.onLoad());
    expect(StyleSheet.flatten(image().props.style).opacity).toBe(1);
  });

  it('removes loading and fallback copy from accessibility after the image is ready', async () => {
    await render();
    const loading = renderer.root.findAll(node => node.props.accessibilityLabel === '프로필 사진을 불러오는 중');
    expect(loading.length).toBeGreaterThan(0);
    await act(async () => image().props.onLoad());
    expect(renderer.root.findByProps({ testID: 'home-hero-photo-fallback' }).props.importantForAccessibility).toBe('no-hide-descendants');
    expect(renderer.root.findAll(node => node.props.accessibilityLabel === '프로필 사진을 불러오는 중')).toHaveLength(0);
    expect(JSON.stringify(renderer.toJSON())).not.toContain('사진을 불러오지 못했어요');
    expect(JSON.stringify(renderer.toJSON())).not.toContain('아이의 사진을 기다리고 있어요');
  });

  it.each([320, 360, 393, 412, 430])('uses the same normalized ellipse at %s dp', async width => {
    await render(uri, width);
    const g = getHomeHeroPhotoGeometry(width);
    expect(frame().height).toBeCloseTo(width * 1061 / 852);
    // Evaluate the actual transformed circle's lower boundary at both edges
    // and its centre, independently of any source photo.
    const radius = g.ellipseSize / 2;
    const centreY = g.ellipseTop + radius;
    const boundary = (x: number) => centreY + Math.sqrt(radius ** 2 - (x - width / 2) ** 2) * g.ellipseScaleY;
    expect(boundary(0)).toBeCloseTo(g.edgeY);
    expect(boundary(width)).toBeCloseTo(g.edgeY);
    expect(boundary(width / 2)).toBeCloseTo(g.height);
    const mask = renderer.root.findByProps({ testID: 'home-hero-photo-mask' });
    expect(mask.props.maskElement.props.pointerEvents).toBe('none');
    expect(frame()).not.toHaveProperty('borderTopLeftRadius');
    expect(frame()).not.toHaveProperty('maxWidth');
    await act(async () => renderer.unmount());
  });

  it('recalculates from the actual resized frame without changing photo identity', async () => {
    await render();
    await act(async () => image().props.onLoad());
    await act(async () => renderer.update(<HomeHeroPhotoBackground uri={uri} frameWidth={320} />));
    expect(frame().height).toBeCloseTo(320 * 1061 / 852);
    expect(StyleSheet.flatten(image().props.style).opacity).toBe(1);
  });

  it.each([[320,568],[360,640],[393,852],[412,915],[430,932]])('uses one top-inset and toolbar budget at %s x %s', (width, height) => {
    const viewport = height - 32;
    const minimum = getHomeHeroMinimumHeight(viewport, 90);
    expect(minimum).toBe(height - 32 - 90 + HOME_HERO_TOOLBAR_RADIUS);
    // Lower Home starts below the entire curved corner, not just the toolbar top.
    expect(minimum + 90 - viewport).toBe(24);
    expect(getHomeHeroPhotoGeometry(width).height).toBeLessThan(height);
    const regular = getHomeHeroTypography(width, '누리');
    expect(regular.nameSize).toBe(width <= 360 ? 25 : 33);
    expect(regular.buttonSize).toBeGreaterThanOrEqual(12);
  });
});
