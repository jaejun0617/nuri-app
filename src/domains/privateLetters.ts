// 파일: src/domains/privateLetters.ts
// 파일 목적:
// - private letters 화면과 Supabase write path가 공유하는 입력 정규화와 표시 규칙을 제공한다.
// 어디서 쓰이는지:
// - GuestbookTab을 private letters IA로 전환한 화면과 letters repository에서 사용된다.
// 핵심 역할:
// - legacy letters 테이블을 공개 방명록처럼 다루지 않도록, 펫별 사적 편지 입력 규칙을 한 곳에 고정한다.

export const PRIVATE_LETTER_CONTENT_MAX_LENGTH = 5000;

export type PrivateLetter = {
  id: string;
  petId: string;
  content: string;
  createdAt: string;
};

export function normalizePrivateLetterContent(value: string): string {
  return value.replace(/\r\n?/g, '\n').trim();
}

export function getPrivateLetterValidationMessage(value: string): string | null {
  const normalized = normalizePrivateLetterContent(value);

  if (!normalized) {
    return '편지 내용을 입력해 주세요.';
  }

  if (normalized.length > PRIVATE_LETTER_CONTENT_MAX_LENGTH) {
    return `편지는 ${PRIVATE_LETTER_CONTENT_MAX_LENGTH.toLocaleString('ko-KR')}자 이내로 남겨 주세요.`;
  }

  return null;
}

export function buildPrivateLetterPreview(content: string): string {
  const normalized = normalizePrivateLetterContent(content).replace(/\s+/g, ' ');
  if (normalized.length <= 72) return normalized;
  return `${normalized.slice(0, 72).trimEnd()}...`;
}

export function formatPrivateLetterDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '날짜 확인 중';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
