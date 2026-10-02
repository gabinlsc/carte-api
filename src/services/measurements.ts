import type { MeasurementRepository } from '../repositories/measurements.js';
import type { WeatherProvider } from './weather.js';
import type {
  ListQuery,
  Measurement,
  MeasurementInput,
  Page,
  ZoneInput,
} from '../types.js';
import { TtlCache } from './cache.js';
import { AppError } from '../errors.js';
export class MeasurementService {
  private readonly cache: TtlCache<Page<Measurement>>;
  constructor(
    private readonly repo: MeasurementRepository,
    private readonly weather: WeatherProvider,
    ttlMs: number,
  ) {
    this.cache = new TtlCache(ttlMs);
  }
  list(query: ListQuery): Page<Measurement> {
    const key = JSON.stringify(query);
    const cached = this.cache.get(key);
    if (cached) return cached;
    const result = this.repo.list(query);
    this.cache.set(key, result);
    return result;
  }
  find(id: number): Measurement {
    const result = this.repo.find(id);
    if (!result) throw new AppError(404, 'NOT_FOUND', 'Mesure introuvable');
    return result;
  }
  async create(input: MeasurementInput): Promise<Measurement> {
    const weather = await this.weather.get(input.latitude, input.longitude);
    const result = this.repo.create(input, weather);
    this.cache.clear();
    return result;
  }
  listZones(page: number, limit: number) {
    return this.repo.listZones(page, limit);
  }
  createZone(input: ZoneInput) {
    return this.repo.createZone(input);
  }
}
