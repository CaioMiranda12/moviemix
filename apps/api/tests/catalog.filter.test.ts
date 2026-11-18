import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { makeFilterCatalog } from "../src/modules/catalog/tmdb.client.js";

describe("GET /catalog/filter", () => {
  it("combines text, genre, year and rating", async () => {
    const filterCatalog = vi.fn().mockResolvedValue([]);
    const app = buildApp({ filterCatalog });
    const response = await app.inject({
      url: "/catalog/filter?type=movie&q=Batman&genre=28&year=2022&minRating=7",
    });
    expect(response.statusCode).toBe(200);
    expect(filterCatalog).toHaveBeenCalledWith({
      type: "movie",
      query: "Batman",
      genre: 28,
      year: 2022,
      minRating: 7,
    });
    await app.close();
  });

  it.each([
    "type=person",
    "genre=abc",
    "type=tv&genre=28",
    "year=0",
    "minRating=11",
    "q=a",
  ])("rejects invalid parameters: %s", async (query) => {
    const app = buildApp({ filterCatalog: vi.fn() });
    const response = await app.inject({ url: `/catalog/filter?${query}` });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});

describe("TMDB filter provider", () => {
  it("checks multiple search pages when combining text and genre", async () => {
    const fetcher = vi.fn().mockImplementation(async (url: string) => {
      const page = Number(new URL(url).searchParams.get("page"));
      return {
        ok: true,
        json: async () => ({
          total_pages: 2,
          results: [
            {
              id: page,
              title: "Batman",
              overview: "",
              poster_path: null,
              release_date: "2022-01-01",
              vote_average: 8,
              genre_ids: page === 1 ? [35] : [28],
            },
          ],
        }),
      };
    });
    const results = await makeFilterCatalog(
      "token",
      fetcher as unknown as typeof fetch,
    )({ type: "movie", query: "Batman", genre: 28, year: 2022, minRating: 7 });
    expect(results.map((item) => item.id)).toEqual([2]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
