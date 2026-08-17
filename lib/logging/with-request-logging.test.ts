import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock external deps before importing the module under test
vi.mock("@/lib/logger", () => ({
  pinoLogger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/logging/request-context", () => ({
  runWithRequestId: vi.fn((_id: string, fn: () => unknown) => fn()),
}));

import { genReqId, withRequestLogging } from "./with-request-logging";
import { pinoLogger } from "@/lib/logger";
import { runWithRequestId } from "@/lib/logging/request-context";

describe("genReqId", () => {
  it("reuses x-request-id header when present", () => {
    const req = new Request("http://localhost/api/test", {
      headers: { "x-request-id": "existing-id-123" },
    });
    expect(genReqId(req)).toBe("existing-id-123");
  });

  it("generates req-<uuid> when x-request-id is absent", () => {
    const req = new Request("http://localhost/api/test");
    const id = genReqId(req);
    expect(id).toMatch(/^req-[0-9a-f-]{36}$/);
  });

  it("generates unique ids for different requests without header", () => {
    const req1 = new Request("http://localhost/a");
    const req2 = new Request("http://localhost/b");
    expect(genReqId(req1)).not.toBe(genReqId(req2));
  });
});

describe("withRequestLogging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("echoes x-request-id from the incoming request onto the response", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const wrapped = withRequestLogging(handler);

    const req = new Request("http://localhost/api/test", {
      headers: { "x-request-id": "corr-456" },
    });
    const res = await wrapped(req, {});

    expect(res.headers.get("x-request-id")).toBe("corr-456");
  });

  it("sets a generated x-request-id on the response when header is absent", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const wrapped = withRequestLogging(handler);

    const req = new Request("http://localhost/api/test");
    const res = await wrapped(req, {});

    const id = res.headers.get("x-request-id");
    expect(id).toMatch(/^req-[0-9a-f-]{36}$/);
  });

  it("calls runWithRequestId to bind the request context", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const wrapped = withRequestLogging(handler);

    const req = new Request("http://localhost/api/test", {
      headers: { "x-request-id": "ctx-789" },
    });
    await wrapped(req, {});

    expect(runWithRequestId).toHaveBeenCalledWith("ctx-789", expect.any(Function));
  });

  it("invokes the inner handler and returns its response", async () => {
    const body = JSON.stringify({ data: "value" });
    const handler = vi.fn().mockResolvedValue(new Response(body, { status: 200 }));
    const wrapped = withRequestLogging(handler);

    const req = new Request("http://localhost/api/data");
    const res = await wrapped(req, {});

    expect(handler).toHaveBeenCalledWith(req, {});
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(body);
  });

  it("logs errors and rethrows when the handler throws", async () => {
    const thrown = new Error("handler exploded");
    const handler = vi.fn().mockRejectedValue(thrown);
    const wrapped = withRequestLogging(handler);

    const req = new Request("http://localhost/api/fail", { method: "POST" });

    await expect(wrapped(req, {})).rejects.toThrow("handler exploded");

    expect(pinoLogger.error).toHaveBeenCalledTimes(1);
    const [meta, message] = vi.mocked(pinoLogger.error).mock.calls[0];
    expect(message).toBe("request error");
    expect((meta as Record<string, unknown>).err).toBe(thrown);
    expect((meta as Record<string, unknown>).context).toContain("POST");
  });

  it("includes method and url in error log context", async () => {
    const thrown = new Error("fail");
    const handler = vi.fn().mockRejectedValue(thrown);
    const wrapped = withRequestLogging(handler);

    const req = new Request("http://localhost/api/items", { method: "DELETE" });

    await expect(wrapped(req, {})).rejects.toThrow("fail");

    const [meta] = vi.mocked(pinoLogger.error).mock.calls[0];
    const context = (meta as Record<string, unknown>).context as string;
    expect(context).toBe("Route: DELETE http://localhost/api/items");
  });

  it("passes request metadata including headers to error log", async () => {
    const thrown = new Error("fail");
    const handler = vi.fn().mockRejectedValue(thrown);
    const wrapped = withRequestLogging(handler);

    const req = new Request("http://localhost/api/x", {
      method: "GET",
      headers: { "content-type": "application/json" },
    });

    await expect(wrapped(req, {})).rejects.toThrow("fail");

    const [meta] = vi.mocked(pinoLogger.error).mock.calls[0];
    const reqMeta = (meta as Record<string, unknown>).req as Record<string, unknown>;
    expect(reqMeta.method).toBe("GET");
    expect(reqMeta.url).toBe("http://localhost/api/x");
    expect(reqMeta.headers).toHaveProperty("content-type", "application/json");
  });
});
