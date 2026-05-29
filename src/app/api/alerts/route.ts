import { mockAlerts } from "@/lib/mock-alerts";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    alerts: mockAlerts,
    updatedAt: new Date().toISOString(),
  });
}
