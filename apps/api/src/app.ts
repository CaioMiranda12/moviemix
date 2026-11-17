import Fastify, { type FastifyInstance } from "fastify";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { type CreateUser } from "./modules/auth/auth.repository.js";

export interface AppOptions {
  checkDatabase?: () => Promise<void>;
  createUser?: CreateUser;
}

export function buildApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: true });

  if (options.createUser) registerAuthRoutes(app, options.createUser);

  app.get("/health", async () => ({ status: "ok" }));

  app.get("/health/ready", async (_request, reply) => {
    if (!options.checkDatabase) {
      return reply.code(503).send({ status: "unavailable" });
    }

    try {
      await options.checkDatabase();
      return { status: "ready", database: "connected" };
    } catch (error) {
      app.log.warn({ err: error }, "Database readiness check failed");
      return reply.code(503).send({ status: "unavailable" });
    }
  });

  return app;
}
