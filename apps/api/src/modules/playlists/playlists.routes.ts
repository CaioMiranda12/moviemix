import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  isSameOrigin,
  makeRequireAuth,
} from "../auth/authenticated-session.js";
import type { FindSessionUser } from "../auth/session.repository.js";
import type { PlaylistsRepository } from "./playlists.repository.js";

const idSchema = z.uuid();
const nameSchema = z
  .object({ name: z.string().trim().min(1).max(80) })
  .strict();

export function registerPlaylistsRoutes(
  app: FastifyInstance,
  findSessionUser?: FindSessionUser,
  repository?: PlaylistsRepository,
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
