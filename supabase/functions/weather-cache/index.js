/* global Deno */
// Legacy payload remains available for installed clients/rollback, with the same cost defense.
import { createWeatherHandler } from '../_shared/weather-api-runtime.js';
Deno.serve(createWeatherHandler({ legacy: true }));
