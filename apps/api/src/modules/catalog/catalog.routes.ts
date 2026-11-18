import type { FastifyInstance } from "fastify";
import {
  TmdbUnavailableError,
  TmdbNotFoundError,
  type GetCatalogDetails,
  type GetTrendingMovies,
  type SearchCatalog,
  type CatalogMediaType,
  type DiscoverByGenre,
  type FilterCatalog,
  type CatalogFilters,
} from "./tmdb.client.js";

export function registerCatalogRoutes(
  app: FastifyInstance,
  getTrendingMovies?: GetTrendingMovies,
  searchCatalog?: SearchCatalog,
  getCatalogDetails?: GetCatalogDetails,
  discoverByGenre?: DiscoverByGenre,
  filterCatalog?: FilterCatalog,
): void {
  app.get("/catalog/trending", async (request, reply) => {
    if (!getTrendingMovies) {
      return reply.code(503).send({ error: "TMDB not configured" });
    }

    try {
      return { results: await getTrendingMovies() };
    } catch (error) {
      if (!(error instanceof TmdbUnavailableError)) {
        request.log.error({ err: error }, "Unexpected catalog error");
      }
      return reply.code(502).send({ error: "Catalog provider unavailable" });
    }
  });

  app.get<{ Querystring: { q?: string; type?: string } }>(
    "/catalog/search",
    async (request, reply) => {
      const { q, type = "movie" } = request.query;
      const query = q?.trim();
      if (
        !query ||
        query.length < 2 ||
        query.length > 100 ||
        !["movie", "tv"].includes(type)
      ) {
        return reply.code(400).send({ error: "Invalid search parameters" });
      }
      if (!searchCatalog) {
        return reply.code(503).send({ error: "TMDB not configured" });
      }
      try {
        return {
          results: await searchCatalog(query, type as CatalogMediaType),
        };
      } catch (error) {
        if (!(error instanceof TmdbUnavailableError)) {
          request.log.error({ err: error }, "Unexpected catalog search error");
        }
        return reply.code(502).send({ error: "Catalog provider unavailable" });
      }
    },
  );

  app.get<{ Querystring: { type?: string; genre?: string } }>(
    "/catalog/discover",
    async (request, reply) => {
      const { type = "movie", genre } = request.query;
      const allowed =
        type === "movie"
          ? [
              28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749,
              878, 10770, 53, 10752, 37,
            ]
          : [
              10759, 16, 35, 80, 99, 18, 10751, 10762, 9648, 10763, 10764,
              10765, 10766, 10767, 10768, 37,
            ];
      const genreId = Number(genre);
      if (!genre || !/^\d+$/.test(genre) || !allowed.includes(genreId)) {
        return reply.code(400).send({ error: "Invalid discover parameters" });
      }
      if (!discoverByGenre)
        return reply.code(503).send({ error: "TMDB not configured" });
      try {
        return {
          results: await discoverByGenre(type as CatalogMediaType, genreId),
        };
      } catch (error) {
        if (!(error instanceof TmdbUnavailableError))
          request.log.error(
            { err: error },
            "Unexpected catalog discover error",
          );
        return reply.code(502).send({ error: "Catalog provider unavailable" });
      }
    },
  );

  app.get<{
    Querystring: {
      type?: string;
      q?: string;
      genre?: string;
      year?: string;
      minRating?: string;
    };
  }>("/catalog/filter", async (request, reply) => {
    const { type = "movie", q, genre, year, minRating } = request.query;
    const query = q?.trim();
    const genreId = genre === undefined ? undefined : Number(genre);
    const yearNumber = year === undefined ? undefined : Number(year);
    const rating = minRating === undefined ? undefined : Number(minRating);
    const allowed =
      type === "movie"
        ? [
            28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749,
            878, 10770, 53, 10752, 37,
          ]
        : [
            10759, 16, 35, 80, 99, 18, 10751, 10762, 9648, 10763, 10764, 10765,
            10766, 10767, 10768, 37,
          ];
    if (
      !["movie", "tv"].includes(type) ||
      (q !== undefined && (!query || query.length < 2 || query.length > 100)) ||
      (genre !== undefined &&
        (!/^\d+$/.test(genre) || !allowed.includes(genreId!))) ||
      (year !== undefined &&
        (!/^\d{4}$/.test(year) || yearNumber! < 1870 || yearNumber! > 2100)) ||
      (minRating !== undefined &&
        (!/^(?:10(?:\.0)?|[0-9](?:\.[0-9])?)$/.test(minRating) ||
          !Number.isFinite(rating)))
    )
      return reply.code(400).send({ error: "Invalid filter parameters" });
    if (!filterCatalog)
      return reply.code(503).send({ error: "TMDB not configured" });
    const filters: CatalogFilters = {
      type: type as CatalogMediaType,
      query,
      genre: genreId,
      year: yearNumber,
      minRating: rating,
    };
    try {
      return { results: await filterCatalog(filters) };
    } catch (error) {
      if (!(error instanceof TmdbUnavailableError))
        request.log.error({ err: error }, "Unexpected catalog filter error");
      return reply.code(502).send({ error: "Catalog provider unavailable" });
    }
  });

  app.get<{ Params: { mediaType: string; id: string } }>(
    "/catalog/:mediaType/:id",
    async (request, reply) => {
      const { mediaType, id: rawId } = request.params;
      const id = Number(rawId);
      if (
        !["movie", "tv"].includes(mediaType) ||
        !/^[1-9]\d*$/.test(rawId) ||
        !Number.isSafeInteger(id)
      ) {
        return reply.code(400).send({ error: "Invalid catalog parameters" });
      }
      if (!getCatalogDetails) {
        return reply.code(503).send({ error: "TMDB not configured" });
      }
      try {
        return {
          result: await getCatalogDetails(mediaType as CatalogMediaType, id),
        };
      } catch (error) {
        if (error instanceof TmdbNotFoundError) {
          return reply.code(404).send({ error: "Catalog title not found" });
        }
        if (!(error instanceof TmdbUnavailableError)) {
          request.log.error({ err: error }, "Unexpected catalog details error");
        }
        return reply.code(502).send({ error: "Catalog provider unavailable" });
      }
    },
  );
}
