export type LogLevel = "debug" | "info" | "warn" | "error";

/** Pino numeric level values (trace=10, debug=20, info=30, warn=40, error=50, fatal=60). */
export const LOG_LEVEL_NUM: Record<LogLevel, number> = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

const LOG_LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function resolveLogLevel(): LogLevel {
  const fromEnv = (process.env.LOG_LEVEL ?? "").toLowerCase() as LogLevel;
  if (fromEnv in LOG_LEVEL_RANK) return fromEnv;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export function isLevelEnabled(configured: LogLevel, candidate: LogLevel): boolean {
  return LOG_LEVEL_RANK[candidate] >= LOG_LEVEL_RANK[configured];
}

/**
 * Serialize an error into pino-compatible `err` shape: `{ type, message, stack }`.
 * Plain objects / primitives pass through untouched.
 */
export function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    const result: Record<string, unknown> = {
      type: error.name || "Error",
      message: error.message,
    };
    if (error.stack) result.stack = error.stack;
    if ("code" in error) result.code = (error as { code?: unknown }).code;
    if (error.cause !== undefined && error.cause !== null) {
      result.cause = serializeError(error.cause);
    }
    return result;
  }
  if (typeof error === "object" && error !== null) {
    const e = error as { name?: unknown; message?: unknown; stack?: unknown };
    if (e.message !== undefined || e.stack !== undefined) {
      const result: Record<string, unknown> = {
        type: typeof e.name === "string" ? e.name : "Error",
        message: e.message,
      };
      if (e.stack) result.stack = e.stack;
      return result;
    }
  }
  return error;
}

export interface FormatLogOptions {
  service: string;
  requestId?: string;
  environment?: string;
}

/**
 * Lightweight pino-shaped JSON formatter for environments where the full pino
 * logger is unavailable (e.g. edge middleware / proxy). Emits the same payload
 * contract: numeric `level`, epoch-ms `time`, `service`, `environment`, `msg`.
 */
export function formatLog(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
  options?: FormatLogOptions,
): string {
  const payload: Record<string, unknown> = {
    level: LOG_LEVEL_NUM[level],
    time: Date.now(),
    service: options?.service ?? "app",
    environment: options?.environment ?? process.env.NODE_ENV ?? "development",
  };
  if (options?.requestId) payload.requestId = options.requestId;
  payload.msg = message;
  if (meta && Object.keys(meta).length > 0) {
    for (const [key, value] of Object.entries(meta)) {
      if (key === "error") {
        payload.err = value instanceof Error ? serializeError(value) : value;
      } else {
        payload[key] = value instanceof Error ? serializeError(value) : value;
      }
    }
  }
  return JSON.stringify(payload);
}
