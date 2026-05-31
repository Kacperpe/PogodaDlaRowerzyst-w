import type { WeatherPointForecast } from "@/types/weather-point-forecast";

function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}@mapapogody`;
}

function buildEvent({
  dtstart,
  dtend,
  summary,
  description,
  alarmMinutes,
  notifyEmail,
}: {
  dtstart: Date;
  dtend: Date;
  summary: string;
  description: string;
  alarmMinutes?: number;
  notifyEmail?: string;
}): string {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid()}`,
    `DTSTART:${icsDate(dtstart)}`,
    `DTEND:${icsDate(dtend)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
  ];
  if (alarmMinutes !== undefined) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `TRIGGER:-PT${alarmMinutes}M`,
      `DESCRIPTION:${esc(summary)}`,
      "END:VALARM",
    );
    if (notifyEmail) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:EMAIL",
        `TRIGGER:-PT${alarmMinutes}M`,
        `SUMMARY:${esc(summary)}`,
        `DESCRIPTION:${esc(description)}`,
        `ATTENDEE:mailto:${notifyEmail}`,
        "END:VALARM",
      );
    }
  }
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

type AlertKind = "rain" | "wind" | "snow";

type Alert = WeatherPointForecast & { kind: AlertKind };

function detectAlerts(rows: WeatherPointForecast[]): Alert[] {
  const alerts: Alert[] = [];
  for (const row of rows) {
    const rain = (row.precipitationProbability ?? 0) >= 40 || (row.rainMm ?? 0) > 0 || (row.precipitationMm ?? 0) > 0;
    const wind = (row.windKmh ?? 0) > 50;
    if (rain) alerts.push({ ...row, kind: "rain" });
    if (wind && !rain) alerts.push({ ...row, kind: "wind" });
  }
  return alerts;
}

function alertEmoji(kind: AlertKind): string {
  if (kind === "rain") return "🌧";
  if (kind === "wind") return "💨";
  return "❄️";
}

function alertLabel(kind: AlertKind): string {
  if (kind === "rain") return "Deszcz";
  if (kind === "wind") return "Silny wiatr";
  return "Snieg";
}

export function generateRouteIcs(
  forecastRows: WeatherPointForecast[],
  routeStartAt: string,
  notifyEmail?: string,
): string {
  const routeStart = new Date(routeStartAt);
  const lastRow = forecastRows[forecastRows.length - 1];
  const routeEnd = lastRow
    ? new Date(routeStart.getTime() + lastRow.etaMinutes * 60_000)
    : new Date(routeStart.getTime() + 60 * 60_000);

  const alerts = detectAlerts(forecastRows);

  let summaryDesc: string;
  if (alerts.length === 0) {
    summaryDesc = "Brak alertow pogodowych — dobra pogoda na trasie!";
  } else {
    summaryDesc = `Alerty pogodowe na trasie (${alerts.length}):\n`;
    for (const a of alerts) {
      const emoji = alertEmoji(a.kind);
      const label = alertLabel(a.kind);
      const details =
        a.kind === "wind"
          ? `${a.windKmh ?? 0} km/h`
          : `${a.rainMm ?? a.precipitationMm ?? 0}mm (${a.precipitationProbability ?? 0}%)`;
      summaryDesc += `${emoji} ${a.plannedAtRouteTz} — ${label}: ${details}\n`;
    }
  }

  const events: string[] = [];

  // Route summary — reminder 60 min before start so you know before leaving
  events.push(buildEvent({
    dtstart: routeStart,
    dtend: routeEnd,
    summary: "Trasa rowerowa — prognoza pogody",
    description: summaryDesc,
    alarmMinutes: 60,
    notifyEmail,
  }));

  // Individual alert events with 30-min reminders
  for (const alert of alerts) {
    const alertTime = new Date(routeStart.getTime() + alert.etaMinutes * 60_000);
    const alertEnd = new Date(alertTime.getTime() + 15 * 60_000);
    const emoji = alertEmoji(alert.kind);
    const label = alertLabel(alert.kind);

    const detail =
      alert.kind === "wind"
        ? `Predkosc wiatru: ${alert.windKmh ?? 0} km/h`
        : `Deszcz: ${alert.rainMm ?? alert.precipitationMm ?? 0}mm\nSzansa opadu: ${alert.precipitationProbability ?? 0}%\nWiatr: ${alert.windKmh ?? "-"} km/h`;

    events.push(buildEvent({
      dtstart: alertTime,
      dtend: alertEnd,
      summary: `${emoji} ${label} na trasie — ${alert.plannedAtRouteTz}`,
      description: detail,
      alarmMinutes: 30,
      notifyEmail,
    }));
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MapaPogodyRowerzysty//PL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}
