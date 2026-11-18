import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  isSameOrigin,
  makeRequireAuth,
} from "../auth/authenticated-session.js";
import type { FindSessionUser } from "../auth/session.repository.js";
import type { GetCatalogDetails } from "../catalog/tmdb.client.js";
import { TmdbNotFoundError } from "../catalog/tmdb.client.js";
import type { PlaylistsRepository } from "./playlists.repository.js";

const idSchema = z.uuid();
const nameSchema = z
  .object({ name: z.string().trim().min(1).max(80) })
  .strict();

export function registerPlaylistsRoutes(
  app: FastifyInstance,
  findSessionUser?: FindSessionUser,
  repository?: PlaylistsRepository,
  getCatalogDetails?: GetCatalogDetails,
): void {
  if (!findSessionUser || !repository) return;
  const requireAuth = makeRequireAuth(findSessionUser);

  app.get("/playlists", async (request, reply) => {
    const user = await requireAuth(request, reply);
    if (!user) return reply;
    try {
      return { results: await repository.list(user.id) };
    } catch (error) {
      request.log.error({ err: error }, "Listing playlists failed");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get<{ Params: { id: string } }>(
    "/playlists/:id",
    async (request, reply) => {
      const user = await requireAuth(request, reply);
      if (!user) return reply;
      const id = idSchema.safeParse(request.params.id);
      if (!id.success)
        return reply.code(400).send({ error: "Invalid playlist id" });
      try {
        const playlist = await repository.get(user.id, id.data);
        if (!playlist)
          return reply.code(404).send({ error: "Playlist not found" });
        const items = await repository.items(user.id, id.data);
        return { playlist, items: items ?? [] };
      } catch (error) {
        request.log.error({ err: error }, "Reading playlist failed");
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );

  app.post<{ Params: { id: string }; Body: unknown }>(
    "/playlists/:id/items",
    { bodyLimit: 1024 },
    async (request, reply) => {
      if (!isSameOrigin(request))
        return reply.code(403).send({ error: "Forbidden" });
      const user = await requireAuth(request, reply);
      if (!user) return reply;
      const id = idSchema.safeParse(request.params.id);
      const body = z
        .object({
          mediaType: z.enum(["movie", "tv"]),
          id: z.number().int().positive().safe(),
        })
        .strict()
        .safeParse(request.body);
      if (!id.success || !body.success)
        return reply.code(400).send({ error: "Invalid playlist item" });
      if (!getCatalogDetails)
        return reply.code(503).send({ error: "Catalog unavailable" });
      try {
        if (!(await repository.get(user.id, id.data)))
          return reply.code(404).send({ error: "Playlist not found" });
        // Do not trust title or poster data supplied by the client.
        const details = await getCatalogDetails(
          body.data.mediaType,
          body.data.id,
        );
        const result = await repository.addItem(user.id, id.data, details);
        if (result === "missing")
          return reply.code(404).send({ error: "Playlist not found" });
        if (result === "duplicate")
          return reply.code(409).send({ error: "Title already in playlist" });
        return reply.code(201).send({ added: true });
      } catch (error) {
        if (error instanceof TmdbNotFoundError)
          return reply.code(404).send({ error: "Title not found" });
        request.log.error({ err: error }, "Adding playlist item failed");
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );

  app.delete<{ Params: { id: string; mediaType: string; mediaId: string } }>(
    "/playlists/:id/items/:mediaType/:mediaId",
    async (request, reply) => {
      if (!isSameOrigin(request))
        return reply.code(403).send({ error: "Forbidden" });
      const user = await requireAuth(request, reply);
      if (!user) return reply;
      const id = idSchema.safeParse(request.params.id);
      const type = z.enum(["movie", "tv"]).safeParse(request.params.mediaType);
      const mediaId = z.coerce
        .number()
        .int()
        .positive()
        .safe()
        .safeParse(request.params.mediaId);
      if (!id.success || !type.success || !mediaId.success)
        return reply.code(400).send({ error: "Invalid playlist item" });
      try {
        const result = await repository.removeItem(
          user.id,
          id.data,
          type.data,
          mediaId.data,
        );
        return result === "removed"
          ? reply.code(204).send()
          : reply.code(404).send({ error: "Playlist or item not found" });
      } catch (error) {
        request.log.error({ err: error }, "Removing playlist item failed");
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );

  app.put<{ Params: { id: string }; Body: unknown }>(
    "/playlists/:id/items/order",
    { bodyLimit: 16384 },
    async (request, reply) => {
      if (!isSameOrigin(request))
        return reply.code(403).send({ error: "Forbidden" });
      const user = await requireAuth(request, reply);
      if (!user) return reply;
      const id = idSchema.safeParse(request.params.id);
      const body = z
        .object({
          items: z
            .array(
              z
                .object({
                  mediaType: z.enum(["movie", "tv"]),
                  id: z.number().int().positive().safe(),
                })
                .strict(),
            )
            .max(200),
        })
        .strict()
        .safeParse(request.body);
      if (!id.success || !body.success)
        return reply.code(400).send({ error: "Invalid playlist order" });
      try {
        const result = await repository.reorderItems(
          user.id,
          id.data,
          body.data.items,
        );
        if (result === "missing")
          return reply.code(404).send({ error: "Playlist not found" });
        if (result === "mismatch")
          return reply.code(409).send({ error: "Playlist contents changed" });
        return reply.code(204).send();
      } catch (error) {
        request.log.error({ err: error }, "Reordering playlist failed");
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );

  app.post<{ Body: unknown }>(
    "/playlists",
    { bodyLimit: 1024 },
    async (request, reply) => {
      if (!isSameOrigin(request))
        return reply.code(403).send({ error: "Forbidden" });
      const user = await requireAuth(request, reply);
      if (!user) return reply;
      const parsed = nameSchema.safeParse(request.body);
      if (!parsed.success)
        return reply.code(400).send({ error: "Invalid playlist name" });
      try {
        return reply
          .code(201)
          .send(await repository.create(user.id, parsed.data.name));
      } catch (error) {
        request.log.error({ err: error }, "Creating playlist failed");
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: unknown }>(
    "/playlists/:id",
    { bodyLimit: 1024 },
    async (request, reply) => {
      if (!isSameOrigin(request))
        return reply.code(403).send({ error: "Forbidden" });
      const user = await requireAuth(request, reply);
      if (!user) return reply;
      const id = idSchema.safeParse(request.params.id);
      const body = nameSchema.safeParse(request.body);
      if (!id.success || !body.success)
        return reply.code(400).send({ error: "Invalid playlist data" });
      try {
        const updated = await repository.rename(
          user.id,
          id.data,
          body.data.name,
        );
        return updated ?? reply.code(404).send({ error: "Playlist not found" });
      } catch (error) {
        request.log.error({ err: error }, "Renaming playlist failed");
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/playlists/:id",
    async (request, reply) => {
      if (!isSameOrigin(request))
        return reply.code(403).send({ error: "Forbidden" });
      const user = await requireAuth(request, reply);
      if (!user) return reply;
      const id = idSchema.safeParse(request.params.id);
      if (!id.success)
        return reply.code(400).send({ error: "Invalid playlist id" });
      try {
        const removed = await repository.remove(user.id, id.data);
        return removed
          ? reply.code(204).send()
          : reply.code(404).send({ error: "Playlist not found" });
      } catch (error) {
        request.log.error({ err: error }, "Deleting playlist failed");
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );
}
