import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import { users } from "../../db/schema/index.js";

export interface RegisteredUser {
  id: string;
  email: string;
  createdAt: Date;
}

export type CreateUser = (
  email: string,
  passwordHash: string,
) => Promise<RegisteredUser>;

export function makeCreateUser(db: NodePgDatabase): CreateUser {
  return async (email, passwordHash) => {
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash })
      .returning({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
      });
    if (!user) throw new Error("User insert did not return a row");
    return user;
  };
}
