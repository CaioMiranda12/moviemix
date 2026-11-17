import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { closeTestDatabase, withRollback } from "../helpers/test-database.js";

async function createUser(client: import("pg").PoolClient): Promise<string> {
  const result = await client.query<{ id: string }>(
    "INSERT INTO users (email, password_hash) VALUES ($1, 'test-hash') RETURNING id",
    [`${randomUUID()}@example.test`],
  );
  return result.rows[0]!.id;
}

async function createMedia(client: import("pg").PoolClient): Promise<string> {
  const result = await client.query<{ id: string }>(
    "INSERT INTO media (media_type, external_id, title) VALUES ('MOVIE', $1, 'Test movie') RETURNING id",
    [Math.floor(Math.random() * 1_000_000_000) + 1],
  );
  return result.rows[0]!.id;
}

describe("watch status database constraints", () => {
  afterAll(closeTestDatabase);

  it.each(["WANT_TO_WATCH", "WATCHING", "WATCHED"])(
    "accepts status %s",
    (status) =>
      withRollback(async (client) => {
        const userId = await createUser(client);
        const mediaId = await createMedia(client);
        await client.query(
          "INSERT INTO user_media_statuses (user_id, media_id, status) VALUES ($1, $2, $3)",
          [userId, mediaId, status],
        );
        const result = await client.query<{ status: string }>(
          "SELECT status FROM user_media_statuses WHERE user_id = $1 AND media_id = $2",
          [userId, mediaId],
        );
        expect(result.rows[0]?.status).toBe(status);
      }),
  );

  it("rejects unsupported statuses", () =>
    withRollback(async (client) => {
      const userId = await createUser(client);
      const mediaId = await createMedia(client);
      await expect(
        client.query(
          "INSERT INTO user_media_statuses (user_id, media_id, status) VALUES ($1, $2, $3)",
          [userId, mediaId, "PAUSED"],
        ),
      ).rejects.toMatchObject({ code: "22P02" });
    }));

  it("prevents two statuses for the same user and title", () =>
    withRollback(async (client) => {
      const userId = await createUser(client);
      const mediaId = await createMedia(client);
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

  it("allows changing an existing status", () =>
    withRollback(async (client) => {
      const userId = await createUser(client);
      const mediaId = await createMedia(client);
      await client.query(
        "INSERT INTO user_media_statuses (user_id, media_id, status) VALUES ($1, $2, 'WANT_TO_WATCH')",
        [userId, mediaId],
      );
      await client.query(
        "UPDATE user_media_statuses SET status = 'WATCHING', updated_at = now() WHERE user_id = $1 AND media_id = $2",
        [userId, mediaId],
      );
      const result = await client.query<{ status: string }>(
        "SELECT status FROM user_media_statuses WHERE user_id = $1 AND media_id = $2",
        [userId, mediaId],
      );
      expect(result.rows[0]?.status).toBe("WATCHING");
    }));

  it("keeps statuses independent between users", () =>
    withRollback(async (client) => {
      const firstUserId = await createUser(client);
      const secondUserId = await createUser(client);
      const mediaId = await createMedia(client);
      await client.query(
        "INSERT INTO user_media_statuses (user_id, media_id, status) VALUES ($1, $3, 'WATCHING'), ($2, $3, 'WATCHED')",
        [firstUserId, secondUserId, mediaId],
      );
      const result = await client.query<{ user_id: string; status: string }>(
        "SELECT user_id, status FROM user_media_statuses WHERE media_id = $1",
        [mediaId],
      );
      expect(result.rows).toEqual(
        expect.arrayContaining([
          { user_id: firstUserId, status: "WATCHING" },
          { user_id: secondUserId, status: "WATCHED" },
        ]),
      );
    }));

  it("removes statuses when the user is deleted", () =>
    withRollback(async (client) => {
      const userId = await createUser(client);
      const mediaId = await createMedia(client);
      await client.query(
        "INSERT INTO user_media_statuses (user_id, media_id, status) VALUES ($1, $2, 'WATCHED')",
        [userId, mediaId],
      );
      await client.query("DELETE FROM users WHERE id = $1", [userId]);
      const result = await client.query<{ count: string }>(
        "SELECT count(*) FROM user_media_statuses WHERE media_id = $1",
        [mediaId],
      );
      expect(result.rows[0]?.count).toBe("0");
    }));

  it("rejects a reference to nonexistent media", () =>
    withRollback(async (client) => {
      const userId = await createUser(client);
      await expect(
        client.query(
          "INSERT INTO user_media_statuses (user_id, media_id, status) VALUES ($1, $2, 'WATCHING')",
          [userId, randomUUID()],
        ),
      ).rejects.toMatchObject({ code: "23503" });
    }));
});
