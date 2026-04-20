type GeographicCoordinate = {
  latitude: number;
  longitude: number;
};

type CartesianCoordinate = {
  x: number;
  y: number;
  z: number;
};

type Ellipsoid = {
  semiMajorAxis: number;
  inverseFlattening: number;
};

const BESSEL_1841: Ellipsoid = {
  semiMajorAxis: 6377397.155,
  inverseFlattening: 299.1528128,
};

const WGS84: Ellipsoid = {
  semiMajorAxis: 6378137,
  inverseFlattening: 298.257223563,
};

const EPSG5174_PROJECTION = {
  latitudeOfOrigin: degreesToRadians(38),
  centralMeridian: degreesToRadians(127.00289027777778),
  scaleFactor: 1,
  falseEasting: 200000,
  falseNorthing: 500000,
};

const KOREAN_1985_TO_WGS84_HELMERT = {
  dx: -145.907,
  dy: 505.034,
  dz: 685.756,
  rx: arcSecondsToRadians(-1.162),
  ry: arcSecondsToRadians(2.347),
  rz: arcSecondsToRadians(1.592),
  scale: 1 + 6.342e-6,
};

const MAX_MERIDIAN_ITERATIONS = 8;
const MERIDIAN_TOLERANCE = 1e-11;
const COORDINATE_DECIMAL_PRECISION = 6;

export function convertEpsg5174ToWgs84(input: {
  x: number | null | undefined;
  y: number | null | undefined;
}): GeographicCoordinate | null {
  const { x, y } = input;

  if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
    return null;
  }

  const korean1985 = inverseKoreaCentralBelt({ x, y });
  const besselCartesian = geographicToCartesian(korean1985, BESSEL_1841);
  const wgs84Cartesian = applyHelmertTransform(besselCartesian);
  const wgs84 = cartesianToGeographic(wgs84Cartesian, WGS84);

  if (!isValidWgs84Coordinate(wgs84)) {
    return null;
  }

  return {
    latitude: roundCoordinate(wgs84.latitude),
    longitude: roundCoordinate(wgs84.longitude),
  };
}

export function isValidWgs84Coordinate(
  coordinate: GeographicCoordinate | null | undefined,
): coordinate is GeographicCoordinate {
  return (
    Boolean(coordinate) &&
    isFiniteNumber(coordinate?.latitude) &&
    isFiniteNumber(coordinate?.longitude) &&
    coordinate.latitude >= -90 &&
    coordinate.latitude <= 90 &&
    coordinate.longitude >= -180 &&
    coordinate.longitude <= 180
  );
}

function inverseKoreaCentralBelt(input: {
  x: number;
  y: number;
}): GeographicCoordinate {
  const ellipsoid = getEllipsoidMetrics(BESSEL_1841);
  const projection = EPSG5174_PROJECTION;
  const meridianAtOrigin = meridianArc(projection.latitudeOfOrigin, ellipsoid);
  const meridian =
    meridianAtOrigin +
    (input.y - projection.falseNorthing) / projection.scaleFactor;
  const footprintLatitude = calculateFootprintLatitude(meridian, ellipsoid);
  const radiusPrimeVertical =
    ellipsoid.semiMajorAxis /
    Math.sqrt(
      1 - ellipsoid.eccentricitySquared * Math.sin(footprintLatitude) ** 2,
    );
  const radiusMeridian =
    (ellipsoid.semiMajorAxis * (1 - ellipsoid.eccentricitySquared)) /
    (1 - ellipsoid.eccentricitySquared * Math.sin(footprintLatitude) ** 2) **
      1.5;
  const tangent = Math.tan(footprintLatitude);
  const etaSquared =
    ellipsoid.secondEccentricitySquared * Math.cos(footprintLatitude) ** 2;
  const eastingDelta =
    (input.x - projection.falseEasting) /
    (radiusPrimeVertical * projection.scaleFactor);

  const latitude =
    footprintLatitude -
    ((radiusPrimeVertical * tangent) / radiusMeridian) *
      (eastingDelta ** 2 / 2 -
        ((5 + 3 * tangent ** 2 + etaSquared - 9 * etaSquared * tangent ** 2) *
          eastingDelta ** 4) /
          24 +
        ((61 + 90 * tangent ** 2 + 45 * tangent ** 4) * eastingDelta ** 6) /
          720);
  const longitude =
    projection.centralMeridian +
    (eastingDelta -
      ((1 + 2 * tangent ** 2 + etaSquared) * eastingDelta ** 3) / 6 +
      ((5 +
        28 * tangent ** 2 +
        24 * tangent ** 4 +
        6 * etaSquared +
        8 * etaSquared * tangent ** 2) *
        eastingDelta ** 5) /
        120) /
      Math.cos(footprintLatitude);

  return {
    latitude: radiansToDegrees(latitude),
    longitude: radiansToDegrees(longitude),
  };
}

