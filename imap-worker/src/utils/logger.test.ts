import { describe, expect, it, beforeEach, vi } from "vitest";
import { pinoLogger, logger } from "./logger";

vi.mock("pino", () => {
  const pinoMock = vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }));
  (pinoMock as any).stdTimeFunctions = { epochTime: () => '"time":0,' };
  return { default: pinoMock };
});

const pino = pinoLogger as unknown as {
  debug: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

describe("imap-worker logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debug calls pino debug with message", () => {
    logger.debug("msg");
    expect(pino.debug).toHaveBeenCalledWith("msg");
  });

  it("debug passes meta payload", () => {
    logger.debug("msg", { a: 1 });
    expect(pino.debug).toHaveBeenCalledWith({ a: 1 }, "msg");
  });

  it("info calls pino info", () => {
    logger.info("msg");
    expect(pino.info).toHaveBeenCalledWith("msg");
  });

  it("warn calls pino warn", () => {
    logger.warn("msg");
    expect(pino.warn).toHaveBeenCalledWith("msg");
  });

  it("error calls pino error with message", () => {
    logger.error("msg");
    expect(pino.error).toHaveBeenCalledWith("msg");
  });

  it("error renames meta.error to err", () => {
    const err = new Error("boom");
    logger.error("msg", { error: err });
    expect(pino.error).toHaveBeenCalledWith({ err }, "msg");
  });

  it("error passes through existing err key", () => {
    const err = new Error("boom");
    logger.error("msg", { err });
    expect(pino.error).toHaveBeenCalledWith({ err }, "msg");
  });

  it("serializeError returns sanitized error", () => {
    const out = logger.serializeError(new Error("x")) as Record<string, unknown>;
    expect(out.type).toBe("Error");
    expect(out.message).toBe("x");
  });

  it("serializeError passes through non-error value", () => {
    expect(logger.serializeError("plain")).toBe("plain");
  });
});
