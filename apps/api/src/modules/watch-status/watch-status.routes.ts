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
import type {
  WatchStatus,
  WatchStatusRepository,
} from "./watch-status.repository.js";

function parseIdentity(
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
function isWatchStatus(value: unknown): value is WatchStatus {
  return (
    value === "WANT_TO_WATCH" || value === "WATCHING" || value === "WATCHED"
  );
}

export function registerWatchStatusRoutes(
  app: FastifyInstance,
  findSessionUser?: FindSessionUser,
  repository?: WatchStatusRepository,
  getCatalogDetails?: GetCatalogDetails,
): void {
  if (!findSessionUser || !repository) return;
  const requireAuth = makeRequireAuth(findSessionUser);

  app.get("/watch-status", async (request, reply) => {
    try {
      const user = await requireAuth(request, reply);
      if (!user) return reply;
      return { results: await repository.list(user.id) };
    } catch (error) {
      request.log.error({ err: error }, "Watch status listing failed");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.put<{
    Params: { mediaType: string; id: string };
    Body: { status?: unknown };
  }>(
    "/watch-status/:mediaType/:id",
    { bodyLimit: 1024 },
    async (request, reply) => {
      if (!isSameOrigin(request))
        return reply.code(403).send({ error: "Forbidden" });
      try {
        const user = await requireAuth(request, reply);
        if (!user) return reply;
        const identity = parseIdentity(
          request.params.mediaType,
          request.params.id,
        );
        if (!identity || !isWatchStatus(request.body?.status))
          return reply.code(400).send({ error: "Invalid watch status data" });
        if (!getCatalogDetails)
          return reply.code(503).send({ error: "TMDB not configured" });
        const details = await getCatalogDetails(identity.type, identity.id);
        if (!details.title.trim())
          return reply
            .code(502)
            .send({ error: "Catalog provider unavailable" });
        await repository.set(user.id, details, request.body.status);
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof TmdbNotFoundError)
          return reply.code(404).send({ error: "Catalog title not found" });
        if (error instanceof TmdbUnavailableError)
          return reply
            .code(502)
            .send({ error: "Catalog provider unavailable" });
        request.log.error({ err: error }, "Setting watch status failed");
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );

  app.delete<{ Params: { mediaType: string; id: string } }>(
    "/watch-status/:mediaType/:id",
    async (request, reply) => {
      if (!isSameOrigin(request))
        return reply.code(403).send({ error: "Forbidden" });
      try {
        const user = await requireAuth(request, reply);
        if (!user) return reply;
        const identity = parseIdentity(
          request.params.mediaType,
          request.params.id,
        );
        if (!identity)
          return reply
            .code(400)
            .send({ error: "Invalid watch status parameters" });
        await repository.remove(user.id, identity.type, identity.id);
        return reply.code(204).send();
      } catch (error) {
        request.log.error({ err: error }, "Removing watch status failed");
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );
}
