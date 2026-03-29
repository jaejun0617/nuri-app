export type ServiceDataLayer = 'candidate' | 'trust' | 'user';

export type PublicTrustLabel =
  | 'candidate'
  | 'needs_verification'
  | 'trust_reviewed';

export type PublicTrustTone =
  | 'neutral'
  | 'caution'
  | 'positive'
  | 'critical';

export type PublicTrustInfo = {
  publicLabel: PublicTrustLabel;
  label: string;
  shortReason: string;
  description: string;
  guidance: string;
  tone: PublicTrustTone;
  sourceLabel: string;
  basisDate: string | null;
  basisDateLabel: string | null;
  isStale: boolean;
  hasConflict: boolean;
  layers: ReadonlyArray<ServiceDataLayer>;
};

export const TRUST_STALE_AFTER_DAYS = 90;

type TrustEvidenceInput = {
  summaryText?: string | null;
  noteText?: string | null;
  linkCount?: number;
  signalCount?: number;
  payload?: Record<string, unknown> | null;
};

type TrustReviewedGateInput = {
  isAdminReviewed: boolean;
  basisDate: string | null | undefined;
  hasConflict?: boolean;
  requiresOnsiteCheck?: boolean;
  hasEvidence?: boolean;
  staleAfterDays?: number;
};

export function getPublicTrustLabelText(label: PublicTrustLabel): string {
  switch (label) {
    case 'trust_reviewed':
      return '검수 반영';
    case 'needs_verification':
      return '확인 필요';
    case 'candidate':
    default:
      return '후보';
  }
}

export function getPublicTrustPriority(label: PublicTrustLabel): number {
  switch (label) {
    case 'trust_reviewed':
      return 0;
    case 'needs_verification':
      return 1;
    case 'candidate':
    default:
      return 2;
  }
}

export function isTrustDateStale(
  value: string | null | undefined,
  staleAfterDays = TRUST_STALE_AFTER_DAYS,
): boolean {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return Date.now() - timestamp > staleAfterDays * 24 * 60 * 60 * 1000;
}

export function hasTrustBasisDate(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  return Number.isFinite(Date.parse(value));
}

export function hasAnyTrustEvidence(input: TrustEvidenceInput): boolean {
  const summaryText = input.summaryText?.trim();
  if (summaryText) {
    return true;
  }

  const noteText = input.noteText?.trim();
  if (noteText) {
    return true;
  }

  if ((input.linkCount ?? 0) > 0) {
    return true;
  }

  if ((input.signalCount ?? 0) > 0) {
    return true;
  }

  const payload = input.payload ?? null;
  if (payload && Object.keys(payload).length > 0) {
    return true;
  }

  return false;
}

export function canKeepTrustReviewed(input: TrustReviewedGateInput): boolean {
  if (!input.isAdminReviewed) {
    return false;
  }

  if (!hasTrustBasisDate(input.basisDate)) {
    return false;
  }

  if (!input.hasEvidence) {
    return false;
  }

  if (input.hasConflict) {
    return false;
  }

  if (input.requiresOnsiteCheck) {
    return false;
  }

  if (isTrustDateStale(input.basisDate, input.staleAfterDays)) {
    return false;
  }

  return true;
}

export function formatTrustBasisDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export function buildTrustBasisDateLabel(
  value: string | null | undefined,
  prefix: string,
): string | null {
  const formatted = formatTrustBasisDate(value);
  if (!formatted) {
    return null;
  }

  return `${prefix} ${formatted}`;
}
