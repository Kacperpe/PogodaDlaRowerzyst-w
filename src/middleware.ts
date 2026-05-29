import { type NextRequest, NextResponse } from "next/server";

// Per-IP sliding window rate limit — in-process, resets on cold start.
// Good enough for a hobby/startup app. For distributed limiting use Upstash Redis.
const ipMap = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 60;       // max requests per window per IP
const WINDOW_MS = 60_000; // 1 minute window
const MAP_MAX = 5000;   // cap map size to prevent memory growth

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Evict a random old entry when map is full
  if (ipMap.size >= MAP_MAX) {
    ipMap.delete(ipMap.keys().next().value!);
  }

  const record = ipMap.get(ip);
  if (!record || now > record.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (record.count >= LIMIT) return false;
  record.count++;
  return true;
}

export function middleware(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = (forwarded ? forwarded.split(",")[0] : "unknown").trim();

  if (!checkRateLimit(ip)) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
