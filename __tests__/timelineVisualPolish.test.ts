import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { StyleSheet } from 'react-native';

import { styles } from '../src/screens/Records/TimelineScreen.styles';
import { styles as communityStyles } from '../src/screens/Community/CommunityListScreen.styles';

describe('Timeline visual polish', () => {
  it('matches the Community circular seasonal compose control without changing its callback', () => {
    const button = StyleSheet.flatten(styles.floatingCreateButton);
    expect(button).toMatchObject(communityStyles.createButton);
    expect(styles.floatingCreatePosition).toMatchObject({ position: 'absolute', right: 16 });
    expect(button).not.toHaveProperty('height');
    expect(button).not.toHaveProperty('elevation');
    expect(button).not.toHaveProperty('shadowOpacity');
    const source = readFileSync(
      join(process.cwd(), 'src/screens/Records/TimelineScreen.tsx'),
      'utf8',
    );
    const buttonSource = readFileSync(join(process.cwd(), 'src/screens/Records/TimelineCreateButton.tsx'), 'utf8');
    const create = buttonSource.match(
      /<CtaButton\s+testID="timeline-fixed-create"[\s\S]*?<\/CtaButton>/,
    )?.[0];
    expect(create).toContain('role="primary"');
    expect(create).toContain('onPress={onPress}');
    expect(source).toContain('onPress={onPressCreate}');
    expect(create).toContain('accessibilityLabel="기록하기"');
    expect(create).not.toContain('>기록</CtaText>');
    expect(create).toContain('name="plus"');
    expect(create).toContain('color="#FFFFFF"');
    expect(create).toContain('size={24}');
    expect(create).toContain('preserveOriginal');
    expect(source).toContain('useContext(ToolbarHeightContext)');
    expect(source).toContain('(toolbarHeight ?? insets.bottom) + 12');
    expect(source).not.toContain('insets.bottom + 74');
  });
  it('keeps the daily category label content-fit', () => {
    expect(StyleSheet.flatten(styles.dailyIcon)).toEqual(
      expect.objectContaining({
        alignSelf: 'flex-start',
        maxWidth: '100%',
      }),
    );
  });

  it('removes the decorative empty-state logo from both Timeline gates', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/screens/Records/TimelineScreen.tsx'),
      'utf8',
    );
    expect(source).not.toContain('styles.emptyHero');
    expect(source).not.toContain('styles.emptyPawImage');
    expect(source).not.toContain("require('../../assets/logo/logo_v2.png')");
  });
});
