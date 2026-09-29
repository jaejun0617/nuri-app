const MIN_WEATHER_TO_HOME_BRIDGE_HEIGHT = 140;
const MAX_WEATHER_TO_HOME_BRIDGE_HEIGHT = 180;
const WEATHER_TO_HOME_BRIDGE_VIEWPORT_RATIO = 0.19;

export function resolveWeatherToHomeBridgeHeight(
  windowHeight: number,
): number {
  if (!Number.isFinite(windowHeight) || windowHeight <= 0) {
    return MIN_WEATHER_TO_HOME_BRIDGE_HEIGHT;
  }

  return Math.round(
    Math.min(
      MAX_WEATHER_TO_HOME_BRIDGE_HEIGHT,
      Math.max(
        MIN_WEATHER_TO_HOME_BRIDGE_HEIGHT,
        windowHeight * WEATHER_TO_HOME_BRIDGE_VIEWPORT_RATIO,
      ),
    ),
  );
}
