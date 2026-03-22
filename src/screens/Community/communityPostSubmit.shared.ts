import type { PickedPhotoAsset } from '../../services/media/photoPicker';
import {
  deleteCommunityImageSafely,
  enqueueCommunityImageCleanup,
  uploadCommunityImage,
  uploadCommunityImages,
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
  title: string;
  content: string;
  category: CommunityPostCategory;
  petId: string | null;
  petSnapshot: PetSnapshot | null;
  pickedImages: PickedPhotoAsset[];
  submitPost: (params: CreateCommunityPostParams, userId: string) => Promise<CommunityPost>;
  editPost: (postId: string, params: UpdateCommunityPostParams) => Promise<void>;
  onImageUploadWarning: () => void;
};

type EditSubmitDependencies = {
  userId: string;
  postId: string;
  title: string;
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
  const initialImagePaths: string[] = [];
  let post: CommunityPost;
  try {
    post = await dependencies.submitPost(
      {
        title: dependencies.title,
        content: dependencies.content,
        category: dependencies.category,
        petId: dependencies.petId,
        imagePath: null,
        imagePaths: initialImagePaths,
        petSnapshot: dependencies.petSnapshot,
      },
      dependencies.userId,
    );
  } catch (error) {
    console.error('[CommunityCreate] posts-insert:failed', error);
    throw error;
  }

  if (dependencies.pickedImages.length === 0) {
    return post;
  }

  let uploadedImagePaths: string[] = [];
  try {
    uploadedImagePaths = await uploadCommunityImages(
      dependencies.pickedImages.map(image => ({
        userId: dependencies.userId,
        postId: post.id,
        fileUri: image.uri,
        mimeType: image.mimeType,
      })),
    );
  } catch (error) {
    console.error('[CommunityCreate] image-upload:failed', error);
    dependencies.onImageUploadWarning();
    return post;
  }

  try {
    await dependencies.editPost(post.id, {
      imagePath: uploadedImagePaths[0] ?? null,
      imagePaths: uploadedImagePaths,
    });
  } catch (error) {
    console.error('[CommunityCreate] image-urls-update:failed', error);
    for (const path of uploadedImagePaths) {
      await enqueueCommunityImageCleanup(path);
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
      title: dependencies.title,
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
