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
    "INSERT INTO media (media_type, external_id, title) VALUES ('MOVIE', $1, 'Rated movie') RETURNING id",
    [Math.floor(Math.random() * 1_000_000_000) + 1],
  );
  return result.rows[0]!.id;
}

describe("ratings database constraints", () => {
  afterAll(closeTestDatabase);

  it.each([1, 2, 3, 4, 5])("accepts rating %i", (score) =>
    withRollback(async (client) => {
      const userId = await createUser(client);
      const mediaId = await createMedia(client);
      await client.query(
        "INSERT INTO ratings (user_id, media_id, score) VALUES ($1, $2, $3)",
        [userId, mediaId, score],
      );
      const result = await client.query<{ score: number }>(
        "SELECT score FROM ratings WHERE user_id = $1 AND media_id = $2",
        [userId, mediaId],
      );
      expect(result.rows[0]?.score).toBe(score);
    }),
  );

  it.each([0, 6, -1])("rejects out-of-range rating %i", (score) =>
    withRollback(async (client) => {
      const userId = await createUser(client);
      const mediaId = await createMedia(client);
      await expect(
        client.query(
          "INSERT INTO ratings (user_id, media_id, score) VALUES ($1, $2, $3)",
          [userId, mediaId, score],
        ),
      ).rejects.toMatchObject({ code: "23514" });
    }),
  );

  it("prevents duplicate ratings for the same user and title", () =>
    withRollback(async (client) => {
      const userId = await createUser(client);
      const mediaId = await createMedia(client);
      await client.query(
        "INSERT INTO ratings (user_id, media_id, score) VALUES ($1, $2, 3)",
        [userId, mediaId],
      );
      await expect(
        client.query(
          "INSERT INTO ratings (user_id, media_id, score) VALUES ($1, $2, 4)",
          [userId, mediaId],
        ),
      ).rejects.toMatchObject({ code: "23505" });
    }));

  it("allows updating an existing rating", () =>
    withRollback(async (client) => {
      const userId = await createUser(client);
      const mediaId = await createMedia(client);
      await client.query(
        "INSERT INTO ratings (user_id, media_id, score) VALUES ($1, $2, 2)",
        [userId, mediaId],
      );
      await client.query(
        "UPDATE ratings SET score = 5, updated_at = now() WHERE user_id = $1 AND media_id = $2",
        [userId, mediaId],
      );
      const result = await client.query<{ score: number }>(
        "SELECT score FROM ratings WHERE user_id = $1 AND media_id = $2",
        [userId, mediaId],
      );
      expect(result.rows[0]?.score).toBe(5);
    }));

  it("keeps ratings independent between users", () =>
    withRollback(async (client) => {
      const firstUserId = await createUser(client);
      const secondUserId = await createUser(client);
      const mediaId = await createMedia(client);
      await client.query(
        "INSERT INTO ratings (user_id, media_id, score) VALUES ($1, $3, 1), ($2, $3, 5)",
        [firstUserId, secondUserId, mediaId],
      );
      const result = await client.query<{ user_id: string; score: number }>(
        "SELECT user_id, score FROM ratings WHERE media_id = $1",
        [mediaId],
      );
      expect(result.rows).toEqual(
        expect.arrayContaining([
          { user_id: firstUserId, score: 1 },
          { user_id: secondUserId, score: 5 },
        ]),
      );
    }));

  it("deletes ratings when their user is deleted", () =>
    withRollback(async (client) => {
      const userId = await createUser(client);
      const mediaId = await createMedia(client);
      await client.query(
        "INSERT INTO ratings (user_id, media_id, score) VALUES ($1, $2, 4)",
        [userId, mediaId],
      );
      await client.query("DELETE FROM users WHERE id = $1", [userId]);
      const result = await client.query<{ count: string }>(
        "SELECT count(*) FROM ratings WHERE media_id = $1",
        [mediaId],
      );
      expect(result.rows[0]?.count).toBe("0");
    }));

  it("rejects references to nonexistent media", () =>
    withRollback(async (client) => {
      const userId = await createUser(client);
      await expect(
        client.query(
          "INSERT INTO ratings (user_id, media_id, score) VALUES ($1, $2, 4)",
          [userId, randomUUID()],
        ),
      ).rejects.toMatchObject({ code: "23503" });
    }));
});
