import { AsyncLocalStorage } from "node:async_hooks";

interface RequestContext {
  requestId?: string;
}

const requestStorage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestId<T>(requestId: string | undefined, fn: () => T): T {
  return requestStorage.run({ requestId }, fn);
}

export function getRequestId(): string | undefined {
  return requestStorage.getStore()?.requestId;
}
