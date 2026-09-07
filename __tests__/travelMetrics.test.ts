import {
  buildWalkingTravelLabel,
  calculateDistanceMeters,
  compareNullableDistanceMeters,
  estimateWalkMinutes,
  formatDistanceLabel,
  isValidGeographicCoordinate,
} from '../src/services/locationDiscovery/travelMetrics';

describe('shared place travel metrics', () => {
  it.each([
    [
      '서울 도심 단거리',
      { latitude: 37.5665, longitude: 126.978 },
      { latitude: 37.5674, longitude: 126.978 },
      95,
      105,
    ],
    [
      '부산 도심 중거리',
      { latitude: 35.1796, longitude: 129.0756 },
      { latitude: 35.1841, longitude: 129.0756 },
      495,
      505,
    ],
    [
      '제주 장거리',
      { latitude: 33.4996, longitude: 126.5312 },
      { latitude: 33.5086, longitude: 126.5312 },
      995,
      1_010,
    ],
  ])('%s 좌표를 지역 분기 없이 meter로 계산한다', (_, origin, target, min, max) => {
    const distance = calculateDistanceMeters(origin, target);

    expect(distance).not.toBeNull();
    expect(distance!).toBeGreaterThanOrEqual(min);
    expect(distance!).toBeLessThanOrEqual(max);
    expect(calculateDistanceMeters(target, origin)).toBe(distance);
  });

  it('잘못된 좌표는 거리 0으로 보정하지 않는다', () => {
    expect(isValidGeographicCoordinate({ latitude: 0, longitude: 0 })).toBe(
      false,
    );
    expect(
      calculateDistanceMeters(
        { latitude: 127, longitude: 37 },
        { latitude: 37.5, longitude: 127 },
      ),
    ).toBeNull();
    expect(
      calculateDistanceMeters(null, { latitude: 37.5, longitude: 127 }),
    ).toBeNull();
  });

  it.each([
    [104, 2],
    [166, 4],
    [500, 11],
    [1_000, 23],
    [1_500, 34],
  ])('%dm를 임의의 15분 하한 없이 %d분으로 계산한다', (meters, minutes) => {
    expect(estimateWalkMinutes(meters)).toBe(minutes);
  });

  it('거리 하나에서 표시 거리와 도보 시간을 함께 만든다', () => {
    expect(buildWalkingTravelLabel({ distanceMeters: 166 })).toBe(
      '도보 약 4분 · 166m',
    );
    expect(buildWalkingTravelLabel({ distanceMeters: null })).toBe(
      '거리 확인 중',
    );
  });

  it.each([
    ['ascending' as const, [100, 500, 1_000, null]],
    ['descending' as const, [1_000, 500, 100, null]],
  ])('%s 정렬에서도 거리 미확인 항목은 마지막에 둔다', (direction, expected) => {
    const distances = [500, null, 1_000, 100];

    expect(
      distances.sort((left, right) =>
        compareNullableDistanceMeters(left, right, direction),
      ),
    ).toEqual(expected);
  });

  it('invalid 거리도 확인되지 않은 값으로 분류해 정렬 끝에 둔다', () => {
    const distances = [Number.NaN, 500, -1, 100];

    expect(
      distances.sort((left, right) =>
        compareNullableDistanceMeters(left, right, 'descending'),
      ),
    ).toEqual([500, 100, Number.NaN, -1]);
    expect(formatDistanceLabel(Number.NaN)).toBe('거리 확인 중');
    expect(formatDistanceLabel(-1)).toBe('거리 확인 중');
  });
});
