import { getImageUploadType, MAX_IMAGE_UPLOAD_BYTES, validateImageUploadSize } from '../src/services/media/imageUploadPolicy';

describe('photo upload boundary', () => {
  it.each(['jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'avif', 'bmp'])('preserves %s photos', type => {
    expect(getImageUploadType(`image/${type}`).contentType).toBe(`image/${type}`);
  });
  it.each(['image/svg+xml', 'text/html', 'application/pdf', 'video/mp4', '__proto__', ''])('rejects %s', type => {
    expect(() => getImageUploadType(type)).toThrow(expect.objectContaining({ code: 'image_type_not_supported' }));
  });
  it('retains the JPEG default for picker assets without MIME', () => {
    expect(getImageUploadType(null)).toEqual({ contentType: 'image/jpeg', extension: 'jpg' });
  });
  it('bounds each file without a temporal upload quota', () => {
    expect(() => validateImageUploadSize(MAX_IMAGE_UPLOAD_BYTES)).not.toThrow();
    expect(() => validateImageUploadSize(MAX_IMAGE_UPLOAD_BYTES + 1)).toThrow(expect.objectContaining({ code: 'image_file_too_large' }));
    expect(() => validateImageUploadSize(0)).toThrow(expect.objectContaining({ code: 'image_file_empty' }));
  });
});
