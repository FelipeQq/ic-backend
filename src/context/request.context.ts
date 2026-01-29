import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  userId?: string | null;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext {
  return requestContext.getStore() || {};
}

export function getCurrentUserId(): string | undefined {
  return getRequestContext().userId ?? undefined;
}
