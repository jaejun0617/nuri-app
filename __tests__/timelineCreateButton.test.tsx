import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import TimelineCreateButton from '../src/screens/Records/TimelineCreateButton';
import { createTheme } from '../src/app/theme/theme';
import { resolveCtaPalette } from '../src/app/theme/ctaPalette';
import type { SeasonKey } from '../src/theme/seasonal/season';

let mockSeason: SeasonKey = 'autumn';
let mockWidth = 320;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWidth, height: 800, scale: 3, fontScale: 1 }),
}));
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => mockSeason,
}));

describe('Timeline fixed foreground control', () => {
  beforeEach(() => {
    mockWidth = 320;
  });

  it.each<SeasonKey>(['autumn', 'winter', 'spring', 'summer'])(
    '%s keeps an accessible white plus and original touch/position outside blur capture',
    season => {
      mockSeason = season;
      const theme = createTheme('light');
      const onPress = jest.fn();
      let tree!: TestRenderer.ReactTestRenderer;
      act(() => {
        tree = TestRenderer.create(
          <ThemeProvider theme={theme}>
            <TimelineCreateButton
              bottom={88}
              rightInset={4}
              onPress={onPress}
            />
          </ThemeProvider>,
        );
      });
      const boundary = tree.root
        .findAllByProps({ testID: 'timeline-create-capture-boundary' })
        .at(-1)!;
      expect(boundary.props.collapsable).toBe(false);
      expect(boundary.props.pointerEvents).toBe('box-none');
      expect(StyleSheet.flatten(boundary.props.style)).toMatchObject({
        position: 'absolute',
        right: 20,
        bottom: 88,
      });
      const button = tree.root.findAllByProps({ testID: 'timeline-fixed-create' }).at(-1)!;
      expect(button.props.accessibilityLabel).toBe('기록하기');
      expect(button.props.accessibilityRole).toBe('button');
      expect(
        StyleSheet.flatten(typeof button.props.style === 'function' ? button.props.style({ pressed: false }) : button.props.style),
      ).toMatchObject({
        width: 48,
        minHeight: 48,
        borderRadius: 24,
        backgroundColor: 'transparent',
      });
      const face = tree.root.findAllByProps({ testID: 'timeline-fixed-create-face' }).at(-1)!;
      expect(face.props.pointerEvents).toBe('none');
      expect(StyleSheet.flatten(face.props.style)).toMatchObject({
        top: 6,
        right: 6,
        bottom: 6,
        left: 6,
        borderRadius: 18,
        backgroundColor: resolveCtaPalette({
          role: 'primary',
          variant: 'solidLavender',
          season,
          colorScheme: 'light',
          colors: theme.colors,
          state: 'default',
        }).background,
      });
      const plus = tree.root.findAll(
        node => node.props.name === 'plus' && node.props.family === 'feather',
      )[0];
      expect(plus.props).toMatchObject({
        color: '#FFFFFF',
        size: 18,
        preserveOriginal: true,
      });
      const touch = tree.root.findAll(node =>
        node.props.testID === 'timeline-fixed-create' && typeof node.props.onPress === 'function',
      )[0];
      act(() => touch.props.onPress());
      expect(onPress).toHaveBeenCalledTimes(1);
      act(() => tree.unmount());
    },
  );

  it.each([
    { width: 360, inset: 5, iconSize: 19 },
    { width: 384, inset: 5, iconSize: 19 },
    { width: 412, inset: 2, iconSize: 21 },
  ])('uses the correct face and icon at $width dp without resizing the touch target', ({ width, inset, iconSize }) => {
    mockWidth = width;
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <TimelineCreateButton bottom={88} rightInset={4} onPress={jest.fn()} />
        </ThemeProvider>,
      );
    });
    const button = tree.root.find(node =>
      node.props.testID === 'timeline-fixed-create' && typeof node.props.style === 'function',
    );
    expect(StyleSheet.flatten(button.props.style({ pressed: false }))).toMatchObject({
      width: 48, minHeight: 48,
    });
    const face = tree.root.findAllByProps({ testID: 'timeline-fixed-create-face' }).at(-1)!;
    expect(StyleSheet.flatten(face.props.style)).toMatchObject({
      top: inset, right: inset, bottom: inset, left: inset, borderRadius: 24 - inset,
    });
    expect(button.find(node => node.props.family === 'feather' && node.props.name === 'plus').props.size).toBe(iconSize);
    act(() => tree.unmount());
  });

  it('excludes only the backdrop capture pass, with a registered local native view', () => {
    const read = (file: string) =>
      readFileSync(join(process.cwd(), file), 'utf8');
    const native = read(
      'android/app/src/main/java/com/nuri/ui/BlurCaptureExclusionPackage.kt',
    );
    expect(
      native.match(/if \(Utils.sIsGlobalCapturing\) return/g),
    ).toHaveLength(2);
    expect(native).toContain('super.draw(canvas)');
    expect(native).toContain('super.dispatchDraw(canvas)');
    expect(native).not.toContain('isHardwareAccelerated');
    expect(native).not.toContain('setVisibility');
    expect(native).not.toContain('postDelayed');
    expect(
      read('android/app/src/main/java/com/nuri/MainApplication.kt'),
    ).toContain('add(BlurCaptureExclusionPackage())');
    expect(read('android/app/build.gradle')).toContain(
      'implementation("com.github.qmdeve.qmblurview:core:v1.3.0")',
    );
    const owner = read('src/screens/Records/TimelineCreateButton.tsx');
    expect(owner).toContain("from '../../components/common/BlurCaptureExclusion'");
    expect(owner).not.toContain('requireNativeComponent');
    const shared = read('src/components/common/BlurCaptureExclusion.tsx');
    expect(shared).toContain("Platform.OS === 'android'");
    expect(shared).toContain(
      "requireNativeComponent<ViewProps>('NuriBlurCaptureExclusion')",
    );
  });
});
