import Fastify, { type FastifyInstance } from "fastify";

export interface AppOptions {
  checkDatabase?: () => Promise<void>;
}

export function buildApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: true });

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
