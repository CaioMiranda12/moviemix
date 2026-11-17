import { afterAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import {
  makeGetCatalogDetails,
  TmdbNotFoundError,
  TmdbUnavailableError,
} from "../src/modules/catalog/tmdb.client.js";

const movie = {
  id: 603,
  mediaType: "movie" as const,
  title: "Matrix",
  overview: "Sinopse",
  posterPath: "/poster.jpg",
  backdropPath: "/backdrop.jpg",
  releaseDate: "1999-03-31",
  voteAverage: 8.2,
  genres: [{ id: 878, name: "Ficção científica" }],
};
const app = buildApp({ getCatalogDetails: async () => movie });
const unconfigured = buildApp();
const notFound = buildApp({
  getCatalogDetails: async () => {
    throw new TmdbNotFoundError();
  },
});
const unavailable = buildApp({
  getCatalogDetails: async () => {
    throw new TmdbUnavailableError();
  },
});

afterAll(async () => {
  await Promise.all([
    app.close(),
    unconfigured.close(),
    notFound.close(),
    unavailable.close(),
  ]);
});

describe("GET /catalog/:mediaType/:id", () => {
  it("returns movie details", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/catalog/movie/603",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ result: movie });
  });
  it("supports TV details", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/catalog/tv/603",
    });
    expect(response.statusCode).toBe(200);
  });
  it.each([
    "/catalog/person/603",
    "/catalog/movie/0",
    "/catalog/movie/-1",
    "/catalog/tv/abc",
    "/catalog/movie/99999999999999999999",
  ])("rejects invalid parameters: %s", async (url) => {
    const response = await app.inject({ method: "GET", url });
    expect(response.statusCode).toBe(400);
  });
  it("returns 503 without a token", async () => {
    expect(
      (await unconfigured.inject({ method: "GET", url: "/catalog/movie/603" }))
        .statusCode,
    ).toBe(503);
  });
  it("returns 404 when the title does not exist", async () => {
    expect(
      (await notFound.inject({ method: "GET", url: "/catalog/movie/603" }))
        .statusCode,
    ).toBe(404);
  });
  it("returns 502 on provider errors", async () => {
    expect(
      (await unavailable.inject({ method: "GET", url: "/catalog/movie/603" }))
        .statusCode,
    ).toBe(502);
  });
});

describe("TMDB details client", () => {
  it("maps movie details and sends the token", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 603,
          title: "Matrix",
          overview: "Sinopse",
          poster_path: "/poster.jpg",
          backdrop_path: "/backdrop.jpg",
          release_date: "1999-03-31",
          vote_average: 8.2,
          genres: [{ id: 878, name: "Ficção científica" }],
        }),
        { status: 200 },
      ),
    );
    expect(
      await makeGetCatalogDetails("test-token", fetcher)("movie", 603),
    ).toEqual(movie);
    const url = new URL(fetcher.mock.calls[0]![0] as string);
    expect(url.pathname).toBe("/3/movie/603");
    expect(url.searchParams.get("language")).toBe("pt-BR");
    expect(fetcher.mock.calls[0]![1]?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-token" }),
    );
  });
  it("maps series title and first air date", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 10,
          name: "Série",
          overview: "Sinopse",
          poster_path: null,
          backdrop_path: null,
          first_air_date: "2020-01-01",
          vote_average: 7,
          genres: [],
        }),
        { status: 200 },
      ),
    );
    const result = await makeGetCatalogDetails("token", fetcher)("tv", 10);
    expect(result).toMatchObject({
      id: 10,
      mediaType: "tv",
      title: "Série",
      releaseDate: "2020-01-01",
    });
  });
  it("maps HTTP 404 to not found", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("", { status: 404 }));
    await expect(
      makeGetCatalogDetails("token", fetcher)("movie", 1),
    ).rejects.toBeInstanceOf(TmdbNotFoundError);
  });
  it("maps network failures to provider unavailable", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("offline"));
    await expect(
      makeGetCatalogDetails("token", fetcher)("tv", 1),
    ).rejects.toBeInstanceOf(TmdbUnavailableError);
  });
});
