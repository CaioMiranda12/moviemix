import type { FastifyInstance } from "fastify";
import { makeRequireAuth } from "../auth/authenticated-session.js";
import type { FindSessionUser } from "../auth/session.repository.js";
import type { ProfileStatsRepository } from "./profile-stats.repository.js";

export function registerProfileStatsRoutes(
  app: FastifyInstance,
  findSessionUser?: FindSessionUser,
  repository?: ProfileStatsRepository,
): void {
  if (!findSessionUser || !repository) return;
  const requireAuth = makeRequireAuth(findSessionUser);

  app.get("/profile/stats", async (request, reply) => {
    try {
      const user = await requireAuth(request, reply);
      if (!user) return reply;
      return await repository.get(user.id);
    } catch (error) {
      request.log.error({ err: error }, "Profile statistics lookup failed");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}
