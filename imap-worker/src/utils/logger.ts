/**
 * Structured Logger for imap-worker daemon — pino-based.
 * Emits pino payload: numeric `level`, epoch-ms `time`, `pid`, `hostname`,
 * `service`, `environment`, `msg`, plus custom meta.
 */
import pino, { type Logger, type LoggerOptions } from "pino";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveLogLevel(): LogLevel {
  const fromEnv = (process.env.LOG_LEVEL ?? "").toLowerCase() as LogLevel;
  if (fromEnv in LOG_LEVEL_RANK) return fromEnv;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function serializeError(error: unknown): unknown {
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

const SERVICE = "imap-worker";

function createLogger(): Logger {
  const options: LoggerOptions = {
    level: resolveLogLevel(),
    mixin: () => ({
      service: SERVICE,
      environment: process.env.NODE_ENV ?? "development",
    }),
    timestamp: pino.stdTimeFunctions.epochTime,
    serializers: {
      err: serializeError,
      error: serializeError,
    },
  };
  return pino(options);
}

export const pinoLogger = createLogger();

function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const payload: Record<string, unknown> = { ...meta };
  if ("error" in payload && !("err" in payload)) {
    payload.err = payload.error;
    delete payload.error;
  }
  if (Object.keys(payload).length === 0) {
    pinoLogger[level](message);
  } else {
    pinoLogger[level](payload, message);
  }
}

export const logger = {
  debug(message: string, meta?: any) {
    write("debug", message, meta);
  },
  info(message: string, meta?: any) {
    write("info", message, meta);
  },
  warn(message: string, meta?: any) {
    write("warn", message, meta);
  },
  error(message: string, meta?: any) {
    write("error", message, meta);
  },
  serializeError,
};
