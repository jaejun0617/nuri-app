import { StyleSheet } from 'react-native';

import { styles } from '../src/screens/Community/CommunityDetailScreen.styles';

describe('community detail title presentation', () => {
  it('keeps the category inline while allowing the title to consume remaining width', () => {
    expect(StyleSheet.flatten(styles.postTitleRow)).toMatchObject({
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    });
    expect(StyleSheet.flatten(styles.categoryBadge)).toMatchObject({
      minHeight: 24,
      paddingHorizontal: 8,
      flexShrink: 0,
    });
    expect(StyleSheet.flatten(styles.postTitle)).toMatchObject({
      flex: 1,
      minWidth: 0,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600',
    });
  });

  it('keeps the inline category secondary to the title', () => {
    expect(StyleSheet.flatten(styles.categoryText)).toMatchObject({
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '600',
    });
  });
});
