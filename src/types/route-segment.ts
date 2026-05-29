export type RouteSegment = {
  id: string;
  from: [number, number];
  to: [number, number];
  distanceKm: number;
  etaMinutesFromStart: number;
};
