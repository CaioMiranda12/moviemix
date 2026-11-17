import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { media, userMediaStatuses } from "../../db/schema/index.js";
import type {
  CatalogDetails,
  CatalogMediaType,
} from "../catalog/tmdb.client.js";

export type WatchStatus = "WANT_TO_WATCH" | "WATCHING" | "WATCHED";
export interface WatchStatusItem {
  id: number;
  mediaType: CatalogMediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string;
  status: WatchStatus;
  updatedAt: string;
}
export interface WatchStatusRepository {
  list(userId: string): Promise<WatchStatusItem[]>;
  set(
    userId: string,
    details: CatalogDetails,
    status: WatchStatus,
  ): Promise<void>;
  remove(userId: string, type: CatalogMediaType, id: number): Promise<void>;
}

export function makeWatchStatusRepository(
  db: NodePgDatabase,
): WatchStatusRepository {
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
          status: userMediaStatuses.status,
          updatedAt: userMediaStatuses.updatedAt,
        })
        .from(userMediaStatuses)
        .innerJoin(media, eq(userMediaStatuses.mediaId, media.id))
        .where(eq(userMediaStatuses.userId, userId))
        .orderBy(desc(userMediaStatuses.updatedAt), desc(media.externalId));
      return rows.map((row) => ({
        id: row.externalId,
        mediaType:
          row.mediaType === "MOVIE" ? ("movie" as const) : ("tv" as const),
        title: row.title,
        overview: row.overview ?? "",
        posterPath: row.posterPath,
        releaseDate: row.releaseDate ?? "",
        status: row.status,
        updatedAt: row.updatedAt.toISOString(),
      }));
    },
    async set(userId, details, status) {
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
          .insert(userMediaStatuses)
          .values({ userId, mediaId: item.id, status })
          .onConflictDoUpdate({
            target: [userMediaStatuses.userId, userMediaStatuses.mediaId],
            set: { status, updatedAt: new Date() },
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
        .delete(userMediaStatuses)
        .where(
          and(
            eq(userMediaStatuses.userId, userId),
            eq(userMediaStatuses.mediaId, item.id),
          ),
        );
    },
  };
}
