import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveTimelinePetId } from '../src/services/timeline/petContext';
import type { Pet } from '../src/store/petStore';

const pets: Pet[] = [
  { id: 'alive', name: 'Alive', deathDate: null },
  { id: 'memorial', name: 'Memorial', deathDate: '2026-02-22' },
];

describe('Timeline selection versus notification target', () => {
  it('does not retain a composer-return pet after Home changes selection', () => {
    expect(resolveTimelinePetId(pets, 'alive', 'alive', false)).toBe('alive');
    expect(resolveTimelinePetId(pets, 'memorial', 'alive', false)).toBe('memorial');
    expect(resolveTimelinePetId(pets, 'alive', 'alive', false)).toBe('alive');
  });

  it('does not fall back to a stale ordinary route when selection was removed', () => {
    expect(resolveTimelinePetId(pets, 'missing', 'memorial', false)).toBe('alive');
    expect(resolveTimelinePetId([], 'alive', 'alive', false)).toBeNull();
  });

  it('pins an owned notification pet despite a different global selection', () => {
    expect(resolveTimelinePetId(pets, 'alive', 'memorial', true)).toBe('memorial');
    expect(resolveTimelinePetId(pets, 'memorial', 'alive', true)).toBe('alive');
  });

  it('never substitutes another pet for an inaccessible notification target', () => {
    expect(resolveTimelinePetId(pets, 'alive', 'missing', true)).toBeNull();
    expect(resolveTimelinePetId([], 'alive', 'memorial', true)).toBeNull();
  });

  it('keeps the owner-wide notification selection fallback without pinning a pet', () => {
    expect(resolveTimelinePetId(pets, 'memorial', null, true)).toBe('memorial');
  });

  it('uses the same resolver in the actual screen without resetting its route', () => {
    const source = readFileSync(join(__dirname, '../src/screens/Records/TimelineScreen.tsx'), 'utf8');
    expect(source).toContain('() => resolveTimelinePetId(');
    expect(source).not.toContain('resolveSelectedPetId(pets, selectedPetId, petIdFromParams)');
    expect(source).toContain('period: route.params?.notificationPeriod');
  });
});
