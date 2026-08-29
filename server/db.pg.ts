import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

let sqlClient: ReturnType<typeof postgres> | null = null;
let pgDb: ReturnType<typeof drizzle> | null = null;

export function getPgDb() {
  const connectionString =
    process.env.HOROS_PG_DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "HOROS_PG_DATABASE_URL is required",
    );
  }

  if (!sqlClient) {
    sqlClient = postgres(connectionString, {
      max: 5,
      prepare: false,
    });

    pgDb = drizzle(sqlClient);
  }

  return pgDb!;
}

export async function closePgDb() {
  if (sqlClient) {
    await sqlClient.end();
  }

  sqlClient = null;
  pgDb = null;
}
