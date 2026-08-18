import {
  canShowCommunityBlockAction,
  COMMUNITY_BLOCK_CONFIRMATION_MESSAGE,
} from '../src/screens/Community/communityBlockPresentation';

describe('community block action presentation', () => {
  it.each([
    ['own post', 'user-1', 'user-1', false],
    ['other user post', 'user-2', 'user-1', true],
    ['anonymous viewer', 'user-2', null, false],
    ['missing author', null, 'user-1', false],
  ])('%s visibility', (_label, authorId, currentUserId, expected) => {
    expect(canShowCommunityBlockAction(authorId, currentUserId)).toBe(expected);
  });

  it('keeps the confirmation contract explicit', () => {
    expect(COMMUNITY_BLOCK_CONFIRMATION_MESSAGE).toContain(
      '내 피드에서 보이지 않게 됩니다',
    );
  });
});
