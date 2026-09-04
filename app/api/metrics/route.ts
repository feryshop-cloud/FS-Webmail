import { NextResponse } from "next/server";
import { registry, httpRequestDuration, httpRequestsTotal } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = process.hrtime();
  const metrics = await registry.metrics();
  const diff = process.hrtime(start);
  const durationInSeconds = diff[0] + diff[1] / 1e9;

  httpRequestDuration.observe(
    { method: "GET", route: "/api/metrics", status: "200" },
    durationInSeconds,
  );
  httpRequestsTotal.inc({ method: "GET", route: "/api/metrics", status: "200" });

  return new NextResponse(metrics, {
    status: 200,
    headers: {
      "Content-Type": registry.contentType,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
