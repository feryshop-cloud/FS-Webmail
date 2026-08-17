import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  serializeError,
  formatLog,
  resolveLogLevel,
  isLevelEnabled,
  LOG_LEVEL_NUM,
} from "./format";

describe("serializeError", () => {
  it("serializes a standard Error into { type, message, stack }", () => {
    const err = new Error("boom");
    const result = serializeError(err) as Record<string, unknown>;
    expect(result.type).toBe("Error");
    expect(result.message).toBe("boom");
    expect(result.stack).toBeDefined();
    expect(typeof result.stack).toBe("string");
  });

  it("uses error.name as type when set", () => {
    const err = new TypeError("bad type");
    const result = serializeError(err) as Record<string, unknown>;
    expect(result.type).toBe("TypeError");
    expect(result.message).toBe("bad type");
  });

  it("includes code property when present on Error", () => {
    const err = new Error("not found") as Error & { code: string };
    err.code = "ENOENT";
    const result = serializeError(err) as Record<string, unknown>;
    expect(result.code).toBe("ENOENT");
  });

  it("recursively serializes error.cause", () => {
    const cause = new Error("root cause");
    const err = new Error("wrapper", { cause });
    const result = serializeError(err) as Record<string, unknown>;
    const serializedCause = result.cause as Record<string, unknown>;
    expect(serializedCause.type).toBe("Error");
    expect(serializedCause.message).toBe("root cause");
  });

  it("omits cause when it is null or undefined", () => {
    const err = new Error("no cause");
    const result = serializeError(err) as Record<string, unknown>;
    expect(result).not.toHaveProperty("cause");
  });

  it("serializes plain objects with message/stack as error-like", () => {
    const obj = { name: "CustomError", message: "oops", stack: "at somewhere" };
    const result = serializeError(obj) as Record<string, unknown>;
    expect(result.type).toBe("CustomError");
    expect(result.message).toBe("oops");
    expect(result.stack).toBe("at somewhere");
  });

  it("defaults type to Error for plain objects without name", () => {
    const obj = { message: "something broke" };
    const result = serializeError(obj) as Record<string, unknown>;
    expect(result.type).toBe("Error");
    expect(result.message).toBe("something broke");
  });

  it("passes through plain objects without message or stack", () => {
    const obj = { foo: "bar", count: 42 };
    expect(serializeError(obj)).toEqual({ foo: "bar", count: 42 });
  });

  it("passes through string primitives", () => {
    expect(serializeError("just a string")).toBe("just a string");
  });

  it("passes through number primitives", () => {
    expect(serializeError(42)).toBe(42);
  });

  it("passes through null", () => {
    expect(serializeError(null)).toBe(null);
  });

  it("passes through undefined", () => {
    expect(serializeError(undefined)).toBe(undefined);
  });

  it("passes through boolean", () => {
    expect(serializeError(true)).toBe(true);
  });
});

