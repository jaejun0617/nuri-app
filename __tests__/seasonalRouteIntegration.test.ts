import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
const seasonalScreens = [
  'screens/Home/HomeScreen.tsx', 'screens/Auth/SignInScreen.tsx',
  'screens/Auth/NicknameSetupScreen.tsx',
  'screens/Auth/WelcomeTransitionScreen.tsx', 'screens/Pets/PetCreateScreen.tsx',
  'screens/Pets/PetProfileEditScreen.tsx', 'screens/Pets/PetProfileEditDoneScreen.tsx',
  'components/onboarding/FirstPetWelcomeModal.tsx',
];

describe('seasonal route ownership', () => {
  it.each(seasonalScreens)('%s respects page canvas and global seasonal-accent ownership', file => {
    const source = read(file);
    if (file === 'screens/Auth/NicknameSetupScreen.tsx' || file === 'screens/Auth/WelcomeTransitionScreen.tsx') {
      expect(source).toContain('PRODUCT_CANVAS_COLOR');
      expect(source).not.toContain('style={styles.backgroundImage}');
      expect(source).not.toContain('style={styles.readabilityVeil}');
    } else if (file === 'screens/Pets/PetProfileEditDoneScreen.tsx') {
      // Latest PO profile-completion reference explicitly owns this lavender surface.
      expect(source).toContain("colors={['#FCFAFF', '#F7F2FF', '#FCFAFF']}");
      expect(source).not.toContain('useEffectiveSeason');
    } else {
      expect(source).toContain('useEffectiveSeason()');
    }
    expect(source).not.toContain('getSeasonalThemeKey()');
    expect(source).not.toContain('QA_SEASON');
  });
  it('hydrates season before navigation and shares it with the profile sheet', () => {
    expect(read('app/providers/AppProviders.tsx')).toContain('<SeasonPreferenceProvider>');
    const source = read('screens/Main/components/LoggedInHome/LoggedInHome.tsx');
    expect(source).toContain('useSeasonPreference()');
    expect(source).toContain('getSeasonalHomeVisual(ambientSeason)');
    expect(source).toContain('seasonalOrnamentSheet={profileSheetVisual?.ornamentSheet');
    expect(source).toContain('season={HOME_FOREGROUND_UI_SEASON}');
  });
});
