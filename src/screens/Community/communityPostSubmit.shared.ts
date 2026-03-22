import type { PickedPhotoAsset } from '../../services/media/photoPicker';
import {
  deleteCommunityImageSafely,
  enqueueCommunityImageCleanup,
  uploadCommunityImage,
} from '../../services/supabase/storageCommunity';
import type {
  CommunityPost,
  CommunityPostCategory,
  CreateCommunityPostParams,
  UpdateCommunityPostParams,
} from '../../types/community';

type PetSnapshot = NonNullable<CreateCommunityPostParams['petSnapshot']>;

type CreateSubmitDependencies = {
  userId: string;
  content: string;
  category: CommunityPostCategory;
  petId: string | null;
  petSnapshot: PetSnapshot | null;
  pickedImage: PickedPhotoAsset | null;
  submitPost: (params: CreateCommunityPostParams, userId: string) => Promise<CommunityPost>;
  editPost: (postId: string, params: UpdateCommunityPostParams) => Promise<void>;
  onImageUploadWarning: () => void;
};

type EditSubmitDependencies = {
  userId: string;
  postId: string;
  content: string;
  category: CommunityPostCategory;
  petId: string | null;
  petSnapshot: PetSnapshot | null;
  pickedImage: PickedPhotoAsset | null;
  previousImagePath: string | null;
  existingImagePath: string | null;
  editPost: (postId: string, params: UpdateCommunityPostParams) => Promise<void>;
};

function isRemotePath(value: string | null | undefined) {
  const raw = `${value ?? ''}`.trim();
  return raw.startsWith('https://') || raw.startsWith('http://');
}

export async function runCommunityCreateSubmitFlow(
  dependencies: CreateSubmitDependencies,
): Promise<CommunityPost> {
  const post = await dependencies.submitPost(
    {
      content: dependencies.content,
      category: dependencies.category,
      petId: dependencies.petId,
      imagePath: null,
      petSnapshot: dependencies.petSnapshot,
    },
    dependencies.userId,
  );

  if (!dependencies.pickedImage) {
    return post;
  }

  let uploadedImagePath: string | null = null;
  try {
    uploadedImagePath = await uploadCommunityImage({
      userId: dependencies.userId,
      postId: post.id,
      fileUri: dependencies.pickedImage.uri,
      mimeType: dependencies.pickedImage.mimeType,
    });

    await dependencies.editPost(post.id, { imagePath: uploadedImagePath });
  } catch {
    if (uploadedImagePath) {
      await enqueueCommunityImageCleanup(uploadedImagePath);
    }
    dependencies.onImageUploadWarning();
  }

  return post;
}

export async function runCommunityEditSubmitFlow(
  dependencies: EditSubmitDependencies,
): Promise<void> {
  let nextImagePath = dependencies.existingImagePath;
  let uploadedImagePath: string | null = null;

  try {
    if (dependencies.pickedImage) {
      uploadedImagePath = await uploadCommunityImage({
        userId: dependencies.userId,
        postId: dependencies.postId,
        fileUri: dependencies.pickedImage.uri,
        mimeType: dependencies.pickedImage.mimeType,
      });
      nextImagePath = uploadedImagePath;
    }

    await dependencies.editPost(dependencies.postId, {
      content: dependencies.content,
      category: dependencies.category,
      petId: dependencies.petId,
      imagePath: nextImagePath ?? null,
      petSnapshot: dependencies.petSnapshot,
    });

    const previousImagePath = dependencies.previousImagePath;
    const shouldDeleteOldImage =
      !!previousImagePath &&
      previousImagePath !== nextImagePath &&
      !isRemotePath(previousImagePath);

    if (shouldDeleteOldImage) {
      await deleteCommunityImageSafely(previousImagePath);
    }
  } catch (error) {
    if (uploadedImagePath && uploadedImagePath !== dependencies.previousImagePath) {
      await enqueueCommunityImageCleanup(uploadedImagePath);
    }
    throw error;
  }
}
