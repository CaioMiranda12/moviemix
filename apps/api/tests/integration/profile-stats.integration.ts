import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, describe, expect, it } from "vitest";
import { makeProfileStatsRepository } from "../../src/modules/profile/profile-stats.repository.js";
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
    "INSERT INTO media (media_type, external_id, title) VALUES ('MOVIE', $1, 'Stats movie') RETURNING id",
    [Math.floor(Math.random() * 1_000_000_000) + 1],
  );
  return result.rows[0]!.id;
}

describe("profile statistics repository", () => {
  afterAll(closeTestDatabase);

  it("returns zero counts and null average for an empty profile", () =>
    withRollback(async (client) => {
      const userId = await createUser(client);
      const repo = makeProfileStatsRepository(drizzle(client));
      expect(await repo.get(userId)).toEqual({
        favorites: 0,
        wantToWatch: 0,
        watching: 0,
        watched: 0,
        ratings: 0,
        averageRating: null,
      });
    }));

  it("counts each status and calculates the average without double counting", () =>
    withRollback(async (client) => {
      const userId = await createUser(client);
      const ids = await Promise.all(
        Array.from({ length: 4 }, () => createMedia(client)),
      );
      await client.query(
        "INSERT INTO favorites (user_id, media_id) VALUES ($1, $2), ($1, $3)",
        [userId, ids[0], ids[1]],
      );
      for (const [index, status] of [
        "WANT_TO_WATCH",
        "WATCHING",
        "WATCHED",
        "WATCHED",
      ].entries()) {
        await client.query(
          "INSERT INTO user_media_statuses (user_id, media_id, status) VALUES ($1, $2, $3)",
          [userId, ids[index], status],
        );
      }
      await client.query(
        "INSERT INTO ratings (user_id, media_id, score) VALUES ($1, $2, 4), ($1, $3, 5)",
        [userId, ids[0], ids[1]],
      );
      const repo = makeProfileStatsRepository(drizzle(client));
      expect(await repo.get(userId)).toEqual({
        favorites: 2,
        wantToWatch: 1,
        watching: 1,
        watched: 2,
        ratings: 2,
        averageRating: 4.5,
      });
    }));

  it("does not include another user's favorites, statuses or ratings", () =>
    withRollback(async (client) => {
      const userId = await createUser(client);
      const otherUserId = await createUser(client);
      const mediaId = await createMedia(client);
      await client.query(
        "INSERT INTO favorites (user_id, media_id) VALUES ($1, $2)",
        [otherUserId, mediaId],
      );
      await client.query(
        "INSERT INTO user_media_statuses (user_id, media_id, status) VALUES ($1, $2, 'WATCHING')",
        [otherUserId, mediaId],
      );
      await client.query(
        "INSERT INTO ratings (user_id, media_id, score) VALUES ($1, $2, 5)",
        [otherUserId, mediaId],
      );
      const repo = makeProfileStatsRepository(drizzle(client));
      expect(await repo.get(userId)).toEqual({
        favorites: 0,
        wantToWatch: 0,
        watching: 0,
        watched: 0,
        ratings: 0,
        averageRating: null,
      });
    }));
});
