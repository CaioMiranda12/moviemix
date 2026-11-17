import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sessions } from "../../db/schema/index.js";

export type CreateSession = (input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) => Promise<void>;

export function makeCreateSession(db: NodePgDatabase): CreateSession {
  return async (input) => {
    await db.insert(sessions).values(input);
  };
}
