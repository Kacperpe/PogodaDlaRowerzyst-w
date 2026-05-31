import { NextRequest, NextResponse } from "next/server";
import type { RouteSegment } from "@/types/route-segment";
import type { WeatherAlert } from "@/types/weather-alert";
import type { ForecastPoint } from "@/types/forecast-point";

type OpenMeteoResponse = {
  hourly: {
    time: string[];
    precipitation: number[];
    weather_code: number[];
  };
};

function sampleSegments(segments: RouteSegment[], intervalKm = 5): RouteSegment[] {
  if (segments.length === 0) return [];
  const sampled: RouteSegment[] = [segments[0]];
  let accumulated = 0;
  for (let i = 1; i < segments.length; i++) {
    accumulated += segments[i].distanceKm;
    if (accumulated >= intervalKm) {
      sampled.push(segments[i]);
      accumulated = 0;
    }
  }
  const last = segments[segments.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled;
}

async function fetchWeather(
  lat: number,
  lon: number,
  arrivalTime: Date,
): Promise<{ precipitation: number; weatherCode: number }> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat.toFixed(4));
  url.searchParams.set("longitude", lon.toFixed(4));
  url.searchParams.set("hourly", "precipitation,weather_code");
  url.searchParams.set("forecast_days", "16");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("models", "best_match");

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) return { precipitation: 0, weatherCode: 0 };

  const data = (await res.json()) as OpenMeteoResponse;

  const targetHour = new Date(arrivalTime);
  targetHour.setMinutes(0, 0, 0);
  const targetIso = targetHour.toISOString().slice(0, 16);

  const index = data.hourly.time.findIndex((t) => t === targetIso);
  if (index === -1) return { precipitation: 0, weatherCode: 0 };

  return {
    precipitation: data.hourly.precipitation[index] ?? 0,
    weatherCode: data.hourly.weather_code[index] ?? 0,
  };
}

function getSeverity(
  precipitation: number,
  weatherCode: number,
): WeatherAlert["severity"] | null {
  const isRainCode =
    (weatherCode >= 51 && weatherCode <= 67) ||
    (weatherCode >= 80 && weatherCode <= 82) ||
    weatherCode >= 95;

  if (precipitation > 5 || (isRainCode && weatherCode >= 65)) return "high";
  if (precipitation > 2 || (isRainCode && weatherCode >= 55)) return "medium";
  if (precipitation > 0.5 || isRainCode) return "low";
  return null;
}

function getAlertLabel(weatherCode: number, severity: WeatherAlert["severity"]): string {
  if (weatherCode >= 95) return "Burza na trasie";
  if (weatherCode >= 71 && weatherCode <= 77) return "Opady śniegu";
  if (severity === "high") return "Silne opady deszczu";
  if (severity === "medium") return "Umiarkowane opady deszczu";
  return "Słabe opady deszczu";
}

function getCondition(weatherCode: number, precipitation: number): string {
  if (weatherCode >= 95) return "Burza";
  if (weatherCode >= 85) return "Przelotny śnieg";
  if (weatherCode >= 80) return "Przelotny deszcz";
  if (weatherCode >= 71) return "Opady śniegu";
  if (weatherCode >= 61) return "Deszcz";
  if (weatherCode >= 51) return "Mżawka";
  if (weatherCode >= 45) return "Mgła";
  if (weatherCode >= 1) return "Zachmurzenie";
  if (precipitation > 0) return "Lekkie opady";
  return "Czysto";
}

function formatArrivalTime(start: Date, etaMinutes: number): string {
  const arrival = new Date(start.getTime() + etaMinutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(arrival.getHours())}:${pad(arrival.getMinutes())}`;
}

function calcDistanceKmFromStart(segments: RouteSegment[], targetSeg: RouteSegment): number {
  let dist = 0;
  for (const seg of segments) {
    if (seg.id === targetSeg.id) break;
    dist += seg.distanceKm;
  }
  return Math.round(dist * 10) / 10;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    segments: RouteSegment[];
    startTime: string;
  };

  const { segments, startTime } = body;
  if (!segments?.length) return NextResponse.json({ alerts: [], forecast: [] });

  const start = new Date(startTime);
  const sampled = sampleSegments(segments, 5);

  const results = await Promise.all(
    sampled.map(async (seg, i) => {
      const lat = (seg.from[1] + seg.to[1]) / 2;
      const lon = (seg.from[0] + seg.to[0]) / 2;
      const arrivalTime = new Date(start.getTime() + seg.etaMinutesFromStart * 60_000);

      const { precipitation, weatherCode } = await fetchWeather(lat, lon, arrivalTime);
      const severity = getSeverity(precipitation, weatherCode);
      const condition = getCondition(weatherCode, precipitation);
      const distanceKmFromStart = calcDistanceKmFromStart(segments, seg);

      const forecastPoint: ForecastPoint = {
        segmentId: seg.id,
        lat,
        lon,
        distanceKmFromStart,
        etaMinutesFromStart: seg.etaMinutesFromStart,
        arrivalTime: formatArrivalTime(start, seg.etaMinutesFromStart),
        precipitationMm: precipitation,
        weatherCode,
        condition,
      };

      const alert: WeatherAlert | null = severity
        ? {
            id: `AL-${String(i + 1).padStart(3, "0")}`,
            segmentId: seg.id,
            lat,
            lon,
            etaMinutesFromStart: seg.etaMinutesFromStart,
            precipitationMm: precipitation,
            severity,
            label: getAlertLabel(weatherCode, severity),
          }
        : null;

      return { forecastPoint, alert };
    }),
  );

  const alerts = results.map((r) => r.alert).filter((a): a is WeatherAlert => a !== null);
  const forecast = results.map((r) => r.forecastPoint);

  return NextResponse.json({ alerts, forecast, updatedAt: new Date().toISOString() });
}
