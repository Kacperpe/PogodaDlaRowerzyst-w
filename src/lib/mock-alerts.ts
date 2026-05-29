import type { WeatherAlert } from "@/types/weather-alert";

export const mockAlerts: WeatherAlert[] = [
  {
    id: "AL-01",
    segment: "Km 12-16",
    eta: "14:20",
    severity: "Wysokie ryzyko opadów",
    recommendation: "Objazd przez ul. Leśną (+2.4 km)",
  },
  {
    id: "AL-02",
    segment: "Km 28-31",
    eta: "15:05",
    severity: "Umiarkowane ryzyko opadów",
    recommendation: "Przesuń start o 30 min",
  },
];