describe("formatLog", () => {
  it("returns valid JSON with required fields", () => {
    const raw = formatLog("info", "hello world", undefined, { service: "test-svc" });
    const parsed = JSON.parse(raw);
    expect(parsed.level).toBe(LOG_LEVEL_NUM.info);
    expect(parsed.time).toBeTypeOf("number");
    expect(parsed.service).toBe("test-svc");
    expect(parsed.msg).toBe("hello world");
  });

  it("uses numeric level values matching LOG_LEVEL_NUM", () => {
    for (const level of ["debug", "info", "warn", "error"] as const) {
      const parsed = JSON.parse(formatLog(level, "msg", undefined, { service: "s" }));
      expect(parsed.level).toBe(LOG_LEVEL_NUM[level]);
    }
  });

  it("defaults service to app when not provided", () => {
    const parsed = JSON.parse(formatLog("info", "msg"));
    expect(parsed.service).toBe("app");
  });

  it("defaults environment to NODE_ENV or development", () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "test";
      const parsed = JSON.parse(formatLog("info", "msg", undefined, { service: "s" }));
      expect(parsed.environment).toBe("test");
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("uses environment from options over NODE_ENV", () => {
    const parsed = JSON.parse(
      formatLog("info", "msg", undefined, { service: "s", environment: "staging" }),
    );
    expect(parsed.environment).toBe("staging");
  });

  it("includes requestId when provided", () => {
    const parsed = JSON.parse(
      formatLog("info", "msg", undefined, { service: "s", requestId: "req-abc" }),
    );
    expect(parsed.requestId).toBe("req-abc");
  });

  it("omits requestId when not provided", () => {
    const parsed = JSON.parse(formatLog("info", "msg", undefined, { service: "s" }));
    expect(parsed).not.toHaveProperty("requestId");
  });

  it("flattens meta fields into the payload", () => {
    const parsed = JSON.parse(
      formatLog("info", "msg", { userId: 123, action: "login" }, { service: "s" }),
    );
    expect(parsed.userId).toBe(123);
    expect(parsed.action).toBe("login");
  });

  it("serializes Error in meta under err key when key is error", () => {
    const err = new Error("fail");
    const parsed = JSON.parse(
      formatLog("error", "oops", { error: err }, { service: "s" }),
    );
    expect(parsed.err).toBeDefined();
    expect(parsed.err.type).toBe("Error");
    expect(parsed.err.message).toBe("fail");
    expect(parsed).not.toHaveProperty("error");
  });

  it("serializes Error values in other meta keys", () => {
    const err = new TypeError("bad");
    const parsed = JSON.parse(
      formatLog("error", "oops", { cause: err }, { service: "s" }),
    );
    expect(parsed.cause.type).toBe("TypeError");
    expect(parsed.cause.message).toBe("bad");
  });

  it("ignores empty meta object", () => {
    const parsed = JSON.parse(formatLog("info", "msg", {}, { service: "s" }));
    expect(Object.keys(parsed)).toEqual(["level", "time", "service", "environment", "msg"]);
  });

  it("emits time as epoch milliseconds", () => {
    const before = Date.now();
    const parsed = JSON.parse(formatLog("info", "msg", undefined, { service: "s" }));
    const after = Date.now();
    expect(parsed.time).toBeGreaterThanOrEqual(before);
    expect(parsed.time).toBeLessThanOrEqual(after);
  });
});

describe("resolveLogLevel", () => {
  const originalEnv = { LOG_LEVEL: process.env.LOG_LEVEL, NODE_ENV: process.env.NODE_ENV };

  beforeEach(() => {
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    process.env.LOG_LEVEL = originalEnv.LOG_LEVEL;
    process.env.NODE_ENV = originalEnv.NODE_ENV;
  });

  it("returns LOG_LEVEL when set to a valid level", () => {
    process.env.LOG_LEVEL = "warn";
    expect(resolveLogLevel()).toBe("warn");
  });

  it("defaults to info in production", () => {
    process.env.NODE_ENV = "production";
    expect(resolveLogLevel()).toBe("info");
  });

  it("defaults to debug when not production", () => {
    process.env.NODE_ENV = "development";
    expect(resolveLogLevel()).toBe("debug");
  });

  it("ignores invalid LOG_LEVEL values", () => {
    process.env.LOG_LEVEL = "verbose";
    process.env.NODE_ENV = "development";
    expect(resolveLogLevel()).toBe("debug");
  });
});

describe("isLevelEnabled", () => {
  it("allows same level", () => {
    expect(isLevelEnabled("info", "info")).toBe(true);
  });

  it("allows higher severity", () => {
    expect(isLevelEnabled("debug", "error")).toBe(true);
  });

  it("blocks lower severity", () => {
    expect(isLevelEnabled("error", "debug")).toBe(false);
  });

  it("debug configured blocks nothing", () => {
    expect(isLevelEnabled("debug", "debug")).toBe(true);
    expect(isLevelEnabled("debug", "info")).toBe(true);
    expect(isLevelEnabled("debug", "warn")).toBe(true);
    expect(isLevelEnabled("debug", "error")).toBe(true);
  });

  it("error configured only allows error", () => {
    expect(isLevelEnabled("error", "debug")).toBe(false);
    expect(isLevelEnabled("error", "info")).toBe(false);
    expect(isLevelEnabled("error", "warn")).toBe(false);
    expect(isLevelEnabled("error", "error")).toBe(true);
  });
});
