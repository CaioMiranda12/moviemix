import { afterAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import {
  makeSearchCatalog,
  TmdbUnavailableError,
} from "../src/modules/catalog/tmdb.client.js";

const result = {
  id: 42,
  mediaType: "movie" as const,
  title: "Exemplo",
  overview: "Sinopse",
  posterPath: null,
  releaseDate: "2026-01-01",
  voteAverage: 8,
};

const app = buildApp({ searchCatalog: async () => [result] });
const unconfigured = buildApp();
const unavailable = buildApp({
  searchCatalog: async () => {
    throw new TmdbUnavailableError();
  },
});

afterAll(async () => {
  await Promise.all([app.close(), unconfigured.close(), unavailable.close()]);
});

describe("GET /catalog/search", () => {
  it("returns search results", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/catalog/search?q=matrix&type=movie",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ results: [result] });
  });

  it.each(["", "?q=a", "?q=ok&type=person", `?q=${"a".repeat(101)}`])(
    "rejects invalid query %s",
    async (params) => {
      const response = await app.inject({
        method: "GET",
        url: `/catalog/search${params}`,
      });
      expect(response.statusCode).toBe(400);
    },
  );

  it("returns 503 when TMDB is not configured", async () => {
    const response = await unconfigured.inject({
      method: "GET",
      url: "/catalog/search?q=matrix",
    });
    expect(response.statusCode).toBe(503);
  });

  it("returns 502 when TMDB is unavailable", async () => {
    const response = await unavailable.inject({
      method: "GET",
      url: "/catalog/search?q=matrix",
    });
    expect(response.statusCode).toBe(502);
  });
});

describe("TMDB search client", () => {
  it("encodes movie search and sends token", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              id: 42,
              title: "Exemplo",
              overview: "Sinopse",
              poster_path: null,
              release_date: "2026-01-01",
              vote_average: 8,
            },
          ],
        }),
        { status: 200 },
      ),
    );
    expect(
      await makeSearchCatalog("test-token", fetcher)("ação & drama", "movie"),
    ).toEqual([result]);
    const url = new URL(fetcher.mock.calls[0]![0] as string);
    expect(url.pathname).toBe("/3/search/movie");
    expect(url.searchParams.get("query")).toBe("ação & drama");
    expect(url.searchParams.get("language")).toBe("pt-BR");
    expect(fetcher.mock.calls[0]![1]?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-token" }),
    );
  });

  it("normalizes TV title and first air date", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              id: 5,
              name: "Série exemplo",
              overview: "Sinopse",
              poster_path: "/tv.jpg",
              first_air_date: "2025-02-03",
              vote_average: 7,
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const results = await makeSearchCatalog("test-token", fetcher)(
      "série",
      "tv",
    );
    expect(results[0]).toEqual({
      id: 5,
      mediaType: "tv",
      title: "Série exemplo",
      overview: "Sinopse",
      posterPath: "/tv.jpg",
      releaseDate: "2025-02-03",
      voteAverage: 7,
    });
  });

  it("converts provider failures into unavailable error", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("error", { status: 500 }));
    await expect(
      makeSearchCatalog("test-token", fetcher)("matrix", "movie"),
    ).rejects.toBeInstanceOf(TmdbUnavailableError);
  });
});
