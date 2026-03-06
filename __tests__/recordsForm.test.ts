import {
  buildPickedRecordImages,
  mergeRecordTags,
  offsetRecordYmd,
  parseRecordTags,
  resolveRecordPickerMimeType,
  validateRecordOccurredAt,
} from '../src/services/records/form';

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
      '#기타',
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
});
