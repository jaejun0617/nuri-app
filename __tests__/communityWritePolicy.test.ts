import {
  buildCommunityRegularPostInsertPayload,
  buildCommunityRegularPostUpdatePatch,
  getCommunityListCursorErrorCode,
  getCommunityListErrorMessage,
} from '../src/services/supabase/community';
import type {
  CreateCommunityPostParams,
  UpdateCommunityPostParams,
} from '../src/types/community';

const createParams: CreateCommunityPostParams = {
  title: '일반 게시글',
  content: '일반 게시글 본문',
  category: 'question',
};

describe('community regular write policy', () => {
  it('does not include notice fields in a regular insert payload', () => {
    const payload = buildCommunityRegularPostInsertPayload(
      createParams,
      'qa-user',
    );

    expect(payload).not.toHaveProperty('is_notice');
    expect(payload).not.toHaveProperty('notice_published_at');
    expect(payload).toMatchObject({
      visibility: 'public',
      status: 'active',
      category: 'question',
    });
  });

  it('does not include notice fields in a regular update payload', () => {
    const updateParams: UpdateCommunityPostParams = {
      title: '수정된 일반 게시글',
      content: '수정된 본문',
      category: 'info',
    };
    const patch = buildCommunityRegularPostUpdatePatch(updateParams);

    expect(patch).not.toHaveProperty('is_notice');
    expect(patch).not.toHaveProperty('notice_published_at');
    expect(patch).toMatchObject({
      title: '수정된 일반 게시글',
      category: 'info',
    });
  });
});

describe('community cursor error contract', () => {
  it('recognizes the legacy cursor error for page-one recovery', () => {
    expect(
      getCommunityListCursorErrorCode({ message: 'community_cursor_invalid' }),
    ).toBe('community_cursor_invalid');
  });

  it('keeps unsupported cursor versions as a stable error', () => {
    const error = {
      message: 'community_cursor_version_unsupported',
      details: JSON.stringify({
        app_code: 'community_cursor_version_unsupported',
      }),
    };

    expect(getCommunityListCursorErrorCode(error)).toBe(
      'community_cursor_version_unsupported',
    );
    expect(getCommunityListErrorMessage(error)).toContain(
      '첫 페이지부터 다시 시도해 주세요',
    );
  });
});
