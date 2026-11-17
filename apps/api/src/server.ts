import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { makeCreateUser } from "./modules/auth/auth.repository.js";
import { makeFindUserByEmail } from "./modules/auth/login.repository.js";
import { makeCreateSession } from "./modules/auth/session.repository.js";
import { buildApp } from "./app.js";

const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;

const db = pool ? drizzle(pool) : null;

const app = buildApp({
  createUser: db ? makeCreateUser(db) : undefined,
  findUserByEmail: db ? makeFindUserByEmail(db) : undefined,
  createSession: db ? makeCreateSession(db) : undefined,
  checkDatabase: pool
    ? async () => {
        await pool.query("SELECT 1");
      }
    : undefined,
});

app.addHook("onClose", async () => {
  if (pool) await pool.end();
});

async function start(): Promise<void> {
  try {
    const port = Number(process.env.PORT ?? 3333);
    await app.listen({ host: "0.0.0.0", port });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
    await app.close();
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close().then(() => {
      process.exitCode = 0;
    });
  });
}

void start();
