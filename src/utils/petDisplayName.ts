import { appendKoreanParticle } from './koreanParticle';

export function getPetDisplayName(name?: string | null): string {
  return name?.trim() || '반려동물';
}

/** Only app-owned copy templates enter here, never saved records or server content. */
export function formatPetCopy(template: string, name?: string | null): string {
  const petName = getPetDisplayName(name);
  return template.replace(
    /우리 아이(?:들)?(를|을|와|과|는|은|가|이)?/g,
    (_match, particle: string | undefined) => {
      switch (particle) {
        case '를':
        case '을':
          return appendKoreanParticle(petName, '를', '을');
        case '와':
        case '과':
          return appendKoreanParticle(petName, '와', '과');
        case '는':
        case '은':
          return appendKoreanParticle(petName, '는', '은');
        case '가':
        case '이':
          return appendKoreanParticle(petName, '가', '이');
        default:
          return petName;
      }
    },
  );
}
