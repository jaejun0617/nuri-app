import React from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { ResponsiveTypographyProvider } from '../src/app/providers/ResponsiveTypographyProvider';
import { createTheme } from '../src/app/theme/theme';
import AppText from '../src/app/ui/AppText';
import AppTextInput from '../src/app/ui/AppTextInput';
import { ResponsiveNativeText, ResponsiveNativeTextInput } from '../src/app/ui/ResponsiveNativeText';

let mockWidth = 320;
let mockScale = 1;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWidth, height: 693, fontScale: mockScale, scale: 3 }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

it.each([320, 360, 384, 412])('keeps native text and inputs at their default size on %s dp', async width => {
  mockWidth = width;
  const theme = createTheme('light');
  const style = { fontSize: 20, lineHeight: 26 };
  const tree = () => (
    <ThemeProvider theme={theme}>
      <ResponsiveTypographyProvider>
        <AppText testID="preset" style={style}>Title</AppText>
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
  expect(baseline.map(item => item.id)).toEqual(['preset', 'plain', 'preset-input', 'plain-input']);
  expect(baseline.every(item => item.scaling === false)).toBe(true);
  expect(baseline[1].style.fontSize).toBe(width === 320 ? 18 : width === 360 ? 19 : 20);
  for (const scale of [0.8, 0.9, 1.08, 1.15, 1.3, 1.5, 1.7, 2]) {
    mockScale = scale;
    await act(async () => renderer.update(tree()));
    expect(read()).toEqual(baseline);
  }
  await act(async () => renderer.unmount());
});
