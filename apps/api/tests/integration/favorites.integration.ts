import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { closeTestDatabase, withRollback } from "../helpers/test-database.js";

afterAll(closeTestDatabase);

async function createUser(client: import("pg").PoolClient) {
  const result = await client.query<{ id: string }>(
    "INSERT INTO users (email, password_hash) VALUES ($1, 'test-hash') RETURNING id",
    [`${randomUUID()}@example.test`],
  );
  return result.rows[0]!.id;
}

async function createMedia(client: import("pg").PoolClient) {
  const result = await client.query<{ id: string }>(
    `INSERT INTO media (media_type, external_id, title)
     VALUES ('MOVIE', $1, 'Test movie') RETURNING id`,
    [Math.floor(Math.random() * 1_000_000_000) + 1],
  );
  return result.rows[0]!.id;
}

describe("favorites database constraints", () => {
  it("stores a favorite for a user and a media item", () =>
    withRollback(async (client) => {
      const userId = await createUser(client);
      const mediaId = await createMedia(client);
      await client.query(
        "INSERT INTO favorites (user_id, media_id) VALUES ($1, $2)",
        [userId, mediaId],
      );
      const result = await client.query<{ count: string }>(
        "SELECT count(*) FROM favorites WHERE user_id = $1 AND media_id = $2",
        [userId, mediaId],
      );
      expect(result.rows[0]?.count).toBe("1");
    }));

  it("rejects a duplicate favorite for the same user", () =>
    withRollback(async (client) => {
      const userId = await createUser(client);
      const mediaId = await createMedia(client);
      await client.query(
        "INSERT INTO favorites (user_id, media_id) VALUES ($1, $2)",
        [userId, mediaId],
      );
      await expect(
        client.query(
          "INSERT INTO favorites (user_id, media_id) VALUES ($1, $2)",
          [userId, mediaId],
        ),
      ).rejects.toMatchObject({ code: "23505" });
    }));

  it("allows different users to favorite the same title", () =>
    withRollback(async (client) => {
      const firstUserId = await createUser(client);
      const secondUserId = await createUser(client);
      const mediaId = await createMedia(client);
      await client.query(
        "INSERT INTO favorites (user_id, media_id) VALUES ($1, $2), ($3, $2)",
        [firstUserId, mediaId, secondUserId],
      );
      const result = await client.query<{ count: string }>(
        "SELECT count(*) FROM favorites WHERE media_id = $1",
        [mediaId],
      );
      expect(result.rows[0]?.count).toBe("2");
    }));

  it("removes favorites when the user is deleted", () =>
    withRollback(async (client) => {
      const userId = await createUser(client);
      const mediaId = await createMedia(client);
      await client.query(
        "INSERT INTO favorites (user_id, media_id) VALUES ($1, $2)",
        [userId, mediaId],
      );
      await client.query("DELETE FROM users WHERE id = $1", [userId]);
      const result = await client.query<{ count: string }>(
        "SELECT count(*) FROM favorites WHERE media_id = $1",
        [mediaId],
      );
      expect(result.rows[0]?.count).toBe("0");
    }));

  it("rejects favorites that reference nonexistent media", () =>
    withRollback(async (client) => {
      const userId = await createUser(client);
      await expect(
        client.query(
          "INSERT INTO favorites (user_id, media_id) VALUES ($1, $2)",
          [userId, randomUUID()],
        ),
      ).rejects.toMatchObject({ code: "23503" });
    }));
});
