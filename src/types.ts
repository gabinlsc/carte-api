export interface Weather {
  temperature: number;
  humidity: number;
  windSpeed: number;
  description: string;
  sunshine: 'ensoleillé' | 'nuageux';
}
export interface Measurement {
  id: number;
  name: string;
  sensorId: number;
  category: 'sensor' | 'station' | 'landmark';
  latitude: number;
  longitude: number;
  weather: Weather | null;
  createdAt: string;
}
export interface MeasurementInput {
  name: string;
  sensorId: number;
  category: Measurement['category'];
  latitude: number;
  longitude: number;
}
export interface ListQuery {
  page: number;
  limit: number;
  search?: string | undefined;
  category?: Measurement['category'] | undefined;
  bbox?: [number, number, number, number] | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
  radiusKm?: number | undefined;
}
export interface ZoneInput {
  name: string;
  geometry: { type: 'Polygon'; coordinates: number[][][] };
}
export interface Zone extends ZoneInput {
  id: number;
  createdAt: string;
}
export interface Page<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}
