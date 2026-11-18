import type {
  GetCatalogDetails,
  GetTrendingMovies,
  SearchCatalog,
} from "./tmdb.client.js";

export interface CatalogCacheOptions {
  maxEntries?: number;
  now?: () => number;
}

/** Process-local, bounded cache. Rejected requests are never cached. */
export function makeCatalogCache(options: CatalogCacheOptions = {}) {
  const maxEntries = options.maxEntries ?? 300;
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) {
    throw new Error("maxEntries must be a positive integer");
  }
  const now = options.now ?? Date.now;
  const entries = new Map<string, { value: unknown; expiresAt: number }>();
  const pending = new Map<string, Promise<unknown>>();

  async function get<T>(
    key: string,
    ttlMs: number,
    load: () => Promise<T>,
  ): Promise<T> {
    const cached = entries.get(key);
    if (cached && cached.expiresAt > now()) {
      // Refresh insertion order to evict the least recently used entry.
      entries.delete(key);
      entries.set(key, cached);
      return cached.value as T;
    }
    if (cached) entries.delete(key);

    const existing = pending.get(key);
    if (existing) return existing as Promise<T>;

    const request = Promise.resolve().then(load);
    pending.set(key, request);
    try {
      const value = await request;
      entries.set(key, { value, expiresAt: now() + ttlMs });
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }
      return value;
    } finally {
      if (pending.get(key) === request) pending.delete(key);
    }
  }

  return { get };
}

export function cacheCatalogProviders(
  providers: {
    getTrendingMovies: GetTrendingMovies;
    searchCatalog: SearchCatalog;
    getCatalogDetails: GetCatalogDetails;
  },
  options: CatalogCacheOptions = {},
) {
  const cache = makeCatalogCache(options);
  return {
    getTrendingMovies: (() =>
      cache.get(
        "trending:movie:week:pt-BR",
        15 * 60_000,
        providers.getTrendingMovies,
      )) satisfies GetTrendingMovies,
    searchCatalog: ((query, mediaType) =>
      cache.get(JSON.stringify(["search", mediaType, query]), 10 * 60_000, () =>
        providers.searchCatalog(query, mediaType),
      )) satisfies SearchCatalog,
    getCatalogDetails: ((mediaType, id) =>
      cache.get(JSON.stringify(["details", mediaType, id]), 60 * 60_000, () =>
        providers.getCatalogDetails(mediaType, id),
      )) satisfies GetCatalogDetails,
  };
}
