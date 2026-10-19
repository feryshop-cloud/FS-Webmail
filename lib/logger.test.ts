import { describe, expect, it, beforeEach, vi } from "vitest";
import { logger, pinoLogger } from "./logger";
import { getRequestId } from "./logging/request-context";

vi.mock("./logging/request-context");
vi.mock("pino", () => {
  const pinoMock = vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }));
  return {
    default: Object.assign(pinoMock, {
      stdTimeFunctions: { epochTime: () => '"time":0,' },
    }),
  };
});

const pino = pinoLogger as unknown as {
  debug: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

describe("logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequestId).mockReturnValue(undefined);
  });

  describe("logger.debug", () => {
    it("calls pino debug with message only when no meta", () => {
      logger.debug("test message");
      expect(pino.debug).toHaveBeenCalledWith("test message");
    });

    it("passes meta payload when provided", () => {
      logger.debug("test message", { key: "value" });
      expect(pino.debug).toHaveBeenCalledWith({ key: "value" }, "test message");
    });

    it("includes requestId from request context", () => {
      vi.mocked(getRequestId).mockReturnValue("req-123");
      logger.debug("test message", { key: "value" });
      expect(pino.debug).toHaveBeenCalledWith(
        { key: "value", requestId: "req-123" },
        "test message",
      );
    });
  });

  describe("logger.info / logger.warn", () => {
    it("info calls pino info with message", () => {
      logger.info("test message");
      expect(pino.info).toHaveBeenCalledWith("test message");
    });

    it("warn calls pino warn with message", () => {
      logger.warn("test message");
      expect(pino.warn).toHaveBeenCalledWith("test message");
    });
  });

  describe("logger.error", () => {
    it("calls pino error with message only", () => {
      logger.error("test message");
      expect(pino.error).toHaveBeenCalledWith("test message");
    });

    it("renames meta.error to err for pino serializer", () => {
      const err = new Error("failed");
      logger.error("test message", { error: err });
      expect(pino.error).toHaveBeenCalledWith({ err }, "test message");
    });

    it("passes through existing err key without rename", () => {
      const err = new Error("failed");
      logger.error("test message", { err });
      expect(pino.error).toHaveBeenCalledWith({ err }, "test message");
    });

    it("does not attach requestId when absent", () => {
      logger.error("test message", { err: new Error("x") });
      expect(pino.error).toHaveBeenCalledWith({ err: expect.any(Error) }, "test message");
    });
  });
});
