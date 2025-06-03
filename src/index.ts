import { type MiddlewareHandler } from "hono";
import { cache as builtinCache } from "hono/cache";

export type Options = Parameters<typeof builtinCache>[0];

export type Result = {
  cache: MiddlewareHandler;
  purge: MiddlewareHandler;
};

export function defineCache(options: Options): Result {
  const cache = builtinCache(options);

  if (!globalThis.caches) {
    const purge: MiddlewareHandler = async (_c, next) => await next();
    return { cache, purge };
  }

  const purge: MiddlewareHandler = async (c, next) => {
    const cacheName =
      typeof options.cacheName === "function"
        ? await options.cacheName(c)
        : options.cacheName;

    const cache = await caches.open(cacheName);

    const key = options.keyGenerator
      ? await options.keyGenerator(c)
      : c.req.url;

    const deleteFn = cache.delete(key);
    if (options.wait) {
      await deleteFn;
    } else {
      c.executionCtx.waitUntil(deleteFn);
    }

    await next();
  };

  return { cache, purge };
}
