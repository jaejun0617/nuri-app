import {
  buildProfileCompletionSummary,
  captureSavedPetProfile,
} from '../src/screens/Pets/profileCompletionPresentation';
import { formatPetCalendarAgeLabel } from '../src/services/pets/age';
import {
  formatMemorialPetName,
  isMemorialPet,
} from '../src/services/pets/memorial';

describe('saved profile receipt and calendar display', () => {
  const now = new Date('2026-10-28T01:00:00Z');
  it('uses saved identity, taxonomy display name, profile weight and enum instead of example values', () => {
    const pet = {
      id: 'edited',
      name: '보리',
      avatarUrl: 'https://example.test/immutable.jpg',
      species: 'cat' as const,
      speciesDisplayName: '코리안 쇼트헤어',
      birthDate: '2023-08-28',
      weightKg: 4.15,
      gender: 'female' as const,
    };
    const summary = buildProfileCompletionSummary(
      captureSavedPetProfile(pet),
      now,
    );
    expect(summary.name).toBe('보리');
    expect(summary.photoUri).toBe(pet.avatarUrl);
    expect(summary.fields.map(field => field.value)).toEqual([
      '코리안 쇼트헤어',
      '3살 2개월',
      '4.15kg',
      '여아',
    ]);
  });
  it('keeps all four cells and distinguishes missing data from genuine age zero', () => {
    const empty = buildProfileCompletionSummary(
      { id: 'edited', name: '보리' },
      now,
    );
    expect(empty.fields.map(field => field.value)).toEqual([
      '미입력',
      '미입력',
      '미입력',
      '미입력',
    ]);
    expect(
      buildProfileCompletionSummary(
        {
          id: 'edited',
          name: '보리',
          birthDate: '2026-10-28',
          weightKg: 0,
          gender: 'unknown',
        },
        now,
      ).fields.map(field => field.value),
    ).toEqual(['미입력', '생후 0개월', '미입력', '미입력']);
  });
  it.each(['2026-02-30', '2027-01-01', 'not-a-date', '2024-13-01'])(
    'rejects invalid/future date %s',
    birth => {
      expect(formatPetCalendarAgeLabel(birth, now)).toBeNull();
    },
  );
  it.each([
    ['2025-10-28', '2026-10-27T14:59:59Z', '생후 11개월'],
    ['2025-10-28', '2026-10-27T15:00:00Z', '1살'],
    ['2024-02-29', '2025-02-28T01:00:00Z', '1살'],
    ['2026-01-31', '2026-02-28T01:00:00Z', '생후 1개월'],
  ])('counts KST calendar boundary %s at %s', (birth, at, expected) => {
    expect(formatPetCalendarAgeLabel(birth, new Date(at))).toBe(expected);
  });
  it('captures values rather than keeping a mutable pet-store reference', () => {
    const pet = { id: 'edited', name: '보리', weightKg: 4.15 };
    const snapshot = captureSavedPetProfile(pet);
    pet.name = 'Changed elsewhere';
    expect(snapshot.name).toBe('보리');
  });
  it('removes automatic rainbow name decoration without changing memorial status', () => {
    expect(formatMemorialPetName(' 누리 ', '2026-01-01')).toBe('누리');
    expect(formatMemorialPetName('누리', null)).toBe('누리');
    expect(formatMemorialPetName(null, '2026-01-01')).toBe('반려동물');
    expect(isMemorialPet('2026-01-01')).toBe(true);
  });
});
