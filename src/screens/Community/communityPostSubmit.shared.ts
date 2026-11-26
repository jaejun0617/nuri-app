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
  title: string;
  content: string;
  category: CommunityPostCategory;
  petId: string | null;
  petSnapshot: PetSnapshot | null;
  pickedImages: PickedPhotoAsset[];
  submitPost: (params: CreateCommunityPostParams, userId: string) => Promise<CommunityPost>;
  editPost: (postId: string, params: UpdateCommunityPostParams) => Promise<void>;
  onImageUploadWarning: (stage: 'upload' | 'attach') => void;
};

type EditSubmitDependencies = {
  userId: string;
  postId: string;
  title: string;
  content: string;
  category: CommunityPostCategory;
  pickedImage: PickedPhotoAsset | null;
  previousImagePath: string | null;
  previousImagePaths?: string[];
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
      title: dependencies.title,
      content: dependencies.content,
      category: dependencies.category,
      petId: dependencies.petId,
      imagePath: null,
      imagePaths: [],
      petSnapshot: dependencies.petSnapshot,
    },
    dependencies.userId,
  );

  if (dependencies.pickedImages.length === 0) {
    return post;
  }

  const uploadedImagePaths: string[] = [];
  try {
    for (const image of dependencies.pickedImages) {
      const uploadedPath = await uploadCommunityImage({
        userId: dependencies.userId,
        postId: post.id,
        fileUri: image.uri,
        mimeType: image.mimeType,
      });
      uploadedImagePaths.push(uploadedPath);
    }
  } catch {
    for (const path of uploadedImagePaths) {
      await enqueueCommunityImageCleanup(path);
    }
    dependencies.onImageUploadWarning('upload');
    return post;
  }

  try {
    await dependencies.editPost(post.id, {
      imagePath: uploadedImagePaths[0] ?? null,
      imagePaths: uploadedImagePaths,
    });
  } catch {
    // The update may have committed even if the response did not arrive.
    dependencies.onImageUploadWarning('attach');
  }

  return post;
}

export async function runCommunityEditSubmitFlow(
  dependencies: EditSubmitDependencies,
): Promise<void> {
  const text = {
    title: dependencies.title,
    content: dependencies.content,
    category: dependencies.category,
  };
  if (!dependencies.pickedImage && dependencies.existingImagePath === dependencies.previousImagePath) {
    await dependencies.editPost(dependencies.postId, text);
    return;
  }

  // The editor replaces or removes only the first attachment.
  const previousPaths = dependencies.previousImagePaths ??
    (dependencies.previousImagePath ? [dependencies.previousImagePath] : []);
  const previousMainPath = previousPaths[0];
  const remainingPaths = previousPaths.slice(1);
  const nextPaths = dependencies.pickedImage
    ? [
        await uploadCommunityImage({
          userId: dependencies.userId,
          postId: dependencies.postId,
          fileUri: dependencies.pickedImage.uri,
          mimeType: dependencies.pickedImage.mimeType,
        }),
        ...remainingPaths,
      ]
    : remainingPaths;

  // Keep both versions if the server write cannot be confirmed.
  await dependencies.editPost(dependencies.postId, { ...text, imagePaths: nextPaths });
  if (previousMainPath && !nextPaths.includes(previousMainPath) && !isRemotePath(previousMainPath)) {
    await deleteCommunityImageSafely(previousMainPath);
  }
}
