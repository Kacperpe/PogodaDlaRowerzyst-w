import type { WeatherAlert } from "@/types/weather-alert";

export const mockAlerts: WeatherAlert[] = [
  {
    id: "AL-001",
    segmentId: "S-024",
    lat: 52.2,
    lon: 21.05,
    etaMinutesFromStart: 72,
    precipitationMm: 6.2,
    severity: "high",
    label: "Silne opady deszczu",
  },
  {
    id: "AL-002",
    segmentId: "S-056",
    lat: 52.25,
    lon: 21.1,
    etaMinutesFromStart: 168,
    precipitationMm: 2.4,
    severity: "medium",
    label: "Umiarkowane opady deszczu",
  },
];