function calculateFootprintLatitude(
  meridian: number,
  ellipsoid: ReturnType<typeof getEllipsoidMetrics>,
): number {
  let latitude = meridian / ellipsoid.meridianCoefficientA;

  for (let iteration = 0; iteration < MAX_MERIDIAN_ITERATIONS; iteration += 1) {
    const delta =
      (meridian - meridianArc(latitude, ellipsoid)) /
      ((ellipsoid.semiMajorAxis * (1 - ellipsoid.eccentricitySquared)) /
        (1 - ellipsoid.eccentricitySquared * Math.sin(latitude) ** 2) ** 1.5);
    latitude += delta;

    if (Math.abs(delta) < MERIDIAN_TOLERANCE) {
      break;
    }
  }

  return latitude;
}

function meridianArc(
  latitude: number,
  ellipsoid: ReturnType<typeof getEllipsoidMetrics>,
): number {
  return (
    ellipsoid.meridianCoefficientA * latitude -
    ellipsoid.meridianCoefficientB * Math.sin(2 * latitude) +
    ellipsoid.meridianCoefficientC * Math.sin(4 * latitude) -
    ellipsoid.meridianCoefficientD * Math.sin(6 * latitude)
  );
}

function geographicToCartesian(
  coordinate: GeographicCoordinate,
  ellipsoid: Ellipsoid,
): CartesianCoordinate {
  const metrics = getEllipsoidMetrics(ellipsoid);
  const latitude = degreesToRadians(coordinate.latitude);
  const longitude = degreesToRadians(coordinate.longitude);
  const primeVerticalRadius =
    metrics.semiMajorAxis /
    Math.sqrt(1 - metrics.eccentricitySquared * Math.sin(latitude) ** 2);

  return {
    x: primeVerticalRadius * Math.cos(latitude) * Math.cos(longitude),
    y: primeVerticalRadius * Math.cos(latitude) * Math.sin(longitude),
    z:
      primeVerticalRadius *
      (1 - metrics.eccentricitySquared) *
      Math.sin(latitude),
  };
}

function cartesianToGeographic(
  coordinate: CartesianCoordinate,
  ellipsoid: Ellipsoid,
): GeographicCoordinate {
  const metrics = getEllipsoidMetrics(ellipsoid);
  const longitude = Math.atan2(coordinate.y, coordinate.x);
  const horizontalDistance = Math.sqrt(coordinate.x ** 2 + coordinate.y ** 2);
  let latitude = Math.atan2(
    coordinate.z,
    horizontalDistance * (1 - metrics.eccentricitySquared),
  );

  for (let iteration = 0; iteration < MAX_MERIDIAN_ITERATIONS; iteration += 1) {
    const primeVerticalRadius =
      metrics.semiMajorAxis /
      Math.sqrt(1 - metrics.eccentricitySquared * Math.sin(latitude) ** 2);
    const nextLatitude = Math.atan2(
      coordinate.z +
        metrics.eccentricitySquared * primeVerticalRadius * Math.sin(latitude),
      horizontalDistance,
    );

    if (Math.abs(nextLatitude - latitude) < MERIDIAN_TOLERANCE) {
      latitude = nextLatitude;
      break;
    }

    latitude = nextLatitude;
  }

  return {
    latitude: radiansToDegrees(latitude),
    longitude: radiansToDegrees(longitude),
  };
}

function applyHelmertTransform(
  coordinate: CartesianCoordinate,
): CartesianCoordinate {
  const { dx, dy, dz, rx, ry, rz, scale } = KOREAN_1985_TO_WGS84_HELMERT;

  return {
    x: dx + scale * coordinate.x - rz * coordinate.y + ry * coordinate.z,
    y: dy + rz * coordinate.x + scale * coordinate.y - rx * coordinate.z,
    z: dz - ry * coordinate.x + rx * coordinate.y + scale * coordinate.z,
  };
}

function getEllipsoidMetrics(ellipsoid: Ellipsoid) {
  const flattening = 1 / ellipsoid.inverseFlattening;
  const semiMinorAxis = ellipsoid.semiMajorAxis * (1 - flattening);
  const eccentricitySquared =
    (ellipsoid.semiMajorAxis ** 2 - semiMinorAxis ** 2) /
    ellipsoid.semiMajorAxis ** 2;
  const secondEccentricitySquared =
    (ellipsoid.semiMajorAxis ** 2 - semiMinorAxis ** 2) / semiMinorAxis ** 2;
  const e4 = eccentricitySquared ** 2;
  const e6 = eccentricitySquared ** 3;

  return {
    semiMajorAxis: ellipsoid.semiMajorAxis,
    eccentricitySquared,
    secondEccentricitySquared,
    meridianCoefficientA:
      ellipsoid.semiMajorAxis *
      (1 - eccentricitySquared / 4 - (3 * e4) / 64 - (5 * e6) / 256),
    meridianCoefficientB:
      ellipsoid.semiMajorAxis *
      ((3 * eccentricitySquared) / 8 + (3 * e4) / 32 + (45 * e6) / 1024),
    meridianCoefficientC:
      ellipsoid.semiMajorAxis * ((15 * e4) / 256 + (45 * e6) / 1024),
    meridianCoefficientD: ellipsoid.semiMajorAxis * ((35 * e6) / 3072),
  };
}

function roundCoordinate(value: number): number {
  const precision = 10 ** COORDINATE_DECIMAL_PRECISION;
  return Math.round(value * precision) / precision;
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

function arcSecondsToRadians(value: number): number {
  return degreesToRadians(value / 3600);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
