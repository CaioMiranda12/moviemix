import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, describe, expect, it } from "vitest";
import { makeCreateUser } from "../../src/modules/auth/auth.repository.js";
import {
  makeRegisterUser,
  DuplicateEmailError,
} from "../../src/modules/auth/auth.service.js";
import { closeTestDatabase, withRollback } from "../helpers/test-database.js";

afterAll(closeTestDatabase);

describe("User registration persistence", () => {
  it("stores an Argon2id hash and rejects duplicate email", () =>
    withRollback(async (client) => {
      const register = makeRegisterUser(makeCreateUser(drizzle(client)));
      const email = `${randomUUID()}@example.test`;
      const password = "strong-password-for-integration";
      const user = await register({ email, password });
      expect(user.email).toBe(email);
      const result = await client.query<{ password_hash: string }>(
        "SELECT password_hash FROM users WHERE id = $1",
        [user.id],
      );
      const storedHash = result.rows[0]?.password_hash;
      expect(storedHash).toMatch(/^\$argon2id\$/);
      expect(await argon2.verify(storedHash!, password)).toBe(true);
      await expect(
        register({ email: email.toUpperCase(), password }),
      ).rejects.toBeInstanceOf(DuplicateEmailError);
    }));
});
