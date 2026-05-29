export type WeatherPointForecast = {
  segmentId: string;
  etaMinutes: number;
  lat: number;
  lon: number;
  plannedAtRouteTz: string;
  sampledAtRouteTz: string;
  timezone: string;
  temperatureC: number | null;
  precipitationProbability: number | null;
  precipitationMm: number | null;
  rainMm: number | null;
  windKmh: number | null;
};
