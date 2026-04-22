import {
  isPreciseLocationCoordinates,
  isWeakLocationSignal,
  shouldPromoteLocationCoordinates,
  type DeviceCoordinates,
} from '../src/services/location/currentPosition';

function coords(input: Partial<DeviceCoordinates>): DeviceCoordinates {
  return {
    latitude: input.latitude ?? 37.5,
    longitude: input.longitude ?? 127,
    accuracy: input.accuracy ?? 30,
    capturedAt: input.capturedAt ?? Date.now(),
    source: input.source ?? 'gps',
  };
}

describe('currentPosition quality helpers', () => {
  it('stale cached coordinate보다 fresh network coordinate를 승격한다', () => {
    const stale = coords({
      accuracy: 20,
      capturedAt: Date.now() - 10 * 60 * 1000,
      source: 'gps',
    });
    const freshNetwork = coords({
      accuracy: 80,
      capturedAt: Date.now(),
      source: 'network',
    });

    expect(shouldPromoteLocationCoordinates(stale, freshNetwork)).toBe(true);
  });

  it('약신호와 precise coordinate를 분리한다', () => {
    expect(isWeakLocationSignal(coords({ accuracy: 1500 }))).toBe(true);
    expect(isPreciseLocationCoordinates(coords({ accuracy: 30 }))).toBe(true);
    expect(
      isPreciseLocationCoordinates(coords({ accuracy: 30, source: 'network' })),
    ).toBe(false);
  });
});
