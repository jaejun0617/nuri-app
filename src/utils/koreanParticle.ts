// 한글 이름의 마지막 음절에 받침이 있는지 판별해 자연스러운 조사를 붙인다.
// 비한글 이름은 서비스 정책을 임의 추론하지 않고 모음형 조사를 안전하게 사용한다.
export function appendKoreanParticle(
  value: string,
  vowelParticle: string,
  consonantParticle: string,
): string {
  const lastCharacter = Array.from(value).at(-1);
  if (!lastCharacter) return value;

  const codePoint = lastCharacter.codePointAt(0);
  const isHangulSyllable =
    codePoint !== undefined && codePoint >= 0xac00 && codePoint <= 0xd7a3;

  if (!isHangulSyllable) return `${value}${vowelParticle}`;

  const hasFinalConsonant = (codePoint - 0xac00) % 28 !== 0;
  return `${value}${hasFinalConsonant ? consonantParticle : vowelParticle}`;
}
