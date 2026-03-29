import { formatTrustBasisDate } from './publicTrust';
import type { PetTravelUserReportType } from '../petTravel/types';
import type { PetPlaceOwnReportStatus } from '../supabase/placeTravelUserLayer';

export function getPetPlaceOwnReportLabel(
  value: PetPlaceOwnReportStatus | null | undefined,
): string | null {
  switch (value) {
    case 'pet-friendly':
      return '내가 동반 가능으로 제보함';
    case 'not-pet-friendly':
      return '내가 제한/불가로 제보함';
    case 'policy-changed':
      return '내가 정책 변경으로 제보함';
    case 'unknown':
      return '내가 확인 필요로 제보함';
    default:
      return null;
  }
}

export function getPetTravelOwnReportLabel(
  value: PetTravelUserReportType | null | undefined,
): string | null {
  switch (value) {
    case 'pet_allowed':
      return '내가 동반 가능으로 제보함';
    case 'pet_restricted':
      return '내가 제한/불가로 제보함';
    case 'info_outdated':
      return '내가 정보 변경으로 제보함';
    default:
      return null;
  }
}

export function buildPersonalStateDateLabel(
  value: string | null | undefined,
  prefix = '최근 업데이트',
): string | null {
  const formatted = formatTrustBasisDate(value);
  if (!formatted) {
    return null;
  }

  return `${prefix} ${formatted}`;
}
