import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

type Database = NodePgDatabase<typeof schema>;

export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

let pool: pg.Pool | undefined;
let db: Database | undefined;

if (isDatabaseConfigured) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  console.warn(
    "⚠️  DATABASE_URL not set — using in-memory dev store in the API server.",
  );
}

export { pool, db };

// Re-export schema for backwards compatibility
export * from "./schema";
