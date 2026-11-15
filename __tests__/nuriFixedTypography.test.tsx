import React from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { ResponsiveTypographyProvider } from '../src/app/providers/ResponsiveTypographyProvider';
import { createTheme } from '../src/app/theme/theme';
import AppText from '../src/app/ui/AppText';
import AppTextInput from '../src/app/ui/AppTextInput';
import { ResponsiveNativeText, ResponsiveNativeTextInput } from '../src/app/ui/ResponsiveNativeText';
import { HomeSectionHeader } from '../src/components/home/HomeSectionHeader';

let mockWidth = 320;
let mockScale = 1;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWidth, height: 693, fontScale: mockScale, scale: 3 }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

afterEach(() => jest.restoreAllMocks());

it.each([320, 360, 384, 412])('keeps the default size and only applies pilot reading sizes at %s dp', async width => {
  jest.replaceProperty(Platform, 'OS', 'android');
  mockWidth = width;
  const theme = createTheme('light');
  const style = { fontSize: 20, lineHeight: 26 };
  const tree = () => (
    <ThemeProvider theme={theme}>
      <ResponsiveTypographyProvider>
        <AppText testID="preset" style={style} fitCompactReadingLine>Title</AppText>
        <AppText testID="toolbar" preset="tab" keepBaseFontSize>Menu</AppText>
        <ResponsiveNativeText testID="plain" style={style}>Body</ResponsiveNativeText>
        <AppTextInput testID="preset-input" />
        <ResponsiveNativeTextInput testID="plain-input" style={style} />
      </ResponsiveTypographyProvider>
    </ThemeProvider>
  );
  let renderer!: Renderer.ReactTestRenderer;
  mockScale = 1;
  await act(async () => { renderer = Renderer.create(tree()); });
  const read = () => [
    ...renderer.root.findAllByType(Text),
    ...renderer.root.findAllByType(TextInput),
  ].map(node => ({
    id: node.props.testID,
    scaling: node.props.allowFontScaling,
    style: StyleSheet.flatten(node.props.style),
  }));
  const baseline = read();
  expect(baseline.map(item => item.id)).toEqual(['preset', 'toolbar', 'plain', 'preset-input', 'plain-input']);
  expect(baseline.every(item => item.scaling === false)).toBe(true);
  expect(baseline[2].style.fontSize).toBe(width === 320 ? 18 : width === 360 ? 19 : 20);
  for (const [systemScale, pilotScale] of [[0.8, 1], [1.08, 1], [1.15, 1], [1.5, 1.2], [2, 1.5]]) {
    mockScale = systemScale;
    await act(async () => renderer.update(tree()));
    const scale = width === 320 ? pilotScale : 1;
    const title = renderer.root.findAllByType(Text).find(node => node.props.testID === 'preset');
    expect(title?.props.numberOfLines).toBe(scale > 1 ? 1 : undefined);
    expect(title?.props.adjustsFontSizeToFit).toBe(scale > 1 ? true : undefined);
    const input = renderer.root.findAllByType(TextInput).find(node => node.props.testID === 'preset-input');
    expect(input?.props.adjustsFontSizeToFit).toBeUndefined();
    const expected = baseline.map(item => item.id === 'toolbar' ? item : ({
      ...item,
      style: {
        ...item.style,
        fontSize: item.style.fontSize * scale,
        lineHeight: item.style.lineHeight * scale,
      },
    }));
    expect(read()).toEqual(expected);
  }
  await act(async () => renderer.unmount());
});

it('keeps large-print Home titles and section actions in the same row without fitting paragraph text', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  mockWidth = 320;
  mockScale = 2;
  let renderer!: Renderer.ReactTestRenderer;
  await act(async () => {
    renderer = Renderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <ResponsiveTypographyProvider>
          <HomeSectionHeader title="Section heading" color="#221351" description="Paragraph"
            action={{ label: 'See all', accessibilityLabel: 'Open section', onPress: jest.fn() }} />
        </ResponsiveTypographyProvider>
      </ThemeProvider>,
    );
  });
  const row = renderer.root.findAllByType(View).find(node => node.props.testID === 'home-section-header');
  expect(row).toBeDefined();
  expect(StyleSheet.flatten(row?.props.style).flexDirection).toBe('row');
  const labels = row?.findAllByType(Text).filter(node => ['Section heading', 'See all'].includes(node.props.children)) ?? [];
  expect(labels).toHaveLength(2);
  expect(labels.every(node => node.props.numberOfLines === 1)).toBe(true);
  expect(StyleSheet.flatten(labels.find(node => node.props.children === 'See all')?.props.style).fontSize).toBe(18);
  expect(row?.findAllByType(Text).some(node => node.props.children === 'Paragraph')).toBe(false);
  expect(renderer.root.findAllByType(Text).find(node => node.props.children === 'Paragraph')
    ?.props.adjustsFontSizeToFit).toBeUndefined();
  await act(async () => renderer.unmount());
});
