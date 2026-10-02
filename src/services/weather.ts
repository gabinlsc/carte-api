import { z } from 'zod';
import { TtlCache } from './cache.js';
import { AppError } from '../errors.js';
import type { Weather } from '../types.js';
const responseSchema = z.object({
  main: z.object({
    temp: z.number().min(-150).max(100),
    humidity: z.number().min(0).max(100),
  }),
  wind: z.object({ speed: z.number().nonnegative().max(500) }),
  weather: z.array(z.object({ description: z.string().max(200) })).min(1),
  clouds: z.object({ all: z.number().min(0).max(100) }).optional(),
});
export interface WeatherProvider {
  get(latitude: number, longitude: number): Promise<Weather | null>;
}
export class OpenWeatherProvider implements WeatherProvider {
  private readonly cache = new TtlCache<Weather>(5 * 60 * 1000);
  private readonly pending = new Map<string, Promise<Weather>>();
  constructor(
    private readonly key: string,
    private readonly timeoutMs: number,
    private readonly fetcher: typeof fetch = fetch,
  ) {}
  async get(latitude: number, longitude: number): Promise<Weather | null> {
    if (!this.key) return null;
    const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const inflight = this.pending.get(key);
    if (inflight) return inflight;
    if (this.pending.size >= 32)
      throw new AppError(503, 'WEATHER_BUSY', 'Service météo occupé');
    const task = this.request(latitude, longitude);
    this.pending.set(key, task);
    try {
      const weather = await task;
      this.cache.set(key, weather);
      return weather;
    } finally {
      this.pending.delete(key);
    }
  }
  private async request(latitude: number, longitude: number): Promise<Weather> {
    const url = new URL('https://api.openweathermap.org/data/2.5/weather');
    url.search = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      units: 'metric',
      lang: 'fr',
      appid: this.key,
    }).toString();
    try {
      const response = await this.fetcher(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        redirect: 'error',
      });
      if (
        !response.ok ||
        Number(response.headers.get('content-length') ?? 0) > 32768
      )
        throw new Error('Invalid provider response');
      if (!response.body) throw new Error('Missing body');
      const reader = response.body.getReader();
      let size = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        size += result.value.byteLength;
        if (size > 32768) {
          await reader.cancel();
          throw new Error('Provider response too large');
        }
        chunks.push(result.value);
      }
      const data = responseSchema.parse(
        JSON.parse(Buffer.concat(chunks).toString('utf8')),
      );
      return {
        temperature: data.main.temp,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        description: data.weather[0]!.description,
        sunshine: (data.clouds?.all ?? 100) < 50 ? 'ensoleillé' : 'nuageux',
      };
    } catch {
      throw new AppError(
        503,
        'WEATHER_UNAVAILABLE',
        'Le fournisseur météo est indisponible',
      );
    }
  }
}
