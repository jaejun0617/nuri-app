import {
  buildPrivateLetterPreview,
  getPrivateLetterValidationMessage,
  normalizePrivateLetterContent,
  PRIVATE_LETTER_CONTENT_MAX_LENGTH,
} from '../src/domains/privateLetters';

describe('private letters domain helpers', () => {
  it('normalizes CRLF and trims content', () => {
    expect(normalizePrivateLetterContent('  안녕\r\n오늘도 고마워\r  ')).toBe(
      '안녕\n오늘도 고마워',
    );
  });

  it('rejects empty and overlong content', () => {
    expect(getPrivateLetterValidationMessage('   ')).toBe('편지 내용을 입력해 주세요.');
    expect(
      getPrivateLetterValidationMessage(
        'a'.repeat(PRIVATE_LETTER_CONTENT_MAX_LENGTH + 1),
      ),
    ).toContain('5,000자');
  });

  it('builds a compact preview without exposing multiline layout noise', () => {
    expect(buildPrivateLetterPreview('첫 줄\n\n둘째 줄')).toBe('첫 줄 둘째 줄');
    expect(buildPrivateLetterPreview('가'.repeat(80))).toHaveLength(75);
  });
});
