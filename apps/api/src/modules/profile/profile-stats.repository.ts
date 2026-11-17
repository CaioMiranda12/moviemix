import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  favorites,
  ratings,
  userMediaStatuses,
} from "../../db/schema/index.js";

export interface ProfileStats {
  favorites: number;
  wantToWatch: number;
  watching: number;
  watched: number;
  ratings: number;
  averageRating: number | null;
}

export interface ProfileStatsRepository {
  get(userId: string): Promise<ProfileStats>;
}

export function makeProfileStatsRepository(
  db: NodePgDatabase,
): ProfileStatsRepository {
  return {
    async get(userId) {
      const [favoriteRows, statusRows, ratingRows] = await Promise.all([
        db
          .select({ total: sql<number>`count(*)::int` })
          .from(favorites)
          .where(eq(favorites.userId, userId)),
        db
          .select({
            wantToWatch: sql<number>`count(*) filter (where ${userMediaStatuses.status} = 'WANT_TO_WATCH')::int`,
            watching: sql<number>`count(*) filter (where ${userMediaStatuses.status} = 'WATCHING')::int`,
            watched: sql<number>`count(*) filter (where ${userMediaStatuses.status} = 'WATCHED')::int`,
          })
          .from(userMediaStatuses)
          .where(eq(userMediaStatuses.userId, userId)),
        db
          .select({
            total: sql<number>`count(*)::int`,
            average: sql<
              number | null
            >`round(avg(${ratings.score})::numeric, 2)::float8`,
          })
          .from(ratings)
          .where(eq(ratings.userId, userId)),
      ]);
      return {
        favorites: favoriteRows[0]?.total ?? 0,
        wantToWatch: statusRows[0]?.wantToWatch ?? 0,
        watching: statusRows[0]?.watching ?? 0,
        watched: statusRows[0]?.watched ?? 0,
        ratings: ratingRows[0]?.total ?? 0,
        averageRating: ratingRows[0]?.average ?? null,
      };
    },
  };
}
