import { StyleSheet } from 'react-native';

import { styles } from '../src/screens/Community/CommunityDetailScreen.styles';

describe('community detail title presentation', () => {
  it('centers the input and keeps small action faces inside 44dp touch targets', () => {
    expect(styles.commentComposer.alignItems).toBe('center');
    expect(styles.commentInput).toMatchObject({
      textAlignVertical: 'center',
      includeFontPadding: false,
      minHeight: 44,
    });
    expect(styles.commentActionTouchTarget).toMatchObject({
      minHeight: 44,
      minWidth: 44,
    });
    expect(styles.commentActionFace).toMatchObject({
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    });
    expect(styles.moreButton).toMatchObject({ width: 44, height: 44 });
    expect(styles.moreButton).not.toHaveProperty('borderWidth');
  });
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

  it('keeps the inline composer compact and the post author metadata essential', () => {
    expect(StyleSheet.flatten(styles.inlineCommentComposerWrap)).toMatchObject({
      alignSelf: 'stretch',
      paddingTop: 4,
      paddingBottom: 8,
    });
    expect(StyleSheet.flatten(styles.postMetaRow)).toMatchObject({
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    });
    expect('petAvatar' in styles).toBe(false);
    expect('petAvatarFallback' in styles).toBe(false);
    expect('profileTextBlock' in styles).toBe(false);
  });
});
