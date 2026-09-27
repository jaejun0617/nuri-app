import { buildStickyActionPadding } from './profileEditPresentation';
import {
  getSeasonalProfileEditVisual,
  type SeasonalProfileEditVisual,
} from '../../theme/seasonal/profileEdit';
import type { SeasonKey } from '../../theme/seasonal/season';

export type ProfileRegistrationSeasonalPresentation =
  SeasonalProfileEditVisual & {
    continuationColors: [string, string, string, string];
    readabilityVeilColors: [string, string, string, string];
  };

type RegistrationAtmosphere = Pick<
  ProfileRegistrationSeasonalPresentation,
  'continuationColors' | 'readabilityVeilColors'
>;

const REGISTRATION_ATMOSPHERES: Record<SeasonKey, RegistrationAtmosphere> = {
  autumn: {
    continuationColors: ['#FAEEDC', '#FBF3E7', '#FFF8EE', '#FFFCF8'],
    readabilityVeilColors: [
      'rgba(255, 251, 244, 0.52)',
      'rgba(255, 249, 239, 0.34)',
      'rgba(255, 247, 236, 0.14)',
      'rgba(255, 247, 236, 0)',
    ],
  },
  winter: {
    continuationColors: ['#EAF5FC', '#F1F8FD', '#F8FCFF', '#FFFFFF'],
    readabilityVeilColors: [
      'rgba(249, 253, 255, 0.58)',
      'rgba(242, 249, 255, 0.36)',
      'rgba(237, 247, 255, 0.14)',
      'rgba(237, 247, 255, 0)',
    ],
  },
  spring: {
    continuationColors: ['#FDE9EF', '#FFF1F4', '#FFF7F5', '#FFFCFA'],
    readabilityVeilColors: [
      'rgba(255, 249, 251, 0.56)',
      'rgba(255, 244, 248, 0.36)',
      'rgba(255, 240, 246, 0.14)',
      'rgba(255, 240, 246, 0)',
    ],
  },
  summer: {
    continuationColors: ['#EDF8E5', '#F4FBEF', '#FAFCEF', '#FFFEF9'],
    readabilityVeilColors: [
      'rgba(252, 255, 248, 0.56)',
      'rgba(247, 253, 240, 0.36)',
      'rgba(242, 250, 233, 0.14)',
      'rgba(242, 250, 233, 0)',
    ],
  },
};

/**
 * Resolves Registration atmosphere without owning any layout values. The
 * underlying Profile Edit visual keeps both profile surfaces on one asset and
 * palette contract while Registration remains the sole owner of its geometry.
 */
export function getProfileRegistrationSeasonalPresentation(
  season: SeasonKey,
  override: 'auto' | SeasonKey = 'auto',
): ProfileRegistrationSeasonalPresentation {
  const profileVisual = getSeasonalProfileEditVisual(season, override);

  return {
    ...profileVisual,
    ...REGISTRATION_ATMOSPHERES[profileVisual.season],
  };
}

export type RegistrationActionLayout = {
  closedBottom: number;
  openBottom: number;
  focusedInputBottomOffset: number;
};

export type RegistrationScrollMetrics = {
  contentHeight: number;
  offsetY: number;
  viewportHeight: number;
};

/**
 * Keeps keyboard movement and action-zone insets under separate owners while
 * deriving focused-input clearance from the action zone's measured height.
 */
export function buildRegistrationActionLayout(input: {
  safeAreaBottom: number;
  actionZonePadding: number;
  measuredActionZoneHeight: number;
}): RegistrationActionLayout {
  const actionPadding = buildStickyActionPadding({
    safeAreaBottom: input.safeAreaBottom,
    actionZonePadding: input.actionZonePadding,
  });
  const measuredActionZoneHeight = Number.isFinite(
    input.measuredActionZoneHeight,
  )
    ? Math.max(0, input.measuredActionZoneHeight)
    : 0;

  return {
    ...actionPadding,
    focusedInputBottomOffset:
      measuredActionZoneHeight +
      actionPadding.openBottom +
      input.actionZonePadding,
  };
}

/**
 * Removes the temporary keyboard-expanded scroll range after the IME closes.
 * This keeps the last form section adjacent to the shared action zone instead
 * of preserving a phantom blank area below the natural content bounds.
 */
export function clampRegistrationScrollOffset(
  metrics: RegistrationScrollMetrics,
): number {
  const contentHeight = Number.isFinite(metrics.contentHeight)
    ? Math.max(0, metrics.contentHeight)
    : 0;
  const viewportHeight = Number.isFinite(metrics.viewportHeight)
    ? Math.max(0, metrics.viewportHeight)
    : 0;
  const offsetY = Number.isFinite(metrics.offsetY)
    ? Math.max(0, metrics.offsetY)
    : 0;

  return Math.min(offsetY, Math.max(0, contentHeight - viewportHeight));
}
