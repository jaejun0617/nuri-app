import React from 'react';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import CommunityPostEditorForm from '../src/screens/Community/components/CommunityPostEditorForm';
import {
  runCommunityCreateSubmitFlow,
  runCommunityEditSubmitFlow,
} from '../src/screens/Community/communityPostSubmit.shared';
import { resolveComposerFocusOffset } from '../src/services/forms/composerFocus';
import type { CommunityPost } from '../src/types/community';
import {
  deleteCommunityImageSafely,
  enqueueCommunityImageCleanup,
  uploadCommunityImage,
} from '../src/services/supabase/storageCommunity';
import { buildCommunityRegularPostUpdatePatch } from '../src/services/supabase/community';

jest.mock('../src/services/supabase/storageCommunity', () => ({
  deleteCommunityImageSafely: jest.fn().mockResolvedValue(undefined),
  enqueueCommunityImageCleanup: jest.fn().mockResolvedValue(undefined),
  uploadCommunityImage: jest.fn(),
}));

const noop = jest.fn();

describe('Community composer simplification', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps the shared create/edit form focused on approved post fields', () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    TestRenderer.act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <CommunityPostEditorForm
            category="question"
            title=""
            content=""
            imageUri={null}
            accentPalette={{
              primary: '#4F7BCB',
              onPrimary: '#FFFFFF',
              deep: '#31558C',
            }}
            submitLabel="글 등록"
            submitDisabled
            onChangeCategory={noop}
            onChangeTitle={noop}
            onChangeContent={noop}
            onPressPolicy={noop}
            onPickImage={noop}
            onRemoveImage={noop}
            onSubmit={noop}
          />
        </ThemeProvider>,
      );
    });

    for (const removedLabel of [
      '반려동물 연결',
      '연결 안 함',
      '나이 함께 표시',
      '함께한 기간',
    ]) {
      expect(
        renderer.root.findAllByProps({ children: removedLabel }),
      ).toHaveLength(0);
    }
    expect(
      renderer.root.findByProps({ testID: 'community-composer-title-section' }),
    ).toBeDefined();
    expect(
      renderer.root.findByProps({ testID: 'community-composer-body-section' }),
    ).toBeDefined();
  });

  it('creates new posts without a pet relation', async () => {
    const post = { id: 'qa-post' } as CommunityPost;
    const submitPost = jest.fn().mockResolvedValue(post);
    const editPost = jest.fn().mockResolvedValue(undefined);

    await expect(
      runCommunityCreateSubmitFlow({
        userId: 'qa-user',
        title: 'QA 제목',
        content: 'QA 본문',
        category: 'question',
        petId: null,
        petSnapshot: null,
        pickedImages: [],
        submitPost,
        editPost,
        onImageUploadWarning: noop,
      }),
    ).resolves.toBe(post);

    expect(submitPost).toHaveBeenCalledWith(
      expect.objectContaining({
        petId: null,
        petSnapshot: null,
      }),
      'qa-user',
    );
    expect(editPost).not.toHaveBeenCalled();
  });

  it('edits content without overwriting historical pet metadata', async () => {
    const editPost = jest.fn().mockResolvedValue(undefined);

    await runCommunityEditSubmitFlow({
      userId: 'qa-user',
      postId: 'historical-post',
      title: '수정 제목',
      content: '수정 본문',
      category: 'free',
      pickedImage: null,
      previousImagePath: 'community/existing.jpg',
      existingImagePath: 'community/existing.jpg',
      editPost,
    });

    expect(editPost).toHaveBeenCalledTimes(1);
    const [, patch] = editPost.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(patch).toEqual(
      expect.objectContaining({
        title: '수정 제목',
        content: '수정 본문',
        category: 'free',
      }),
    );
    expect(patch).not.toHaveProperty('petId');
    expect(patch).not.toHaveProperty('petSnapshot');
    expect(patch).not.toHaveProperty('imagePath');
    expect(patch).not.toHaveProperty('imagePaths');
  });

  it('preserves later photo slots and deletes the replaced original only after confirmation', async () => {
    const editPost = jest.fn().mockImplementation(async () => {
      expect(deleteCommunityImageSafely).not.toHaveBeenCalled();
    });
    jest.mocked(uploadCommunityImage).mockResolvedValue('new.jpg');
    const edit = {
      userId: 'qa-user',
      postId: 'qa-post',
      title: '수정 제목',
      content: '수정 본문',
      category: 'free' as const,
      pickedImage: { uri: 'file:///new.jpg', mimeType: 'image/jpeg', fileName: null },
      previousImagePath: 'old.jpg',
      previousImagePaths: ['old.jpg', 'second.jpg', 'third.jpg'],
      existingImagePath: 'old.jpg',
      editPost,
    };
    await runCommunityEditSubmitFlow(edit);
    expect(editPost).toHaveBeenCalledWith('qa-post', expect.objectContaining({
      imagePaths: ['new.jpg', 'second.jpg', 'third.jpg'],
    }));
    expect(deleteCommunityImageSafely).toHaveBeenCalledWith('old.jpg');

    jest.clearAllMocks();
    await runCommunityEditSubmitFlow({ ...edit, pickedImage: null, existingImagePath: null });
    expect(editPost).toHaveBeenCalledWith('qa-post', expect.objectContaining({
      imagePaths: ['second.jpg', 'third.jpg'],
    }));
    expect(deleteCommunityImageSafely).toHaveBeenCalledWith('old.jpg');
  });

  it('clamps invalid or near-top measured focus positions', () => {
    expect(resolveComposerFocusOffset(320)).toBe(304);
    expect(resolveComposerFocusOffset(8)).toBe(0);
    expect(resolveComposerFocusOffset(Number.NaN)).toBe(0);
    expect(resolveComposerFocusOffset(200, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('uploads all five images in order and preserves the existing text/moderation write path', async () => {
    const post = { id: 'five-photo-post' } as CommunityPost;
    const pickedImages = Array.from({ length: 5 }, (_, index) => ({
      uri: `file:///photo-${index}.jpg`,
      mimeType: 'image/jpeg',
      fileName: null,
    }));
    jest
      .mocked(uploadCommunityImage)
      .mockImplementation(
        async ({ fileUri }) => `uploaded/${fileUri.split('/').pop()}`,
      );
    const submitPost = jest.fn().mockResolvedValue(post);
    const editPost = jest.fn().mockResolvedValue(undefined);
    const onImageUploadWarning = jest.fn();
    await runCommunityCreateSubmitFlow({
      userId: 'qa-user',
      title: '제목',
      content: '본문',
      category: 'question',
      petId: null,
      petSnapshot: null,
      pickedImages,
      submitPost,
      editPost,
      onImageUploadWarning,
    });
    expect(submitPost).toHaveBeenCalledTimes(1);
    expect(uploadCommunityImage).toHaveBeenCalledTimes(5);
    expect(editPost).toHaveBeenCalledWith(post.id, {
      imagePath: 'uploaded/photo-0.jpg',
      imagePaths: pickedImages.map((_, index) => `uploaded/photo-${index}.jpg`),
    });
    expect(onImageUploadWarning).not.toHaveBeenCalled();
    const patch = buildCommunityRegularPostUpdatePatch(
      editPost.mock.calls[0][1],
    );
    expect(patch.image_urls).toHaveLength(5);
    // A text-only edit must not collapse the historical image_urls array.
    expect(
      buildCommunityRegularPostUpdatePatch({
        title: '수정 제목',
        content: '수정 본문',
      }),
    ).not.toHaveProperty('image_urls');
  });

  it('keeps existing cleanup and warning behavior when the fifth image upload fails', async () => {
    const pickedImages = Array.from({ length: 5 }, (_, index) => ({
      uri: `file:///photo-${index}.jpg`,
      mimeType: 'image/jpeg',
      fileName: null,
    }));
    jest
      .mocked(uploadCommunityImage)
      .mockImplementation(async ({ fileUri }) => {
        if (fileUri.endsWith('4.jpg')) throw new Error('upload failed');
        return `uploaded/${fileUri.split('/').pop()}`;
      });
    const editPost = jest.fn();
    const onImageUploadWarning = jest.fn();
    await runCommunityCreateSubmitFlow({
      userId: 'qa-user',
      title: '제목',
      content: '본문',
      category: 'free',
      petId: null,
      petSnapshot: null,
      pickedImages,
      submitPost: jest.fn().mockResolvedValue({ id: 'post' }),
      editPost,
      onImageUploadWarning,
    });
    expect(enqueueCommunityImageCleanup).toHaveBeenCalledTimes(4);
    expect(editPost).not.toHaveBeenCalled();
    expect(onImageUploadWarning).toHaveBeenCalledWith('upload');
  });

  it('keeps uploaded files after an unknown attach result for both create and edit', async () => {
    const pickedImage = { uri: 'file:///photo.jpg', mimeType: 'image/jpeg', fileName: null };
    const lostResponse = new Error('response lost');
    const editPost = jest.fn().mockRejectedValue(lostResponse);
    const onImageUploadWarning = jest.fn();
    jest.mocked(uploadCommunityImage).mockResolvedValue('new.jpg');
    const shared = { userId: 'qa-user', title: '제목', content: '본문', category: 'free' as const, editPost };
    await runCommunityCreateSubmitFlow({
      ...shared,
      petId: null,
      petSnapshot: null,
      pickedImages: [pickedImage],
      submitPost: jest.fn().mockResolvedValue({ id: 'post' }),
      onImageUploadWarning,
    });
    expect(onImageUploadWarning).toHaveBeenCalledWith('attach');
    await expect(runCommunityEditSubmitFlow({
      ...shared,
      postId: 'post',
      pickedImage,
      previousImagePath: 'old.jpg',
      existingImagePath: 'old.jpg',
    })).rejects.toBe(lostResponse);
    expect(enqueueCommunityImageCleanup).not.toHaveBeenCalled();
    expect(deleteCommunityImageSafely).not.toHaveBeenCalled();
  });
});
