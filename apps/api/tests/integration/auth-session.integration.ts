import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, describe, expect, it } from "vitest";
import { makeCreateUser } from "../../src/modules/auth/auth.repository.js";
import {
  makeCreateSession,
  makeFindSessionUser,
  makeRevokeSession,
} from "../../src/modules/auth/session.repository.js";
import {
  hashSessionToken,
  makeStartSession,
} from "../../src/modules/auth/session.service.js";
import { closeTestDatabase, withRollback } from "../helpers/test-database.js";

afterAll(closeTestDatabase);
describe("Session persistence", () => {
  it("looks up active sessions, rejects expired sessions and revokes tokens", () =>
    withRollback(async (client) => {
      const db = drizzle(client);
      const user = await makeCreateUser(db)(
        `${randomUUID()}@example.test`,
        await argon2.hash("integration-password"),
      );
      const create = makeCreateSession(db);
      const find = makeFindSessionUser(db);
      const revoke = makeRevokeSession(db);
      const token = await makeStartSession(create)(user.id);
      expect(await find(hashSessionToken(token))).toEqual({
        id: user.id,
        email: user.email,
      });
      expect(await find(hashSessionToken("invalid"))).toBeNull();
      await revoke(hashSessionToken(token));
      expect(await find(hashSessionToken(token))).toBeNull();
      await create({
        userId: user.id,
        tokenHash: hashSessionToken("expired"),
        expiresAt: new Date(Date.now() - 1000),
      });
      expect(await find(hashSessionToken("expired"))).toBeNull();
    }));
});
