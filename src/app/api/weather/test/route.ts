import { NextResponse } from "next/server";

export async function GET() {
  const latitude = 52.2297;
  const longitude = 21.0122;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    "&current=temperature_2m,precipitation,rain,wind_speed_10m&hourly=precipitation_probability";

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json(
        { ok: false, status: response.status, error: "Weather provider request failed." },
        { status: 502 },
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    return NextResponse.json(
      {
        ok: true,
        provider: "open-meteo",
        location: { latitude, longitude },
        current: data.current ?? null,
        hourly: data.hourly ?? null,
        fetchedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Cannot reach weather provider." },
      { status: 502 },
    );
  }
}
