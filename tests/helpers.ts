import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/repositories/database.js';
import type { WeatherProvider } from '../src/services/weather.js';
export const key = 'test-key-with-at-least-32-characters';
export const point = {
  name: 'Salle Lorient',
  sensorId: 1,
  latitude: 47.75,
  longitude: -3.36,
  category: 'sensor' as const,
};
export function fixture(weather: WeatherProvider = { get: async () => null }) {
  const db = openDatabase(':memory:');
  return createApp(loadConfig({ NODE_ENV: 'test', API_KEY: key }), {
    db,
    weather,
  });
}
