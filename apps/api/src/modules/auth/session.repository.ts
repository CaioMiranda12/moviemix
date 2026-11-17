import { and, eq, gt } from "drizzle-orm";
import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sessions, users } from "../../db/schema/index.js";

export type CreateSession = (input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) => Promise<void>;
export type FindSessionUser = (
  tokenHash: string,
) => Promise<{ id: string; email: string } | null>;
export type RevokeSession = (tokenHash: string) => Promise<void>;

export function makeCreateSession(db: NodePgDatabase): CreateSession {
  return async (input) => {
    await db.insert(sessions).values(input);
  };
}

export function makeFindSessionUser(db: NodePgDatabase): FindSessionUser {
  return async (tokenHash) => {
    const rows = await db
      .select({ id: users.id, email: users.email })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  };
}

export function makeRevokeSession(db: NodePgDatabase): RevokeSession {
  return async (tokenHash) => {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  };
}
