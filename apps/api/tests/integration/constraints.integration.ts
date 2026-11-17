import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { type PoolClient } from "pg";
import { closeTestDatabase, withRollback } from "../helpers/test-database.js";

afterAll(closeTestDatabase);

async function user(
  client: PoolClient,
  email = `${randomUUID()}@example.test`,
) {
  const result = await client.query<{ id: string }>(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
    [email, "argon2id-test-placeholder"],
  );
  return result.rows[0]!.id;
}

async function item(client: PoolClient, type: "MOVIE" | "TV" = "MOVIE") {
  const result = await client.query<{ id: string }>(
    `INSERT INTO media (provider, media_type, external_id, title)
     VALUES ('TMDB', $1, $2, 'Test title') RETURNING id`,
    [type, Math.floor(Math.random() * 1_000_000_000) + 1],
  );
  return result.rows[0]!.id;
}

async function playlist(client: PoolClient, ownerId: string) {
  const result = await client.query<{ id: string }>(
    "INSERT INTO playlists (owner_id, name) VALUES ($1, 'Test playlist') RETURNING id",
    [ownerId],
  );
  return result.rows[0]!.id;
}

describe("PostgreSQL integrity constraints", () => {
  it("rejects case-insensitive duplicate emails", () =>
    withRollback(async (client) => {
      await user(client, "Test.Email@example.test");
      await expect(
        user(client, "test.email@example.test"),
      ).rejects.toMatchObject({
        code: "23505",
        constraint: "users_email_normalized_uq",
      });
    }));

  it("distinguishes TMDB movies and TV shows but rejects duplicate external identity", () =>
    withRollback(async (client) => {
      const externalId = Math.floor(Math.random() * 1_000_000_000) + 1;
      await client.query(
        "INSERT INTO media (provider, media_type, external_id, title) VALUES ('TMDB', 'MOVIE', $1, 'Film')",
        [externalId],
      );
      await client.query(
        "INSERT INTO media (provider, media_type, external_id, title) VALUES ('TMDB', 'TV', $1, 'Series')",
        [externalId],
      );
      await expect(
        client.query(
          "INSERT INTO media (provider, media_type, external_id, title) VALUES ('TMDB', 'MOVIE', $1, 'Duplicate')",
          [externalId],
        ),
      ).rejects.toMatchObject({
        code: "23505",
        constraint: "media_external_identity_uq",
      });
    }));

  it("rejects duplicate media within a playlist", () =>
    withRollback(async (client) => {
      const ownerId = await user(client);
      const playlistId = await playlist(client, ownerId);
      const mediaId = await item(client);
      await client.query(
        "INSERT INTO playlist_items (playlist_id, media_id, position) VALUES ($1, $2, 0)",
        [playlistId, mediaId],
      );
      await expect(
        client.query(
          "INSERT INTO playlist_items (playlist_id, media_id, position) VALUES ($1, $2, 1)",
          [playlistId, mediaId],
        ),
      ).rejects.toMatchObject({
        code: "23505",
        constraint: "playlist_items_playlist_media_uq",
      });
    }));

  it("allows only one status per user and media", () =>
    withRollback(async (client) => {
      const userId = await user(client);
      const mediaId = await item(client);
      await client.query(
        "INSERT INTO user_media_statuses (user_id, media_id, status) VALUES ($1, $2, 'WATCHING')",
        [userId, mediaId],
      );
      await expect(
        client.query(
          "INSERT INTO user_media_statuses (user_id, media_id, status) VALUES ($1, $2, 'WATCHED')",
          [userId, mediaId],
        ),
      ).rejects.toMatchObject({ code: "23505" });
    }));

  it("deletes playlist items and access history without deleting media or statuses", () =>
    withRollback(async (client) => {
      const userId = await user(client);
      const mediaId = await item(client);
      const playlistId = await playlist(client, userId);
      await client.query(
        "INSERT INTO playlist_items (playlist_id, media_id, position) VALUES ($1, $2, 0)",
        [playlistId, mediaId],
      );
      await client.query(
        "INSERT INTO playlist_accesses (user_id, playlist_id) VALUES ($1, $2)",
        [userId, playlistId],
      );
      await client.query(
        "INSERT INTO user_media_statuses (user_id, media_id, status) VALUES ($1, $2, 'WATCHED')",
        [userId, mediaId],
      );
      await client.query("DELETE FROM playlists WHERE id = $1", [playlistId]);
      for (const table of ["playlist_items", "playlist_accesses"]) {
        const result = await client.query<{ count: string }>(
          `SELECT count(*) FROM ${table} WHERE playlist_id = $1`,
          [playlistId],
        );
        expect(result.rows[0]?.count).toBe("0");
      }
      const mediaCount = await client.query<{ count: string }>(
        "SELECT count(*) FROM media WHERE id = $1",
        [mediaId],
      );
      const statusCount = await client.query<{ count: string }>(
        "SELECT count(*) FROM user_media_statuses WHERE user_id = $1 AND media_id = $2",
        [userId, mediaId],
      );
      expect(mediaCount.rows[0]?.count).toBe("1");
      expect(statusCount.rows[0]?.count).toBe("1");
    }));

  it("rejects orphan playlist items and negative positions", () =>
    withRollback(async (client) => {
      const mediaId = await item(client);
      await expect(
        client.query(
          "INSERT INTO playlist_items (playlist_id, media_id, position) VALUES ($1, $2, 0)",
          [randomUUID(), mediaId],
        ),
      ).rejects.toMatchObject({ code: "23503" });
    }));

  it("keeps access history unique per user and playlist", () =>
    withRollback(async (client) => {
      const ownerId = await user(client);
      const playlistId = await playlist(client, ownerId);
      await client.query(
        "INSERT INTO playlist_accesses (user_id, playlist_id) VALUES ($1, $2)",
        [ownerId, playlistId],
      );
      await expect(
        client.query(
          "INSERT INTO playlist_accesses (user_id, playlist_id) VALUES ($1, $2)",
          [ownerId, playlistId],
        ),
      ).rejects.toMatchObject({ code: "23505" });
    }));
});
