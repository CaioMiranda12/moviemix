import Fastify, { type FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { type FindUserByEmail } from "./modules/auth/login.repository.js";
import { type CreateSession } from "./modules/auth/session.repository.js";
import { type CreateUser } from "./modules/auth/auth.repository.js";

export interface AppOptions {
  checkDatabase?: () => Promise<void>;
  createUser?: CreateUser;
  findUserByEmail?: FindUserByEmail;
  createSession?: CreateSession;
}

export function buildApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: true });

  app.register(async (authApp) => {
    if (options.findUserByEmail && options.createSession) {
      await authApp.register(rateLimit, { global: false });
    }

    registerAuthRoutes(authApp, options);
  });

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
