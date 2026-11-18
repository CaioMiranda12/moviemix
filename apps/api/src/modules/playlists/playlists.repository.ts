import { and, desc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { media, playlistItems, playlists } from "../../db/schema/index.js";

export type Playlist = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PlaylistItem = {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string;
  addedAt: string;
};

export type PlaylistMedia = Omit<PlaylistItem, "addedAt">;

export interface PlaylistsRepository {
  get(userId: string, id: string): Promise<Playlist | null>;
  items(userId: string, id: string): Promise<PlaylistItem[] | null>;
  addItem(
    userId: string,
    id: string,
    item: PlaylistMedia,
  ): Promise<"added" | "duplicate" | "missing">;
  removeItem(
    userId: string,
    id: string,
    type: "movie" | "tv",
    mediaId: number,
  ): Promise<"removed" | "missing" | "not-found">;
  reorderItems(
    userId: string,
    id: string,
    order: Array<{ mediaType: "movie" | "tv"; id: number }>,
  ): Promise<"updated" | "missing" | "mismatch">;
  list(userId: string): Promise<Playlist[]>;
  create(userId: string, name: string): Promise<Playlist>;
  rename(userId: string, id: string, name: string): Promise<Playlist | null>;
  remove(userId: string, id: string): Promise<boolean>;
}

export function makePlaylistsRepository(
  db: NodePgDatabase,
): PlaylistsRepository {
  const columns = {
    id: playlists.id,
    name: playlists.name,
    description: playlists.description,
    createdAt: playlists.createdAt,
    updatedAt: playlists.updatedAt,
  };
  async function owned(userId: string, id: string) {
    const [row] = await db
      .select(columns)
      .from(playlists)
      .where(and(eq(playlists.ownerId, userId), eq(playlists.id, id)))
      .limit(1);
    return row ?? null;
  }
  return {
    get: owned,
    async items(userId, id) {
      if (!(await owned(userId, id))) return null;
      const rows = await db
        .select({
          id: media.externalId,
          mediaType: media.mediaType,
          title: media.title,
          overview: media.overview,
          posterPath: media.posterPath,
          releaseDate: media.releaseDate,
          addedAt: playlistItems.addedAt,
        })
        .from(playlistItems)
        .innerJoin(media, eq(media.id, playlistItems.mediaId))
        .where(eq(playlistItems.playlistId, id))
        .orderBy(playlistItems.position, playlistItems.addedAt);
      return rows.map((row) => ({
        id: row.id,
        mediaType:
          row.mediaType === "MOVIE" ? ("movie" as const) : ("tv" as const),
        title: row.title,
        overview: row.overview ?? "",
        posterPath: row.posterPath,
        releaseDate: row.releaseDate ?? "",
        addedAt: row.addedAt.toISOString(),
      }));
    },
    async addItem(userId, id, item) {
      return db.transaction(async (tx) => {
        // Lock the playlist row to serialize position allocation and deletion.
        const [playlist] = await tx
          .select({ id: playlists.id })
          .from(playlists)
          .where(and(eq(playlists.id, id), eq(playlists.ownerId, userId)))
          .for("update")
          .limit(1);
        if (!playlist) return "missing" as const;
        const [stored] = await tx
          .insert(media)
          .values({
            provider: "TMDB",
            externalId: item.id,
            mediaType: item.mediaType === "movie" ? "MOVIE" : "TV",
            title: item.title,
            overview: item.overview,
            posterPath: item.posterPath,
            releaseDate: item.releaseDate || null,
            metadataUpdatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [media.provider, media.mediaType, media.externalId],
            set: {
              title: item.title,
              overview: item.overview,
              posterPath: item.posterPath,
              releaseDate: item.releaseDate || null,
              metadataUpdatedAt: new Date(),
            },
          })
          .returning({ id: media.id });
        if (!stored) throw new Error("Media upsert failed");
        const [last] = await tx
          .select({
            next: sql<number>`coalesce(max(${playlistItems.position}) + 1, 0)::int`,
          })
          .from(playlistItems)
          .where(eq(playlistItems.playlistId, id));
        const inserted = await tx
          .insert(playlistItems)
          .values({
            playlistId: id,
            mediaId: stored.id,
            position: last?.next ?? 0,
          })
          .onConflictDoNothing()
          .returning({ id: playlistItems.id });
        return inserted.length ? ("added" as const) : ("duplicate" as const);
      });
    },
    async removeItem(userId, id, type, mediaId) {
      if (!(await owned(userId, id))) return "missing";
      const deleted = await db
        .delete(playlistItems)
        .where(
          and(
            eq(playlistItems.playlistId, id),
            eq(
              playlistItems.mediaId,
              sql`(select id from media where provider = 'TMDB' and media_type = ${type === "movie" ? "MOVIE" : "TV"} and external_id = ${mediaId})`,
            ),
          ),
        )
        .returning({ id: playlistItems.id });
      return deleted.length ? "removed" : "not-found";
    },
    async reorderItems(userId, id, order) {
      return db.transaction(async (tx) => {
        const [playlist] = await tx
          .select({ id: playlists.id })
          .from(playlists)
          .where(and(eq(playlists.id, id), eq(playlists.ownerId, userId)))
          .for("update")
          .limit(1);
        if (!playlist) return "missing" as const;
        const current = await tx
          .select({
            itemId: playlistItems.id,
            externalId: media.externalId,
            mediaType: media.mediaType,
          })
          .from(playlistItems)
          .innerJoin(media, eq(media.id, playlistItems.mediaId))
          .where(eq(playlistItems.playlistId, id));
        if (current.length !== order.length) return "mismatch" as const;
        const key = (type: string, externalId: number) =>
          `${type}:${externalId}`;
        const byKey = new Map(
          current.map((row) => [
            key(row.mediaType === "MOVIE" ? "movie" : "tv", row.externalId),
            row.itemId,
          ]),
        );
        if (byKey.size !== order.length) return "mismatch" as const;
        const used = new Set<string>();
        for (const entry of order) {
          const itemKey = key(entry.mediaType, entry.id);
          if (used.has(itemKey) || !byKey.has(itemKey))
            return "mismatch" as const;
          used.add(itemKey);
        }
        for (const [position, entry] of order.entries()) {
          await tx
            .update(playlistItems)
            .set({ position })
            .where(
              eq(playlistItems.id, byKey.get(key(entry.mediaType, entry.id))!),
            );
        }
        return "updated" as const;
      });
    },
    async list(userId) {
      return db
        .select(columns)
        .from(playlists)
        .where(eq(playlists.ownerId, userId))
        .orderBy(desc(playlists.createdAt));
    },
    async create(userId, name) {
      const [created] = await db
        .insert(playlists)
        .values({ ownerId: userId, name, visibility: "PRIVATE" })
        .returning(columns);
      return created!;
    },
    async rename(userId, id, name) {
      const [updated] = await db
        .update(playlists)
        .set({ name, updatedAt: new Date() })
        .where(and(eq(playlists.ownerId, userId), eq(playlists.id, id)))
        .returning(columns);
      return updated ?? null;
    },
    async remove(userId, id) {
      const removed = await db
        .delete(playlists)
        .where(and(eq(playlists.ownerId, userId), eq(playlists.id, id)))
        .returning({ id: playlists.id });
      return removed.length > 0;
    },
  };
}
