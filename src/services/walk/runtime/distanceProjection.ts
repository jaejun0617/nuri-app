import { NativeModules } from 'react-native';
import { parseWalkQualitySummary } from '../domain/finishPayload';
import type { WalkQualitySummaryV1 } from '../domain';

export type WalkDistanceSummary = Readonly<{
  algorithmVersion: 1; policyVersion: 1;
  measuredDistanceM: string; acceptedDistanceM: string; routeRevision: string;
  recommendation: 'ELIGIBLE_CANDIDATE' | 'INELIGIBLE_CANDIDATE';
  gpsSignal: 'GPS_READY' | 'GPS_WEAK' | 'GPS_LOST'; quality: WalkQualitySummaryV1;
}>;
export type WalkMapPoint = Readonly<{ latitude: number; longitude: number }>;
export type WalkRoutePage = Readonly<{
  routeRevision: string; filteredPointCount: string; startCursor: string; endCursor: string;
  hasEarlier: boolean; hasLater: boolean; current: WalkMapPoint | null;
  segments: ReadonlyArray<Readonly<{ segmentId: string; points: ReadonlyArray<WalkMapPoint> }>>;
}>;
const fail = (): never => { throw new Error('WALK_INVALID_NATIVE_SNAPSHOT'); };
export function walkExactObject(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const r = value as Record<string, unknown>;
  if (Object.keys(r).length !== keys.length || Object.keys(r).some(k => !keys.includes(k))) return fail();
  return r;
}
export function walkDecimal(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 80 && /^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(value)
    && Number.isFinite(Number(value)) && Number(value) <= 10000000;
}
export function decodeWalkDistanceSummary(input: unknown): WalkDistanceSummary {
  const v = walkExactObject(input, ['algorithmVersion', 'policyVersion', 'measuredDistanceM',
    'acceptedDistanceM', 'routeRevision', 'recommendation', 'gpsSignal', 'quality']);
  if (v.algorithmVersion !== 1 || v.policyVersion !== 1 || !walkDecimal(v.measuredDistanceM)
    || !walkDecimal(v.acceptedDistanceM) || Number(v.acceptedDistanceM) > Number(v.measuredDistanceM) + 0.001
    || typeof v.routeRevision !== 'string' || !/^(0|[1-9][0-9]*)$/.test(v.routeRevision)
    || !['ELIGIBLE_CANDIDATE', 'INELIGIBLE_CANDIDATE'].includes(String(v.recommendation))
    || !['GPS_READY', 'GPS_WEAK', 'GPS_LOST'].includes(String(v.gpsSignal))) return fail();
  let quality: WalkQualitySummaryV1;
  try { quality = parseWalkQualitySummary(v.quality); } catch { return fail(); }
  if (quality.totalFixCount !== quality.acceptedFixCount + quality.rejectedAccuracyCount
    + quality.rejectedTimestampCount + quality.rejectedDuplicateCount + quality.rejectedJumpCount
    + quality.rejectedSpeedCount + quality.stationarySuppressedCount) return fail();
  return { ...v, quality } as WalkDistanceSummary;
}
function point(value: unknown): WalkMapPoint {
  const v = walkExactObject(value, ['latitude', 'longitude']);
  if (typeof v.latitude !== 'number' || !Number.isFinite(v.latitude) || Math.abs(v.latitude) > 90
    || typeof v.longitude !== 'number' || !Number.isFinite(v.longitude) || Math.abs(v.longitude) > 180) return fail();
  return v as WalkMapPoint;
}
export function decodeWalkRoutePage(raw: string): WalkRoutePage {
  let parsed: unknown; try { parsed = JSON.parse(raw); } catch { return fail(); }
  const v = walkExactObject(parsed, ['routeRevision', 'filteredPointCount', 'startCursor', 'endCursor',
    'hasEarlier', 'hasLater', 'current', 'segments']);
  if (!['routeRevision', 'filteredPointCount'].every(k => typeof v[k] === 'string' && /^(0|[1-9][0-9]*)$/.test(String(v[k])))
    || !['startCursor', 'endCursor'].every(k => typeof v[k] === 'string' && /^(-1|0|[1-9][0-9]*)$/.test(String(v[k])))
    || typeof v.hasEarlier !== 'boolean' || typeof v.hasLater !== 'boolean' || !Array.isArray(v.segments)) return fail();
  let count = 0;
  const segments = v.segments.map((input: unknown) => {
    const s = walkExactObject(input, ['segmentId', 'points']);
    if (typeof s.segmentId !== 'string' || !/^[1-9][0-9]*$/.test(s.segmentId) || !Array.isArray(s.points) || !s.points.length) return fail();
    count += s.points.length; if (count > 512) return fail();
    return { segmentId: s.segmentId, points: s.points.map(point) };
  });
  return { routeRevision: String(v.routeRevision), filteredPointCount: String(v.filteredPointCount),
    startCursor: String(v.startCursor), endCursor: String(v.endCursor), hasEarlier: v.hasEarlier,
    hasLater: v.hasLater, segments, current: v.current === null ? null : point(v.current) };
}
type DistanceModule = Readonly<{
  qaEnabled: boolean; distanceApiVersion: 1;
  getRoutePage: (direction: string, cursor: string, revision: string) => Promise<string>;
  qaCommand: (operation: string, input: string) => Promise<string>;
  noteQaMapVisible: (visible: boolean) => void;
}>;
function module(): DistanceModule {
  const raw: unknown = NativeModules.NuriWalk;
  if (!raw || typeof raw !== 'object') throw new Error('WALK_QA_DISABLED');
  const v = raw as Record<string, unknown>;
  if (v.qaEnabled !== true || v.distanceApiVersion !== 1 || ['getRoutePage', 'qaCommand', 'noteQaMapVisible'].some(k => typeof v[k] !== 'function')) throw new Error('WALK_QA_DISABLED');
  return raw as DistanceModule;
}
export function isWalkDistanceQaEnabled(): boolean { try { module(); return true; } catch { return false; } }
export async function getWalkRoutePage(direction: 'FIRST' | 'TAIL' | 'BEFORE' | 'AFTER', cursor: string, revision: string) {
  return decodeWalkRoutePage(await module().getRoutePage(direction, cursor, revision));
}
export async function runWalkQaCommand(operation: string, input: Readonly<Record<string, string | boolean | number>> = {}): Promise<unknown> {
  const raw = await module().qaCommand(operation, JSON.stringify(input));
  try { return JSON.parse(raw) as unknown; } catch { throw new Error('WALK_QA_PROTOCOL_INVALID'); }
}
export const noteWalkQaMapVisible = (visible: boolean) => module().noteQaMapVisible(visible);
export type WalkCameraMode = 'FOLLOW' | 'FREE_LOOK';
export function walkCameraAction(mode: WalkCameraMode, action: 'DRAG' | 'RECENTER' | 'FIX'): WalkCameraMode {
  return action === 'DRAG' ? 'FREE_LOOK' : action === 'RECENTER' ? 'FOLLOW' : mode;
}
