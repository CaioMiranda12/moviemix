import { describe, expect, it, vi } from "vitest";
import {
  makeCatalogCache,
  cacheCatalogProviders,
} from "../src/modules/catalog/catalog-cache.js";

const movie = {
  id: 603,
  title: "Matrix",
  overview: "",
  posterPath: null,
  releaseDate: "1999",
  voteAverage: 8,
};
const details = {
  ...movie,
  mediaType: "movie" as const,
  backdropPath: null,
  genres: [],
};

describe("catalog cache", () => {
  it("reuses a value until expiry, then loads again", async () => {
    let time = 0;
    const cache = makeCatalogCache({ now: () => time });
    const load = vi.fn(async () => "value");
    expect(await cache.get("a", 100, load)).toBe("value");
    time = 99;
    expect(await cache.get("a", 100, load)).toBe("value");
    expect(load).toHaveBeenCalledTimes(1);
    time = 100;
    await cache.get("a", 100, load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares concurrent requests and does not cache failures", async () => {
    const cache = makeCatalogCache();
    let resolve!: (value: number) => void;
    const load = vi.fn(
      () =>
        new Promise<number>((done) => {
          resolve = done;
        }),
    );
    const a = cache.get("key", 1000, load);
    const b = cache.get("key", 1000, load);
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);
    resolve(42);
    expect(await Promise.all([a, b])).toEqual([42, 42]);
    const failure = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(5);
    await expect(cache.get("fail", 1000, failure)).rejects.toThrow("offline");
    expect(await cache.get("fail", 1000, failure)).toBe(5);
    expect(failure).toHaveBeenCalledTimes(2);
  });

  it("evicts least recently used entries", async () => {
    const cache = makeCatalogCache({ maxEntries: 2 });
    const load = vi.fn(async (value: number) => value);
    await cache.get("a", 1000, () => load(1));
    await cache.get("b", 1000, () => load(2));
    await cache.get("a", 1000, () => load(1));
    await cache.get("c", 1000, () => load(3));
    await cache.get("b", 1000, () => load(2));
    expect(load).toHaveBeenCalledTimes(4);
  });

  it("separates media types and detail identifiers", async () => {
    const search = vi.fn(async () => [
      { ...movie, mediaType: "movie" as const },
    ]);
    const getDetails = vi.fn(async () => details);
    const providers = cacheCatalogProviders({
      getTrendingMovies: vi.fn(async () => [movie]),
      searchCatalog: search,
      getCatalogDetails: getDetails,
    });
    await providers.searchCatalog("matrix", "movie");
    await providers.searchCatalog("matrix", "movie");
    await providers.searchCatalog("matrix", "tv");
    expect(search).toHaveBeenCalledTimes(2);
    await providers.getCatalogDetails("movie", 603);
    await providers.getCatalogDetails("movie", 603);
    await providers.getCatalogDetails("tv", 603);
    expect(getDetails).toHaveBeenCalledTimes(2);
  });
});
