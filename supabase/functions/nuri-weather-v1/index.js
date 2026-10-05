/* global Deno */
import { createWeatherHandler } from '../_shared/weather-api-runtime.js';
Deno.serve(createWeatherHandler());
