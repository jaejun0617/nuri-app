import {
  getStableAppErrorCode,
  getStructuredErrorDetail,
} from '../src/services/app/errors';
import { getCommunityMutationErrorMeta } from '../src/services/community/errors';

describe('community error helpers', () => {
  it('stable error detail에서 app_code를 추출한다', () => {
    const error = {
      message: '커뮤니티 운영 정책에 맞지 않는 표현입니다.',
      details: JSON.stringify({
        app_code: 'community_content_policy_violation',
        target_type: 'post',
        target_field: 'content',
        match_source: 'term',
      }),
    };

    expect(getStructuredErrorDetail(error)).toEqual({
      app_code: 'community_content_policy_violation',
      target_type: 'post',
      target_field: 'content',
      match_source: 'term',
    });
    expect(getStableAppErrorCode(error)).toBe(
      'community_content_policy_violation',
    );
  });

  it('게시글 작성 콘텐츠 정책 차단 문구를 안정적으로 매핑한다', () => {
    const error = {
      message: '커뮤니티 운영 정책에 맞지 않는 표현입니다.',
      details: JSON.stringify({
        app_code: 'community_content_policy_violation',
      }),
    };

    expect(getCommunityMutationErrorMeta(error, 'post-create')).toEqual({
      title: '게시글 등록이 잠시 멈췄어요',
      message:
        '운영 정책상 등록할 수 없는 표현이 포함되어 있어요. 표현을 조금만 수정해 다시 시도해 주세요.',
    });
  });

  it('stable code가 없으면 raw 한국어를 그대로 노출하지 않고 fallback으로 회수한다', () => {
    const error = {
      message: '서버 내부 정책 문구가 바뀌었습니다.',
    };

    expect(getCommunityMutationErrorMeta(error, 'comment-create')).toEqual({
      title: '댓글 등록이 잠시 멈췄어요',
      message: '댓글을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.',
    });
  });
});
