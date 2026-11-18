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

describe("GET /catalog/filter-page", () => {
  it("returns metadata and passes page to provider", async () => {
    const filterCatalogPage = vi
      .fn()
      .mockResolvedValue({ results: [], page: 2, hasMore: true });
    const app = buildApp({ filterCatalogPage });
    const response = await app.inject({
      url: "/catalog/filter-page?type=movie&q=Batman&genre=28&page=2",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ results: [], page: 2, hasMore: true });
    expect(filterCatalogPage).toHaveBeenCalledWith(
      {
        type: "movie",
        query: "Batman",
        genre: 28,
        year: undefined,
        minRating: undefined,
      },
      2,
    );
    await app.close();
  });

  it.each(["page=0", "page=-1", "page=501", "page=abc", "type=tv&genre=28"])(
    "rejects invalid pagination parameters: %s",
    async (params) => {
      const app = buildApp({ filterCatalogPage: vi.fn() });
      const response = await app.inject({
        url: `/catalog/filter-page?${params}`,
      });
      expect(response.statusCode).toBe(400);
      await app.close();
    },
  );
});

describe("TMDB paginated filter provider", () => {
  it("fetches only the requested source page, including empty matches", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total_pages: 3,
        results: [
          {
            id: 7,
            title: "Batman",
            overview: "",
            poster_path: null,
            release_date: "2022-01-01",
            vote_average: 8,
            genre_ids: [35],
          },
        ],
      }),
    });
    const { makeFilterCatalogPage } =
      await import("../src/modules/catalog/tmdb.client.js");
    const result = await makeFilterCatalogPage(
      "token",
      fetcher as unknown as typeof fetch,
    )({ type: "movie", query: "Batman", genre: 28 }, 2);
    expect(result).toEqual({ results: [], page: 2, hasMore: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(
      new URL(fetcher.mock.calls[0]![0] as string).searchParams.get("page"),
    ).toBe("2");
  });
});
