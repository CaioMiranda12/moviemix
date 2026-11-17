import { registerFavoritesRoutes } from "./modules/favorites/favorites.routes.js";
import type { FavoritesRepository } from "./modules/favorites/favorites.repository.js";
import { registerCatalogRoutes } from "./modules/catalog/catalog.routes.js";
import type {
  GetTrendingMovies,
  GetCatalogDetails,
  SearchCatalog,
} from "./modules/catalog/tmdb.client.js";
import Fastify, { type FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { type FindUserByEmail } from "./modules/auth/login.repository.js";
import {
  type CreateSession,
  type FindSessionUser,
  type RevokeSession,
} from "./modules/auth/session.repository.js";
import { type CreateUser } from "./modules/auth/auth.repository.js";

export interface AppOptions {
  checkDatabase?: () => Promise<void>;
  getTrendingMovies?: GetTrendingMovies;
  searchCatalog?: SearchCatalog;
  getCatalogDetails?: GetCatalogDetails;
  createUser?: CreateUser;
  findUserByEmail?: FindUserByEmail;
  createSession?: CreateSession;
  findSessionUser?: FindSessionUser;
  revokeSession?: RevokeSession;
  favoritesRepository?: FavoritesRepository;
}

export function buildApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: true });

  app.register(async (authApp) => {
    if (options.findUserByEmail && options.createSession) {
      await authApp.register(rateLimit, { global: false });
    }

    registerAuthRoutes(authApp, options);
  });

  registerCatalogRoutes(
    app,
    options.getTrendingMovies,
    options.searchCatalog,
    options.getCatalogDetails,
  );

  registerFavoritesRoutes(
    app,
    options.findSessionUser,
    options.favoritesRepository,
    options.getCatalogDetails,
  );

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
