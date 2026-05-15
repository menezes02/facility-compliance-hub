import { Pool, type QueryResultRow } from "pg";
import { config } from "./config.js";

export const pool = new Pool({
  connectionString: config.databaseUrl
});

export async function query<T extends QueryResultRow>(text: string, params?: unknown[]) {
  return pool.query<T>(text, params);
}
