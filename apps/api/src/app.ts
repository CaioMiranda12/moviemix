import { registerPlaylistsRoutes } from "./modules/playlists/playlists.routes.js";
import type { PlaylistsRepository } from "./modules/playlists/playlists.repository.js";
import { registerProfileStatsRoutes } from "./modules/profile/profile-stats.routes.js";
import type { ProfileStatsRepository } from "./modules/profile/profile-stats.repository.js";
import { registerRatingsRoutes } from "./modules/ratings/ratings.routes.js";
import type { RatingsRepository } from "./modules/ratings/ratings.repository.js";
import { registerWatchStatusRoutes } from "./modules/watch-status/watch-status.routes.js";
import type { WatchStatusRepository } from "./modules/watch-status/watch-status.repository.js";
import { registerFavoritesRoutes } from "./modules/favorites/favorites.routes.js";
import type { FavoritesRepository } from "./modules/favorites/favorites.repository.js";
import { registerCatalogRoutes } from "./modules/catalog/catalog.routes.js";
import type {
  GetTrendingMovies,
  GetCatalogDetails,
  SearchCatalog,
  DiscoverByGenre,
  FilterCatalog,
  FilterCatalogPage,
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
  discoverByGenre?: DiscoverByGenre;
  filterCatalog?: FilterCatalog;
  filterCatalogPage?: FilterCatalogPage;
  createUser?: CreateUser;
  findUserByEmail?: FindUserByEmail;
  createSession?: CreateSession;
  findSessionUser?: FindSessionUser;
  revokeSession?: RevokeSession;
  favoritesRepository?: FavoritesRepository;
  watchStatusRepository?: WatchStatusRepository;
  ratingsRepository?: RatingsRepository;
  profileStatsRepository?: ProfileStatsRepository;
  playlistsRepository?: PlaylistsRepository;
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
    options.discoverByGenre,
    options.filterCatalog,
    options.filterCatalogPage,
  );

  registerFavoritesRoutes(
    app,
    options.findSessionUser,
    options.favoritesRepository,
    options.getCatalogDetails,
  );

  registerWatchStatusRoutes(
    app,
    options.findSessionUser,
    options.watchStatusRepository,
    options.getCatalogDetails,
  );

  registerRatingsRoutes(
    app,
    options.findSessionUser,
    options.ratingsRepository,
    options.getCatalogDetails,
  );

  registerPlaylistsRoutes(
    app,
    options.findSessionUser,
    options.playlistsRepository,
  );

  registerProfileStatsRoutes(
    app,
    options.findSessionUser,
    options.profileStatsRepository,
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
