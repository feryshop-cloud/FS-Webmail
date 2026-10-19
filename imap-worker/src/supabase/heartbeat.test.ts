import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { startHeartbeat } from "./heartbeat";
import { supabase } from "./client";
import { logger } from "../utils/logger";

const { updateEqMock } = vi.hoisted(() => ({
  updateEqMock: vi.fn(),
}));

vi.mock("./client", () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({ eq: updateEqMock })),
    })),
  },
}));

vi.mock("../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("startHeartbeat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateEqMock.mockReturnValue({ error: null });
    delete process.env.HEARTBEAT_INTERVAL_MS;
    delete process.env.WORKER_NAME;
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates heartbeat on first run and schedules interval", async () => {
    await startHeartbeat();
    expect(supabase.from).toHaveBeenCalledWith("worker_heartbeat");
    expect(logger.info).toHaveBeenCalledWith("Heartbeat scheduler started", {
      intervalMs: 120000,
      workerName: "imap-worker-main",
    });
  });

  it("uses WORKER_NAME and HEARTBEAT_INTERVAL_MS env", async () => {
    process.env.WORKER_NAME = "worker-a";
    process.env.HEARTBEAT_INTERVAL_MS = "5000";
    await startHeartbeat();
    expect(logger.info).toHaveBeenCalledWith("Heartbeat scheduler started", {
      intervalMs: 5000,
      workerName: "worker-a",
    });
  });

  it("logs permanent failure after max retries but does not throw", async () => {
    updateEqMock.mockReturnValue({ error: new Error("timeout") });
    const p = startHeartbeat();
    // 9 retries: 1+2+4+...+256 detik = 511s — majukan fake timer agar selesai
    await vi.advanceTimersByTimeAsync(700000);
    await p;
    expect(logger.error).toHaveBeenCalledWith(
      "Heartbeat failed permanently after max retries",
      expect.objectContaining({
        workerName: "imap-worker-main",
        maxAttempts: 10,
      }),
    );
    expect(logger.info).toHaveBeenCalledWith("Heartbeat scheduler started", expect.anything());
  });

  it("retries with backoff then succeeds", async () => {
    let calls = 0;
    updateEqMock.mockImplementation(() => {
      calls++;
      return calls >= 3 ? { error: null } : { error: new Error("flaky") };
    });
    const p = startHeartbeat();
    await vi.advanceTimersByTimeAsync(10000);
    await p;
    expect(logger.error).toHaveBeenCalledWith(
      "Heartbeat failed, retrying with backoff",
      expect.objectContaining({ attempt: 1, retryDelayMs: 1000 }),
    );
    expect(logger.info).toHaveBeenCalledWith("Heartbeat updated successfully", expect.anything());
  });
});
