import { makeProfileStatsRepository } from "./modules/profile/profile-stats.repository.js";
import { makeRatingsRepository } from "./modules/ratings/ratings.repository.js";
import { makeWatchStatusRepository } from "./modules/watch-status/watch-status.repository.js";
import { makeFavoritesRepository } from "./modules/favorites/favorites.repository.js";
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { makeCreateUser } from "./modules/auth/auth.repository.js";
import { makeFindUserByEmail } from "./modules/auth/login.repository.js";
import {
  makeCreateSession,
  makeFindSessionUser,
  makeRevokeSession,
} from "./modules/auth/session.repository.js";
import { buildApp } from "./app.js";
import {
  makeSearchCatalog,
  makeGetCatalogDetails,
  makeGetTrendingMovies,
  makeDiscoverByGenre,
  makeFilterCatalog,
} from "./modules/catalog/tmdb.client.js";

import {
  makeCatalogCache,
  cacheCatalogProviders,
} from "./modules/catalog/catalog-cache.js";

const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;

const db = pool ? drizzle(pool) : null;

const tmdbToken = process.env.TMDB_READ_ACCESS_TOKEN?.trim();

const catalog = tmdbToken
  ? cacheCatalogProviders({
      getTrendingMovies: makeGetTrendingMovies(tmdbToken),
      searchCatalog: makeSearchCatalog(tmdbToken),
      getCatalogDetails: makeGetCatalogDetails(tmdbToken),
    })
  : undefined;

const discoveryCache = makeCatalogCache();
const discoverByGenre = tmdbToken ? makeDiscoverByGenre(tmdbToken) : undefined;

const filterCache = makeCatalogCache();
const filterCatalog = tmdbToken ? makeFilterCatalog(tmdbToken) : undefined;

const app = buildApp({
  filterCatalog: filterCatalog
    ? (filters) =>
        filterCache.get(JSON.stringify(["filter", filters]), 10 * 60_000, () =>
          filterCatalog(filters),
        )
    : undefined,
  discoverByGenre: discoverByGenre
    ? (type, genre) =>
        discoveryCache.get(
          JSON.stringify(["discover", type, genre]),
          10 * 60_000,
          () => discoverByGenre(type, genre),
        )
    : undefined,
  getTrendingMovies: catalog?.getTrendingMovies,
  searchCatalog: catalog?.searchCatalog,
  getCatalogDetails: catalog?.getCatalogDetails,
  createUser: db ? makeCreateUser(db) : undefined,
  findUserByEmail: db ? makeFindUserByEmail(db) : undefined,
  createSession: db ? makeCreateSession(db) : undefined,
  findSessionUser: db ? makeFindSessionUser(db) : undefined,
  revokeSession: db ? makeRevokeSession(db) : undefined,
  favoritesRepository: db ? makeFavoritesRepository(db) : undefined,
  watchStatusRepository: db ? makeWatchStatusRepository(db) : undefined,
  ratingsRepository: db ? makeRatingsRepository(db) : undefined,
  profileStatsRepository: db ? makeProfileStatsRepository(db) : undefined,
  checkDatabase: pool
    ? async () => {
        await pool.query("SELECT 1");
      }
    : undefined,
});

app.addHook("onClose", async () => {
  if (pool) await pool.end();
});

async function start(): Promise<void> {
  try {
    const port = Number(process.env.PORT ?? 3333);
    await app.listen({ host: "0.0.0.0", port });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
    await app.close();
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close().then(() => {
      process.exitCode = 0;
    });
  });
}

void start();
