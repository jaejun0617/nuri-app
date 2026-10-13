import { WalkDomainError } from './errorCodes';

// Wire bounds match PostgreSQL BIGINT; pure progression math has no level cap.
export const WALK_WIRE_INTEGER_MAX = 9223372036854775807n;
export const WALK_DECIMAL_MAX_DIGITS = 256;

export function parseWalkInteger(
  input: unknown,
  unit: 'DISTANCE' | 'DURATION',
): bigint {
  if (typeof input !== 'string') {
    throw new WalkDomainError(
      unit === 'DISTANCE' ? 'WALK_INVALID_DISTANCE' : 'WALK_INVALID_DURATION',
    );
  }
  if (input.length > WALK_DECIMAL_MAX_DIGITS)
    throw new WalkDomainError('WALK_INTEGER_OUT_OF_RANGE');
  if (!/^[0-9]+$/.test(input)) {
    throw new WalkDomainError(
      unit === 'DISTANCE' ? 'WALK_INVALID_DISTANCE' : 'WALK_INVALID_DURATION',
    );
  }
  return BigInt(input);
}

export function assertWalkNonNegative(
  value: bigint,
  unit: 'DISTANCE' | 'DURATION',
): void {
  if (typeof value !== 'bigint' || value < 0n) {
    throw new WalkDomainError(
      unit === 'DISTANCE' ? 'WALK_INVALID_DISTANCE' : 'WALK_INVALID_DURATION',
    );
  }
}

export function toWalkDecimal(value: bigint): string {
  if (typeof value !== 'bigint' || value < 0n)
    throw new WalkDomainError('WALK_INTEGER_OUT_OF_RANGE');
  return value.toString(10);
}

export function toSafeWalkNumber(value: bigint): number {
  if (
    typeof value !== 'bigint' ||
    value < 0n ||
    value > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new WalkDomainError('WALK_INTEGER_OUT_OF_RANGE');
  }
  return Number(value);
}

export function parseWalkWireInteger(
  input: unknown,
  unit: 'DISTANCE' | 'DURATION',
): bigint {
  const result = parseWalkInteger(input, unit);
  if (result > WALK_WIRE_INTEGER_MAX)
    throw new WalkDomainError('WALK_INTEGER_OUT_OF_RANGE');
  return result;
}

export function normalizeWalkUuid(input: unknown): string {
  if (
    typeof input !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input,
    )
  ) {
    throw new WalkDomainError('WALK_INVALID_IDENTIFIER');
  }
  return input.toLowerCase();
}
