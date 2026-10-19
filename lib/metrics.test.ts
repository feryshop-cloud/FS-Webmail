import { describe, expect, it } from "vitest";
import { registry, httpRequestsTotal, httpRequestDuration } from "./metrics";

describe("metrics", () => {
  it("exports registry singleton with metrics collection", () => {
    expect(registry).toBeDefined();
    expect(typeof registry.metrics).toBe("function");
  });

  it("registers http_requests_total counter", async () => {
    expect(httpRequestsTotal).toBeDefined();
    const metrics = await registry.getMetricsAsJSON();
    const names = metrics.map((m) => m.name);
    expect(names).toContain("http_requests_total");
  });

  it("registers http_request_duration_seconds histogram", async () => {
    expect(httpRequestDuration).toBeDefined();
    const metrics = await registry.getMetricsAsJSON();
    const names = metrics.map((m) => m.name);
    expect(names).toContain("http_request_duration_seconds");
  });
});
