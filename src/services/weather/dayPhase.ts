export const WEATHER_DAY_START_HOUR = 6;
export const WEATHER_NIGHT_START_HOUR = 18;

export function isWeatherDaytimeAt(date: Date) {
  const hour = date.getHours();
  return hour >= WEATHER_DAY_START_HOUR && hour < WEATHER_NIGHT_START_HOUR;
}

export function getCurrentWeatherIsDaytime(now = new Date()) {
  return isWeatherDaytimeAt(now);
}
