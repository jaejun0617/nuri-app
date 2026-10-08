import { StyleSheet } from 'react-native';

import { styles } from '../src/screens/Community/CommunityDetailScreen.styles';

describe('community detail title presentation', () => {
  it('centers the input and keeps small action faces inside 48dp touch targets', () => {
    expect(styles.commentComposer.alignItems).toBe('center');
    expect(styles.commentInput).toMatchObject({
      textAlignVertical: 'center',
      includeFontPadding: false,
      minHeight: 44,
    });
    expect(styles.commentActionTouchTarget).toMatchObject({
      minHeight: 48,
      minWidth: 48,
    });
    expect(styles.commentActionFace).toMatchObject({
      paddingHorizontal: 4,
      paddingVertical: 0,
    });
    expect(styles.commentActionFace).not.toHaveProperty('borderWidth');
    expect(styles.commentActionFace).not.toHaveProperty('borderRadius');
    expect(styles.moreButton).toMatchObject({ width: 44, height: 44 });
    expect(styles.moreButton).not.toHaveProperty('borderWidth');
  });
  it('separates the compact category from a wrapping full-width title', () => {
    expect(StyleSheet.flatten(styles.postTitleRow)).toMatchObject({
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 8,
    });
    expect(StyleSheet.flatten(styles.categoryBadge)).toMatchObject({
      minHeight: 20,
      paddingHorizontal: 6,
      flexShrink: 0,
    });
    expect(StyleSheet.flatten(styles.postTitle)).toMatchObject({
      alignSelf: 'stretch',
      flexShrink: 1,
      minWidth: 0,
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '700',
    });
  });

  it('keeps the inline category secondary to the title', () => {
    expect(StyleSheet.flatten(styles.categoryText)).toMatchObject({
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '600',
    });
  });
  it('keeps the compact post count below its divider with a full touch target', () => {
    expect(styles.commentsHeader.alignItems).toBe('center');
    expect(styles.commentsHeader.borderTopWidth).toBe(1);
    expect(styles.commentsHeader).not.toHaveProperty('borderBottomWidth');
    expect(styles.commentsTitleRow.minHeight).toBe(48);
    expect(styles.commentsTitleRow).not.toHaveProperty('flexWrap');
    expect(styles.commentsTitleRow).toMatchObject({ flex: 1, minWidth: 0 });
    expect(styles.commentSortLabel.minHeight).toBe(48);
    for (const text of [styles.commentsTitle, styles.commentsCount]) {
      expect(text).toMatchObject({
        fontSize: 14,
        lineHeight: 22,
        includeFontPadding: false,
        textAlignVertical: 'center',
      });
    }
    expect(styles.commentSortText.lineHeight).toBe(26);
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
