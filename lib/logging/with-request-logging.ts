import { randomUUID } from "node:crypto";
import { pinoLogger } from "@/lib/logger";
import { runWithRequestId } from "@/lib/logging/request-context";

export type RouteHandler<C = unknown> = (req: Request, ctx: C) => Promise<Response> | Response;

/**
 * Derive the correlation id for a request: reuse `x-request-id` header when
 * present, otherwise generate `req-<uuid>`. Mirrors pino-http `genReqId`
 * semantics (payload shape), implemented manually for App Router.
 */
export function genReqId(req: Request): string {
  return req.headers.get("x-request-id") ?? `req-${randomUUID()}`;
}

function reqMeta(req: Request, requestId: string) {
  const method = req.method ?? "GET";
  const url = req.url ?? "";
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return { id: requestId, method, url, headers };
}

/**
 * Binds `requestId` (from `x-request-id` header or freshly generated) into the
 * async-local request context so every `logger` call inside the handler carries
 * the same correlation id, echoes it back on the response `x-request-id`
 * header, and logs handler errors.
 *
 * Request lifecycle logs (`request completed` with statusCode/responseTime)
 * are emitted by the pino-http wrapper in `server.mjs` (production custom
 * server), so no per-route completion log is produced here.
 */
export function withRequestLogging<C = unknown>(handler: RouteHandler<C>): RouteHandler<C> {
  return async (req, ctx) => {
    const requestId = genReqId(req);
    const reqMetaForLog = reqMeta(req, requestId);

    return runWithRequestId(requestId, async () => {
      let res: Response;
      try {
        res = await handler(req, ctx);
      } catch (err) {
        pinoLogger.error(
          {
            err,
            req: reqMetaForLog,
            context: `Route: ${reqMetaForLog.method} ${reqMetaForLog.url}`,
          },
          "request error",
        );
        throw err;
      }
      res.headers.set("x-request-id", requestId);
      return res;
    });
  };
}
