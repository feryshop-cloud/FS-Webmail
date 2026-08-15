/**
 * Structured Logger for WebMail (FerryMail) — pino-based.
 * Emits pino payload: numeric `level`, epoch-ms `time`, `pid`, `hostname`,
 * `service`, `environment`, `msg`, plus custom meta (err/req/res serialized).
 *
 * Level filtering controlled by LOG_LEVEL (debug|info|warn|error).
 * When running inside a request context (see withRequestLogging), each line
 * carries `requestId` for correlation.
 */
import pino, { type Logger, type LoggerOptions } from "pino";
import { resolveLogLevel, serializeError, type LogLevel } from "@/lib/logging/format";
import { getRequestId } from "@/lib/logging/request-context";

const SERVICE = "WebMail";

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
  const requestId = getRequestId();
  const payload: Record<string, unknown> = { ...meta };
  if ("error" in payload && !("err" in payload)) {
    payload.err = payload.error;
    delete payload.error;
  }
  if (requestId) payload.requestId = requestId;
  if (Object.keys(payload).length === 0) {
    pinoLogger[level](message);
  } else {
    pinoLogger[level](payload, message);
  }
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    write("debug", message, meta);
  },
  info(message: string, meta?: Record<string, unknown>) {
    write("info", message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    write("warn", message, meta);
  },
  error(message: string, meta?: Record<string, unknown>) {
    write("error", message, meta);
  },
  serializeError,
};
