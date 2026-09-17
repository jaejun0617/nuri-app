import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { StyleSheet } from 'react-native';

import { styles } from '../src/screens/Records/TimelineScreen.styles';

describe('Timeline visual polish', () => {
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
