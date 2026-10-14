import React, { memo } from 'react';
import type { SeasonKey } from '../../theme/seasonal/season';
import { getHomeAmbientVisual } from '../../theme/home/seasonalAmbient';
import { HOME_FLOATING_WIDGET_MATERIAL } from './HomeWidgetMaterial';
import { HomeReflectiveGlass } from './HomeReflectiveGlass';

// Keep existing card entry points compatible while their material becomes neutral.
export function resolveHomeFrostedMaterial(season: SeasonKey) {
  return {
    backgroundColor: HOME_FLOATING_WIDGET_MATERIAL.backgroundColor,
    borderColor: HOME_FLOATING_WIDGET_MATERIAL.borderColor,
    reducedTransparencyFallbackColor: getHomeAmbientVisual(season).baseColor,
  };
}
type Props = React.ComponentProps<typeof HomeReflectiveGlass> & {
  season: SeasonKey;
};

/** Legacy name retained for existing screens; every card now shares widget reflection. */
export const HomeFrostedGlass = memo(function HomeFrostedGlassView({
  season: _season,
  ...presentationProps
}: Props) {
  return <HomeReflectiveGlass {...presentationProps} />;
});
