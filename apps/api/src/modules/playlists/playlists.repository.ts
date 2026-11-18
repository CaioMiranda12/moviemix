import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { playlists } from "../../db/schema/index.js";

export type Playlist = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface PlaylistsRepository {
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
  return {
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
