import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { media, ratings } from "../../db/schema/index.js";
import type {
  CatalogDetails,
  CatalogMediaType,
} from "../catalog/tmdb.client.js";

export interface RatingItem {
  id: number;
  mediaType: CatalogMediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string;
  score: number;
  updatedAt: string;
}
export interface RatingsRepository {
  list(userId: string): Promise<RatingItem[]>;
  set(userId: string, details: CatalogDetails, score: number): Promise<void>;
  remove(userId: string, type: CatalogMediaType, id: number): Promise<void>;
}

export function makeRatingsRepository(db: NodePgDatabase): RatingsRepository {
  return {
    async list(userId) {
      const rows = await db
        .select({
          externalId: media.externalId,
          mediaType: media.mediaType,
          title: media.title,
          overview: media.overview,
          posterPath: media.posterPath,
          releaseDate: media.releaseDate,
          score: ratings.score,
          updatedAt: ratings.updatedAt,
        })
        .from(ratings)
        .innerJoin(media, eq(ratings.mediaId, media.id))
        .where(eq(ratings.userId, userId))
        .orderBy(desc(ratings.updatedAt), desc(media.externalId));
      return rows.map((row) => ({
        id: row.externalId,
        mediaType:
          row.mediaType === "MOVIE" ? ("movie" as const) : ("tv" as const),
        title: row.title,
        overview: row.overview ?? "",
        posterPath: row.posterPath,
        releaseDate: row.releaseDate ?? "",
        score: row.score,
        updatedAt: row.updatedAt.toISOString(),
      }));
    },
    async set(userId, details, score) {
      await db.transaction(async (tx) => {
        const [item] = await tx
          .insert(media)
          .values({
            provider: "TMDB",
            externalId: details.id,
            mediaType: details.mediaType === "movie" ? "MOVIE" : "TV",
            title: details.title,
            overview: details.overview,
            posterPath: details.posterPath,
            releaseDate: details.releaseDate || null,
            metadataUpdatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [media.provider, media.mediaType, media.externalId],
            set: {
              title: details.title,
              overview: details.overview,
              posterPath: details.posterPath,
              releaseDate: details.releaseDate || null,
              metadataUpdatedAt: new Date(),
            },
          })
          .returning({ id: media.id });
        if (!item) throw new Error("Media upsert failed");
        await tx
          .insert(ratings)
          .values({ userId, mediaId: item.id, score })
          .onConflictDoUpdate({
            target: [ratings.userId, ratings.mediaId],
            set: { score, updatedAt: new Date() },
          });
      });
    },
    async remove(userId, type, id) {
      const [item] = await db
        .select({ id: media.id })
        .from(media)
        .where(
          and(
            eq(media.provider, "TMDB"),
            eq(media.mediaType, type === "movie" ? "MOVIE" : "TV"),
            eq(media.externalId, id),
          ),
        )
        .limit(1);
      if (!item) return;
      await db
        .delete(ratings)
        .where(and(eq(ratings.userId, userId), eq(ratings.mediaId, item.id)));
    },
  };
}
