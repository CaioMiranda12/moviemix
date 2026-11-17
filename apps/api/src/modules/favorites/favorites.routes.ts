import type { FastifyInstance } from "fastify";
import {
  isSameOrigin,
  makeRequireAuth,
} from "../auth/authenticated-session.js";
import type { FindSessionUser } from "../auth/session.repository.js";
import {
  TmdbNotFoundError,
  TmdbUnavailableError,
  type CatalogMediaType,
  type GetCatalogDetails,
} from "../catalog/tmdb.client.js";
import type { FavoritesRepository } from "./favorites.repository.js";

function validIdentity(
  type: string,
  rawId: string,
): { type: CatalogMediaType; id: number } | null {
  const id = Number(rawId);
  if (
    (type !== "movie" && type !== "tv") ||
    !/^[1-9]\d*$/.test(rawId) ||
    !Number.isSafeInteger(id)
  )
    return null;
  return { type, id };
}

export function registerFavoritesRoutes(
  app: FastifyInstance,
  findSessionUser?: FindSessionUser,
  repository?: FavoritesRepository,
  getCatalogDetails?: GetCatalogDetails,
): void {
  // Do not expose routes that cannot safely access the authenticated user's data.
  if (!findSessionUser || !repository) return;
  const requireAuth = makeRequireAuth(findSessionUser);

  app.get("/favorites", async (request, reply) => {
    try {
      const user = await requireAuth(request, reply);
      if (!user) return reply;
      return { results: await repository.list(user.id) };
    } catch (error) {
      request.log.error({ err: error }, "Favorites listing failed");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.post<{ Body: { mediaType?: string; id?: number } }>(
    "/favorites",
    { bodyLimit: 1024 },
    async (request, reply) => {
      if (!isSameOrigin(request))
        return reply.code(403).send({ error: "Forbidden" });
      try {
        const user = await requireAuth(request, reply);
        if (!user) return reply;
        const body = request.body;
        if (
          !body ||
          typeof body.mediaType !== "string" ||
          typeof body.id !== "number"
        ) {
          return reply.code(400).send({ error: "Invalid favorite data" });
        }
        const identity = validIdentity(body.mediaType, String(body.id));
        if (!identity)
          return reply.code(400).send({ error: "Invalid favorite data" });
        if (!getCatalogDetails)
          return reply.code(503).send({ error: "TMDB not configured" });
        const details = await getCatalogDetails(identity.type, identity.id);
        if (!details.title.trim())
          return reply
            .code(502)
            .send({ error: "Catalog provider unavailable" });
        await repository.add(user.id, details);
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof TmdbNotFoundError)
          return reply.code(404).send({ error: "Catalog title not found" });
        if (error instanceof TmdbUnavailableError)
          return reply
            .code(502)
            .send({ error: "Catalog provider unavailable" });
        request.log.error({ err: error }, "Adding favorite failed");
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );

  app.delete<{ Params: { mediaType: string; id: string } }>(
    "/favorites/:mediaType/:id",
    async (request, reply) => {
      if (!isSameOrigin(request))
        return reply.code(403).send({ error: "Forbidden" });
      try {
        const user = await requireAuth(request, reply);
        if (!user) return reply;
        const identity = validIdentity(
          request.params.mediaType,
          request.params.id,
        );
        if (!identity)
          return reply.code(400).send({ error: "Invalid favorite parameters" });
        await repository.remove(user.id, identity.type, identity.id);
        return reply.code(204).send();
      } catch (error) {
        request.log.error({ err: error }, "Removing favorite failed");
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );
}
