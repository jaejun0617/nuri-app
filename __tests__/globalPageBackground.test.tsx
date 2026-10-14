import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import LinearGradient from 'react-native-linear-gradient';
import ts from 'typescript';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { PRODUCT_CANVAS_COLOR } from '../src/app/theme/tokens/colors';
import { SeasonalFormBackground } from '../src/components/common/SeasonalFormSurface';
import { HOME_SEASONAL_BACKGROUND_GRADIENTS } from '../src/theme/home/seasonalAmbient';

jest.mock('@react-native-masked-view/masked-view', () => 'MaskedView');
jest.mock('@sbaiahmed1/react-native-blur', () => ({ BlurView: 'BlurView' }));
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => 'autumn',
}));

const read = (file: string) => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');

function readStyleColor(file: string, key: string): string | undefined {
  const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true);
  let result: string | undefined;
  function visit(node: ts.Node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === key && ts.isObjectLiteralExpression(node.initializer)) {
      const color = node.initializer.properties.find(property => ts.isPropertyAssignment(property) && property.name.getText(source) === 'backgroundColor');
      if (color && ts.isPropertyAssignment(color)) {
        result = color.initializer.getText(source);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return result;
}

describe('non-Home product page canvas', () => {
  it('separates the blue-gray page token from existing elevated/card surfaces', () => {
    expect(PRODUCT_CANVAS_COLOR).toBe('#F1F5F8');
    expect(createTheme('light').colors.background).toBe('#F1F5F8');
    expect(createTheme('light').colors.surface).toBe('#F6F7FB');
    expect(createTheme('light').colors.surfaceElevated).toBe('#FFFFFF');
    expect(createTheme('dark').colors.background).toBe('#0B1F3A');
  });

  it.each([undefined, true])('default and explicit uniform forms share the same undecorated canvas (%s)', async uniform => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <SeasonalFormBackground uniform={uniform} />
        </ThemeProvider>,
      );
    });
    try {
      const canvas = renderer.root.findAll(node => node.type === View && node.props.testID === 'home-ambient-bubble-canvas')[0];
      expect(StyleSheet.flatten(canvas.props.style).backgroundColor).toBe('#F1F5F8');
      expect(renderer.root.findAllByType(Image)).toHaveLength(0);
      expect(canvas.findAllByType(LinearGradient).map(g => g.props.colors)).toEqual([['#F1F5F8', '#F1F5F8']]);
    } finally {
      await act(async () => renderer.unmount());
    }
  });

  it('freezes all four approved Home gradients independently of the shared canvas', () => {
    expect(HOME_SEASONAL_BACKGROUND_GRADIENTS).toEqual({
      spring: ['#FADDE4', '#F7C8D3', '#F4C1CF'],
      summer: ['#BFDDE9', '#ADD7E3', '#ACD4D0'],
      autumn: ['#E5D1C0', '#E2CEBC', '#DFCAB8'],
      winter: ['#CDDCE6', '#BFD3E1', '#BCD0DE'],
    });
  });

  it.each([
    ['components/locationDiscovery/LocationDiscovery.styles.ts', 'screen'],
    ['screens/AnimalHospital/AnimalHospitalAdminScreen.tsx', 'screen'],
    ['screens/Auth/NicknameSetupScreen.styles.ts', 'screen'],
    ['screens/Auth/PasswordResetFlow.styles.ts', 'screen'],
    ['screens/Auth/WelcomeTransitionScreen.styles.ts', 'screen'],
    ['screens/Common/EditDoneScreen.styles.ts', 'screen'],
    ['screens/Community/CommunityListScreen.styles.ts', 'screen'],
    ['screens/Guestbook/GuestbookScreen.tsx', 'screen'],
    ['screens/Guestbook/GuestbookScreen.tsx', 'scroll'],
    ['screens/Guides/GuideAdminEditorScreen.tsx', 'screen'],
    ['screens/Guides/GuideAdminListScreen.tsx', 'screen'],
    ['screens/LocationDiscovery/WalkPoiAdminReadOnlyScreen.tsx', 'screen'],
    ['screens/More/MoreScreen.tsx', 'screen'],
    ['screens/Notifications/UserNotificationsScreen.tsx', 'screen'],
    ['screens/Pets/PetCreateScreen.styles.ts', 'screen'],
    ['screens/Pets/PetProfileEditDoneScreen.styles.ts', 'screen'],
    ['screens/Pets/PetProfileEditScreen.styles.ts', 'screen'],
    ['screens/Records/RecordDetailScreen.styles.ts', 'screen'],
    ['screens/Records/TimelineScreen.styles.ts', 'screen'],
    ['screens/Weather/ActivityGuideScreen.tsx', 'safe'],
    ['screens/Weather/IndoorActivityRecommendationsScreen.tsx', 'safe'],
    ['screens/Weather/WeatherActivityRecordScreen.tsx', 'safe'],
    ['screens/Weather/WeatherActivityRecordScreen.tsx', 'keyboardView'],
  ])('%s %s adopts the page token without recoloring cards', (file, key) => {
    expect(readStyleColor(file, key)).toBe('PRODUCT_CANVAS_COLOR');
  });

  it.each(['screen', 'statusBarBackground', 'actions'])(
    'retains the approved white login %s background as a canvas exception', key => {
      expect(readStyleColor('screens/Auth/SignInScreen.styles.ts', key)).toBe("'#FFFFFF'");
    },
  );

  it.each([
    'screens/Guides/GuideDetailScreen.styles.ts',
    'screens/Records/RecordCreateScreen.styles.ts',
    'screens/Records/RecordEditScreen.styles.ts',
    'screens/Schedules/ScheduleCreateScreen.styles.ts',
  ])('%s resolves its existing BG alias to the shared page token', file => {
    expect(read(file).includes('const BG = PRODUCT_CANVAS_COLOR;')).toBe(true);
    expect(readStyleColor(file, 'screen')).toBe('BG');
  });

  it.each([
    'screens/Auth/NicknameSetupScreen.tsx',
    'screens/Auth/WelcomeTransitionScreen.tsx',
    'screens/Pets/PetCreateScreen.tsx',
    'screens/Pets/PetProfileEditScreen.tsx',
  ])('%s no longer renders a page-wide seasonal image or veil', file => {
    const source = read(file);
    expect(source.includes('style={styles.backgroundImage}')).toBe(false);
    expect(source.includes('style={styles.readabilityVeil}')).toBe(false);
    expect(source.includes('styles.backgroundWarmth')).toBe(false);
    expect(source.includes('PRODUCT_CANVAS_COLOR')).toBe(true);
  });

  it('keeps the weather artwork in its card while using a neutral page canvas', () => {
    const source = read('screens/Weather/WeatherInsightScreen.tsx');
    expect(source.includes('colors={[PRODUCT_CANVAS_COLOR, PRODUCT_CANVAS_COLOR]}')).toBe(true);
    expect(source.includes('<ImageBackground')).toBe(true);
  });
});
