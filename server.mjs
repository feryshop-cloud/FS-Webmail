import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.NODE_ENV = process.env.NODE_ENV || "production";

const require = createRequire(import.meta.url);
const next = require("next");
const pino = require("pino");
const pinoHttp = require("pino-http");

// Resolved production config. `next()` factory di jalur `output: standalone`
// memeriksa `__NEXT_PRIVATE_STANDALONE_CONFIG` sebagai penanda boot standalone
// resmi (dipakai juga oleh `.next/standalone/server.js`). Nilainya bukan cuma
// penanda — `next/dist/server/config.js` meng-parse-nya sebagai JSON, jadi harus
// berisi config lengkap yang sudah di-resolve, bukan string sebarang.
const { default: loadConfig } = require("next/dist/server/config");
const { PHASE_PRODUCTION_SERVER } = require("next/dist/shared/lib/constants");
const resolvedConfig = await loadConfig(PHASE_PRODUCTION_SERVER, __dirname);
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(resolvedConfig);
loadEnv({
  path: [
    path.join(__dirname, ".env.local"),
    path.join(__dirname, ".env.production"),
    path.join(__dirname, ".env"),
  ],
});

const SERVICE = "WebMail";

function resolveLogLevel() {
  const fromEnv = String(process.env.LOG_LEVEL ?? "").toLowerCase();
  if (["debug", "info", "warn", "error"].includes(fromEnv)) return fromEnv;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

const logger = pino({
  level: resolveLogLevel(),
  timestamp: pino.stdTimeFunctions.epochTime,
  mixin: () => ({
    service: SERVICE,
    environment: process.env.NODE_ENV ?? "development",
  }),
});

// Jangan log asset statis & healthcheck agar stdout tidak spam.
const IGNORE_RE = /^\/(_next\/static|_next\/image|favicon\.ico|api\/health)/;
const STATIC_EXT_RE =
  /\.(?:css|js|mjs|png|svg|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot|map|txt|json|xml)$/i;

const httpLogger = pinoHttp({
  logger,
  // Reuse `x-request-id` agar requestId konsisten dengan log internal aplikasi.
  genReqId: (req) => req.headers["x-request-id"] || `req-${crypto.randomUUID()}`,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: () => "request completed",
  customErrorMessage: (_req, _res, _err) => "request error",
  autoLogging: {
    ignore: (req) => {
      const pathname = (req.url || "").split("?")[0];
      return IGNORE_RE.test(pathname) || STATIC_EXT_RE.test(pathname);
    },
  },
  serializers: {
    req(req) {
      const headers = req.raw?.headers ?? {};
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        headers: {
          "user-agent": headers["user-agent"],
          "x-forwarded-for": headers["x-forwarded-for"],
        },
      };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
});

const hostname = process.env.LISTEN_HOST || "::";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = createServer((req, res) => {
      httpLogger(req, res);
      handle(req, res);
    });
    server.listen(port, hostname, () => {
      logger.info(
        `WebMail production server ready on ${hostname}:${port} (${process.env.NODE_ENV ?? "production"})`,
      );
    });
  })
  .catch((err) => {
    logger.error({ err }, "WebMail production server failed to start");
    process.exit(1);
  });
