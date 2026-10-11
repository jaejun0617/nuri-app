// Match the three Storage bucket limits without changing attachment counts.
export const MAX_IMAGE_UPLOAD_BYTES = 20 * 1024 * 1024;

const IMAGE_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
};

export class ImageUploadPolicyError extends Error {
  constructor(readonly code: 'image_type_not_supported' | 'image_file_too_large' | 'image_file_empty') {
    super(code === 'image_file_too_large'
      ? '사진은 한 장당 20MB 이하로 첨부해 주세요.'
      : code === 'image_file_empty'
      ? '사진을 읽을 수 없어요. 다른 사진을 선택해 주세요.'
      : '지원하지 않는 사진 형식이에요. 다른 사진을 선택해 주세요.');
    this.name = 'ImageUploadPolicyError';
  }
}

export function getImageUploadType(mimeType: string | null) {
  const contentType = (mimeType ?? 'image/jpeg').trim().toLowerCase();
  const extension = Object.hasOwn(IMAGE_EXTENSIONS, contentType)
    ? IMAGE_EXTENSIONS[contentType]
    : undefined;
  if (!extension) throw new ImageUploadPolicyError('image_type_not_supported');
  return { contentType, extension };
}

export function validateImageUploadSize(byteLength: number): void {
  if (!Number.isSafeInteger(byteLength) || byteLength <= 0) {
    throw new ImageUploadPolicyError('image_file_empty');
  }
  if (byteLength > MAX_IMAGE_UPLOAD_BYTES) {
    throw new ImageUploadPolicyError('image_file_too_large');
  }
}
