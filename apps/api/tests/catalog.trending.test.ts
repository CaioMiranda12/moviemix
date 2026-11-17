import { afterAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import {
  makeGetTrendingMovies,
  TmdbUnavailableError,
} from "../src/modules/catalog/tmdb.client.js";

describe("GET /catalog/trending", () => {
  const mockResults = [
    {
      id: 123,
      title: "Filme de teste",
      overview: "Sinopse de teste",
      posterPath: "/poster.jpg",
      releaseDate: "2026-01-01",
      voteAverage: 7.5,
    },
  ];
  const app = buildApp({ getTrendingMovies: async () => mockResults });
  const unconfiguredApp = buildApp();
  const unavailableApp = buildApp({
    getTrendingMovies: async () => {
      throw new TmdbUnavailableError();
    },
  });

  afterAll(async () => {
    await Promise.all([
      app.close(),
      unconfiguredApp.close(),
      unavailableApp.close(),
    ]);
  });

  it("returns normalized trending movies", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/catalog/trending",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ results: mockResults });
  });

  it("returns 503 when TMDB is not configured", async () => {
    const response = await unconfiguredApp.inject({
      method: "GET",
      url: "/catalog/trending",
    });
    expect(response.statusCode).toBe(503);
  });

  it("returns 502 when TMDB is unavailable", async () => {
    const response = await unavailableApp.inject({
      method: "GET",
      url: "/catalog/trending",
    });
    expect(response.statusCode).toBe(502);
  });
});

describe("TMDB client", () => {
  it("sends bearer token and normalizes response", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              id: 123,
              title: "Filme de teste",
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
    const movies = await makeGetTrendingMovies("test-token", fetcher)();
    expect(movies[0]?.posterPath).toBeNull();
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("language=pt-BR"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });
});
