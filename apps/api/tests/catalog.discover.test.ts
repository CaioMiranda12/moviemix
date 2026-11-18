import { afterAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import {
  makeDiscoverByGenre,
  TmdbUnavailableError,
} from "../src/modules/catalog/tmdb.client.js";

const item = {
  id: 7,
  mediaType: "movie" as const,
  title: "Exemplo",
  overview: "Sinopse",
  posterPath: null,
  releaseDate: "2025-01-01",
  voteAverage: 8,
};
const app = buildApp({ discoverByGenre: async () => [item] });
const unavailable = buildApp({
  discoverByGenre: async () => {
    throw new TmdbUnavailableError();
  },
});
const unconfigured = buildApp();
afterAll(async () => {
  await Promise.all([app.close(), unavailable.close(), unconfigured.close()]);
});

describe("GET /catalog/discover", () => {
  it("returns results for a valid genre", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/catalog/discover?type=movie&genre=28",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ results: [item] });
  });
  it.each([
    "?type=person&genre=28",
    "?type=movie&genre=abc",
    "?type=movie&genre=99999",
    "?type=tv&genre=28",
    "?type=movie",
  ])("rejects invalid parameters %s", async (query) => {
    expect(
      (await app.inject({ method: "GET", url: `/catalog/discover${query}` }))
        .statusCode,
    ).toBe(400);
  });
  it("returns 503 when not configured", async () => {
    expect(
      (
        await unconfigured.inject({
          method: "GET",
          url: "/catalog/discover?genre=28",
        })
      ).statusCode,
    ).toBe(503);
  });
  it("returns 502 when TMDB fails", async () => {
    expect(
      (
        await unavailable.inject({
          method: "GET",
          url: "/catalog/discover?genre=28",
        })
      ).statusCode,
    ).toBe(502);
  });
});

describe("TMDB discovery client", () => {
  it("builds genre URL and normalizes movie results", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              id: 7,
              title: "Exemplo",
              overview: "Sinopse",
              poster_path: null,
              release_date: "2025-01-01",
              vote_average: 8,
            },
          ],
        }),
        { status: 200 },
      ),
    );
    expect(await makeDiscoverByGenre("token", fetcher)("movie", 28)).toEqual([
      item,
    ]);
    const url = new URL(fetcher.mock.calls[0]![0] as string);
    expect(url.pathname).toBe("/3/discover/movie");
    expect(url.searchParams.get("with_genres")).toBe("28");
    expect(url.searchParams.get("language")).toBe("pt-BR");
  });
});
