export type ForecastPoint = {
  segmentId: string;
  lat: number;
  lon: number;
  distanceKmFromStart: number;
  etaMinutesFromStart: number;
  arrivalTime: string;
  precipitationMm: number;
  weatherCode: number;
  condition: string;
};
