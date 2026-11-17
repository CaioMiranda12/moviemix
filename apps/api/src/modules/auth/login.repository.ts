import { eq } from "drizzle-orm";
import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import { users } from "../../db/schema/index.js";

export interface LoginUser {
  id: string;
  email: string;
  passwordHash: string;
}

export type FindUserByEmail = (email: string) => Promise<LoginUser | null>;

export function makeFindUserByEmail(db: NodePgDatabase): FindUserByEmail {
  return async (email) => {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user ?? null;
  };
}
