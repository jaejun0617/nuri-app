import {
  buildPickedRecordImages,
  mergeRecordTags,
  offsetRecordYmd,
  parseRecordTags,
  resolveRecordPickerMimeType,
  validateRecordOccurredAt,
} from '../src/services/records/form';
import {
  getMemoryImageRefs,
  getPrimaryMemoryImageRef,
  normalizeMemoryImageFields,
} from '../src/services/records/imageSources';

describe('records form helpers', () => {
  it('태그 입력을 #형태 배열로 정규화한다', () => {
    expect(parseRecordTags('산책, 간식, #병원')).toEqual([
      '#산책',
      '#간식',
      '#병원',
    ]);
  });

  it('메인/서브 카테고리 태그를 수동 태그와 합친다', () => {
    expect(mergeRecordTags(['#직접입력'], 'other', 'grooming')).toEqual([
      '#생활',
      '#미용',
      '#직접입력',
    ]);
  });

  it('picker mimeType을 파일명과 uri로 추론한다', () => {
    expect(
      resolveRecordPickerMimeType({
        fileName: 'photo.heic',
        uri: 'file:///tmp/photo.heic',
      }),
    ).toBe('image/heic');
  });

  it('중복 uri를 제거하면서 picked image 목록을 만든다', () => {
    const items = buildPickedRecordImages(
      [
        { uri: 'file:///a.jpg', fileName: 'a.jpg' },
        { uri: 'file:///a.jpg', fileName: 'a.jpg' },
        { uri: 'file:///b.png', fileName: 'b.png' },
      ],
      { keyPrefix: 'test', existingUris: ['file:///seed.jpg'] },
    );

    expect(items).toHaveLength(2);
    expect(items[0].mimeType).toBe('image/jpeg');
    expect(items[1].mimeType).toBe('image/png');
  });

  it('날짜 offset과 검증이 기대대로 동작한다', () => {
    expect(offsetRecordYmd('2026-03-06', -1)).toBe('2026-03-05');
    expect(validateRecordOccurredAt('2026-03-06')).toBe('2026-03-06');
    expect(() => validateRecordOccurredAt('2026/03/06')).toThrow(
      '날짜 형식은 YYYY-MM-DD 입니다.',
    );
  });

  it('이미지 필드를 storage path와 direct uri로 안정적으로 정규화한다', () => {
    expect(
      normalizeMemoryImageFields({
        imagePath: ' https://cdn.example.com/a.jpg ',
        imagePaths: ['users/pet/a.jpg', ' users/pet/a.jpg '],
        imageUrl: 'file:///tmp/picked.jpg',
      }),
    ).toEqual({
      imagePath: 'users/pet/a.jpg',
      imagePaths: ['users/pet/a.jpg'],
      imageUrl: 'https://cdn.example.com/a.jpg',
    });
  });

  it('대표 이미지 ref를 우선순위대로 계산한다', () => {
    expect(
      getPrimaryMemoryImageRef({
        imagePath: null,
        imagePaths: [],
        imageUrl: 'https://cdn.example.com/a.jpg',
      }),
    ).toBe('https://cdn.example.com/a.jpg');

    expect(
      getMemoryImageRefs({
        imagePath: 'users/pet/a.jpg',
        imagePaths: ['users/pet/a.jpg', 'users/pet/b.jpg'],
        imageUrl: 'https://cdn.example.com/fallback.jpg',
      }).map(image => image.key),
    ).toEqual([
      'storage:users/pet/a.jpg',
      'storage:users/pet/b.jpg',
      'remote:https://cdn.example.com/fallback.jpg',
    ]);
  });
});
