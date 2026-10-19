import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { logger } from "./utils/logger";

vi.mock("dotenv", () => ({ config: vi.fn() }));
vi.mock("./imap/connection", () => ({ connectIMAP: vi.fn(async () => {}) }));
vi.mock("./supabase/heartbeat", () => ({ startHeartbeat: vi.fn(async () => {}) }));
vi.mock("./utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import memicu main() auto-run (connectIMAP & startHeartbeat sudah di-mock)
import "./index";

const log = logger as unknown as {
  info: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};
const fakeExit = vi.fn((code?: number | string | null) => {
  throw new Error(`exit(${code})`);
});

beforeEach(() => {
  vi.spyOn(process, "exit").mockImplementation(fakeExit as any);
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe("index", () => {
  it("main() starts heartbeat then IMAP connection on load", () => {
    expect(log.info).toHaveBeenCalledWith("imap-worker starting", expect.anything());
  });

  it("SIGINT exits 0 gracefully", () => {
    expect(() => process.emit("SIGINT")).toThrow("exit(0)");
    expect(log.info).toHaveBeenCalledWith("Received SIGINT, shutting down gracefully");
  });

  it("SIGTERM exits 0 gracefully", () => {
    expect(() => process.emit("SIGTERM")).toThrow("exit(0)");
    expect(log.info).toHaveBeenCalledWith("Received SIGTERM, shutting down gracefully");
  });

  it("uncaughtException logs and exits 1", () => {
    const err = new Error("boom");
    expect(() => process.emit("uncaughtException", err)).toThrow("exit(1)");
    expect(log.error).toHaveBeenCalledWith("Uncaught exception", { err });
  });

  it("unhandledRejection wraps primitives into Error", () => {
    expect(() => process.emit("unhandledRejection", "raw string", Promise.resolve())).toThrow(
      "exit(1)",
    );
    expect(log.error).toHaveBeenCalledWith(
      "Unhandled rejection",
      expect.objectContaining({ err: expect.any(Error) }),
    );
  });

  it("unhandledRejection passes Error instance through", () => {
    const cause = new Error("cause");
    vi.mocked(fakeExit as any).mockImplementation(() => {
      throw new Error("exit(1)");
    });
    expect(() => process.emit("unhandledRejection", cause, Promise.resolve())).toThrow("exit(1)");
    expect(log.error).toHaveBeenCalledWith("Unhandled rejection", { err: cause });
  });
});
