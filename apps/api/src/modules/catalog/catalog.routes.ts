import type { FastifyInstance } from "fastify";
import {
  TmdbUnavailableError,
  type GetTrendingMovies,
  type SearchCatalog,
  type CatalogMediaType,
} from "./tmdb.client.js";

export function registerCatalogRoutes(
  app: FastifyInstance,
  getTrendingMovies?: GetTrendingMovies,
  searchCatalog?: SearchCatalog,
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
}
