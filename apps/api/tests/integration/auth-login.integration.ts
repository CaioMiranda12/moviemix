import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, describe, expect, it } from "vitest";
import { makeCreateUser } from "../../src/modules/auth/auth.repository.js";
import { makeFindUserByEmail } from "../../src/modules/auth/login.repository.js";
import { makeCreateSession } from "../../src/modules/auth/session.repository.js";
import { makeLoginUser } from "../../src/modules/auth/login.service.js";
import {
  makeStartSession,
  hashSessionToken,
} from "../../src/modules/auth/session.service.js";
import { closeTestDatabase, withRollback } from "../helpers/test-database.js";

afterAll(closeTestDatabase);

describe("Login persistence", () => {
  it("verifies credentials and persists only the session token hash", () =>
    withRollback(async (client) => {
      const db = drizzle(client);
      const email = `${randomUUID()}@example.test`;
      const password = "correct-integration-password";
      const user = await makeCreateUser(db)(email, await argon2.hash(password));
      const login = makeLoginUser(makeFindUserByEmail(db));
      const authenticated = await login({ email, password });
      expect(authenticated.id).toBe(user.id);
      const token = await makeStartSession(makeCreateSession(db))(user.id);
      const result = await client.query<{
        token_hash: string;
        expires_at: Date;
      }>("SELECT token_hash, expires_at FROM sessions WHERE user_id = $1", [
        user.id,
      ]);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.token_hash).toBe(hashSessionToken(token));
      expect(result.rows[0]?.token_hash).not.toBe(token);
      expect(new Date(result.rows[0]!.expires_at).getTime()).toBeGreaterThan(
        Date.now(),
      );
    }));
});
