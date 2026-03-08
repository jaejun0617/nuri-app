import {
  launchImageLibrary,
  type Asset as ImagePickerAsset,
  type ImageLibraryOptions,
} from 'react-native-image-picker';
import { PermissionsAndroid, Platform } from 'react-native';

export type PickedPhotoAsset = {
  uri: string;
  mimeType: string | null;
  fileName: string | null;
};

type PickPhotoOptions = {
  selectionLimit?: number;
  quality?: NonNullable<ImageLibraryOptions['quality']>;
};

type PickPhotoResult =
  | { status: 'cancelled' }
  | { status: 'success'; assets: PickedPhotoAsset[] };

function inferMimeFromFileName(fileName: string | null | undefined): string | null {
  const value = (fileName ?? '').toLowerCase().trim();
  if (!value) return null;
  if (value.endsWith('.jpg') || value.endsWith('.jpeg')) return 'image/jpeg';
  if (value.endsWith('.png')) return 'image/png';
  if (value.endsWith('.webp')) return 'image/webp';
  if (value.endsWith('.heic')) return 'image/heic';
  if (value.endsWith('.heif')) return 'image/heif';
  return null;
}

function inferMimeFromUri(uri: string): string | null {
  const normalized = uri.toLowerCase().split('?')[0];
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.webp')) return 'image/webp';
  if (normalized.endsWith('.heic')) return 'image/heic';
  if (normalized.endsWith('.heif')) return 'image/heif';
  return null;
}

function normalizeAssetUri(asset: ImagePickerAsset): string {
  const directUri = asset.uri?.trim() || '';
  if (directUri) return directUri;

  const originalPath = asset.originalPath?.trim() || '';
  if (!originalPath) return '';
  if (
    originalPath.startsWith('content://') ||
    originalPath.startsWith('file://')
  ) {
    return originalPath;
  }
  return `file://${originalPath}`;
}

function normalizePickedPhotoAsset(asset: ImagePickerAsset): PickedPhotoAsset | null {
  const uri = normalizeAssetUri(asset);
  if (!uri) return null;

  const directMime = asset.type?.trim() || null;
  const mimeType =
    directMime && directMime.includes('/')
      ? directMime
      : inferMimeFromFileName(asset.fileName) || inferMimeFromUri(uri);

  return {
    uri,
    mimeType,
    fileName: asset.fileName?.trim() || null,
  };
}

async function ensureMediaPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;

  // Android 13+ 시스템 포토피커는 별도 권한 없이 동작할 수 있다.
  if (Platform.Version >= 33) return;

  const permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const alreadyGranted = await PermissionsAndroid.check(permission);
  if (alreadyGranted) return;

  const granted = await PermissionsAndroid.request(permission);
  if (granted === PermissionsAndroid.RESULTS.GRANTED) return;

  // 구형 Android에서도 포토피커가 자체 접근을 허용하는 경우가 있어
  // 권한 거부를 즉시 치명적 에러로 보지 않고 picker 시도를 남겨둔다.
}

export async function pickPhotoAssets(
  options?: PickPhotoOptions,
): Promise<PickPhotoResult> {
  const requestedLimit = options?.selectionLimit ?? 1;

  await ensureMediaPermission();

  const pickerOptions: ImageLibraryOptions = {
    mediaType: 'photo',
    selectionLimit:
      Platform.OS === 'android' && requestedLimit > 1 ? 0 : requestedLimit,
    quality: options?.quality ?? 0.9,
    includeBase64: false,
    includeExtra: true,
  };

  let result;
  try {
    result = await launchImageLibrary(pickerOptions);
  } catch (error: unknown) {
    if (error instanceof Error) throw error;
    throw new Error('사진을 가져오지 못했어요. 다른 사진으로 다시 시도해 주세요.');
  }

  const assets = (result.assets ?? [])
    .map(normalizePickedPhotoAsset)
    .filter((asset): asset is PickedPhotoAsset => asset !== null);

  if (assets.length > 0) {
    return {
      status: 'success',
      assets,
    };
  }

  if (result.didCancel) {
    return { status: 'cancelled' };
  }

  if (result.errorCode) {
    return { status: 'cancelled' };
  }

  return { status: 'cancelled' };
}
