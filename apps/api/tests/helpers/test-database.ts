import { Pool, type PoolClient } from "pg";

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) {
  throw new Error("TEST_DATABASE_URL is required for integration tests");
}

const url = new URL(connectionString);
if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
  throw new Error("TEST_DATABASE_URL must use PostgreSQL");
}
if (
  url.pathname !== "/moviemix_test" ||
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.port !== "5434" ||
  url.username !== "moviemix_test"
) {
  throw new Error(
    "Refusing to run: integration tests require moviemix_test on localhost:5434 as moviemix_test",
  );
}

const pool = new Pool({ connectionString, max: 2 });

export async function withRollback(
  run: (client: PoolClient) => Promise<void>,
): Promise<void> {
  const client = await pool.connect();
  try {
    const database = await client.query<{ current_database: string }>(
      "SELECT current_database()",
    );
    if (database.rows[0]?.current_database !== "moviemix_test") {
      throw new Error("Unexpected database: refusing to run integration test");
    }
    await client.query("BEGIN");
    await run(client);
  } finally {
    try {
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  }
}

export async function closeTestDatabase(): Promise<void> {
  await pool.end();
}
