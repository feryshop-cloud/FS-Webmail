import client from "prom-client";

// Gunakan globalThis singleton pattern agar tidak re-register saat hot-reload di Next.js
const globalForMetrics = globalThis as unknown as {
  metricsRegistry?: client.Registry;
  httpRequestsTotal?: client.Counter<"method" | "route" | "status">;
  httpRequestDuration?: client.Histogram<"method" | "route" | "status">;
};

export const registry = globalForMetrics.metricsRegistry ?? new client.Registry();

if (!globalForMetrics.metricsRegistry) {
  // Kumpulkan metrik default runtime Node.js / Bun (CPU, Memory, Event Loop, GC)
  client.collectDefaultMetrics({
    register: registry,
  });

  globalForMetrics.metricsRegistry = registry;
}

export const httpRequestsTotal =
  globalForMetrics.httpRequestsTotal ??
  new client.Counter({
    name: "http_requests_total",
    help: "Total HTTP requests handled by WebMail & IMAP Worker",
    labelNames: ["method", "route", "status"] as const,
    registers: [registry],
  });

if (!globalForMetrics.httpRequestsTotal) {
  globalForMetrics.httpRequestsTotal = httpRequestsTotal;
}

export const httpRequestDuration =
  globalForMetrics.httpRequestDuration ??
  new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status"] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  });

if (!globalForMetrics.httpRequestDuration) {
  globalForMetrics.httpRequestDuration = httpRequestDuration;
  // Inisialisasi awal agar metric family http_request_duration_seconds_bucket langsung terdaftar di Prometheus
  httpRequestDuration.observe({ method: "GET", route: "/api/metrics", status: "200" }, 0.001);
  httpRequestsTotal.inc({ method: "GET", route: "/api/metrics", status: "200" }, 0);
}
