import { NextRequest, NextResponse } from "next/server";

type HourlyWeather = {
  time: string[];
  temperature_2m?: number[];
  precipitation_probability?: number[];
  precipitation?: number[];
  rain?: number[];
  wind_speed_10m?: number[];
  weather_code?: number[];
};

function toDateOnly(iso: string) {
  return iso.slice(0, 10);
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));
  const timeIso = request.nextUrl.searchParams.get("time");

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !timeIso) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid lat/lon/time query params." },
      { status: 400 },
    );
  }

  const target = new Date(timeIso);
  if (Number.isNaN(target.getTime())) {
    return NextResponse.json(
      { ok: false, error: "Invalid time format. Expected ISO datetime." },
      { status: 400 },
    );
  }

  const startDate = toDateOnly(
    new Date(target.getTime() - 6 * 60 * 60 * 1000).toISOString(),
  );
  const endDate = toDateOnly(
    new Date(target.getTime() + 6 * 60 * 60 * 1000).toISOString(),
  );

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&hourly=temperature_2m,precipitation_probability,precipitation,rain,wind_speed_10m,weather_code" +
    `&start_date=${startDate}&end_date=${endDate}&timezone=auto`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: `Provider error ${response.status}` },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as {
      hourly?: HourlyWeather;
      timezone?: string;
      timezone_abbreviation?: string;
      utc_offset_seconds?: number;
    };
    const hourly = payload.hourly;
    if (!hourly?.time?.length) {
      return NextResponse.json(
        { ok: false, error: "Hourly weather data unavailable." },
        { status: 502 },
      );
    }

    const targetMs = target.getTime();
    let bestIndex = 0;
    let bestDiff = Number.POSITIVE_INFINITY;
    for (let i = 0; i < hourly.time.length; i += 1) {
      const diff = Math.abs(new Date(hourly.time[i]).getTime() - targetMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = i;
      }
    }

    return NextResponse.json({
      ok: true,
      timezone: payload.timezone ?? null,
      timezoneAbbr: payload.timezone_abbreviation ?? null,
      utcOffsetSeconds: payload.utc_offset_seconds ?? null,
      sample: {
        at: hourly.time[bestIndex],
        temperatureC: hourly.temperature_2m?.[bestIndex] ?? null,
        precipitationProbability: hourly.precipitation_probability?.[bestIndex] ?? null,
        precipitationMm: hourly.precipitation?.[bestIndex] ?? null,
        rainMm: hourly.rain?.[bestIndex] ?? null,
        windKmh: hourly.wind_speed_10m?.[bestIndex] ?? null,
        weatherCode: hourly.weather_code?.[bestIndex] ?? null,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Cannot reach weather provider." },
      { status: 502 },
    );
  }
}
