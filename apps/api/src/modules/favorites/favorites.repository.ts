import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { favorites, media } from "../../db/schema/index.js";
import type {
  CatalogDetails,
  CatalogMediaType,
} from "../catalog/tmdb.client.js";

export interface FavoriteItem {
  id: number;
  mediaType: CatalogMediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string;
  createdAt: string;
}

export interface FavoritesRepository {
  list(userId: string): Promise<FavoriteItem[]>;
  add(userId: string, details: CatalogDetails): Promise<void>;
  remove(userId: string, type: CatalogMediaType, id: number): Promise<boolean>;
}

export function makeFavoritesRepository(
  db: NodePgDatabase,
): FavoritesRepository {
  return {
    async list(userId) {
      const rows = await db
        .select({
          externalId: media.externalId,
          type: media.mediaType,
          title: media.title,
          overview: media.overview,
          posterPath: media.posterPath,
          releaseDate: media.releaseDate,
          createdAt: favorites.createdAt,
        })
        .from(favorites)
        .innerJoin(media, eq(favorites.mediaId, media.id))
        .where(eq(favorites.userId, userId))
        .orderBy(desc(favorites.createdAt), desc(media.externalId));
      return rows.map((row) => ({
        id: row.externalId,
        mediaType: row.type === "MOVIE" ? "movie" : "tv",
        title: row.title,
        overview: row.overview ?? "",
        posterPath: row.posterPath,
        releaseDate: row.releaseDate ?? "",
        createdAt: row.createdAt.toISOString(),
      }));
    },
    async add(userId, details) {
      await db.transaction(async (tx) => {
        const type = details.mediaType === "movie" ? "MOVIE" : "TV";
        const [item] = await tx
          .insert(media)
          .values({
            provider: "TMDB",
            externalId: details.id,
            mediaType: type,
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
          .insert(favorites)
          .values({ userId, mediaId: item.id })
          .onConflictDoNothing();
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
      if (!item) return false;
      const deleted = await db
        .delete(favorites)
        .where(
          and(eq(favorites.userId, userId), eq(favorites.mediaId, item.id)),
        )
        .returning({ mediaId: favorites.mediaId });
      return deleted.length > 0;
    },
  };
}
