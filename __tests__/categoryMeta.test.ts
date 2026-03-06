import {
  getRecordCategoryMeta,
  normalizeCategoryKey,
  normalizeOtherSubKey,
} from '../src/services/memories/categoryMeta';

describe('memory category meta', () => {
  it('메인 카테고리를 한글/영문 기준으로 정규화한다', () => {
    expect(normalizeCategoryKey('산책')).toBe('walk');
    expect(normalizeCategoryKey('meal')).toBe('meal');
    expect(normalizeCategoryKey('병원')).toBe('health');
  });

  it('기타 서브카테고리를 정규화한다', () => {
    expect(normalizeOtherSubKey('미용')).toBe('grooming');
    expect(normalizeOtherSubKey('medicine')).toBe('hospital');
  });

  it('record에서 화면용 카테고리 메타를 계산한다', () => {
    const meta = getRecordCategoryMeta({
      id: 'm1',
      petId: 'p1',
      title: '미용했어요',
      tags: ['#기타', '#미용'],
      createdAt: '2026-03-06T10:00:00.000Z',
      imagePaths: [],
    });

    expect(meta.mainCategory).toBe('other');
    expect(meta.otherSubCategory).toBe('grooming');
    expect(meta.label).toContain('미용');
  });
});
