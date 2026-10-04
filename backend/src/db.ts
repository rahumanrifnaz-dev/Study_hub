import { Pool, QueryResultRow } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = async <T extends QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T[]> => {
  const result = await pool.query<T>(text, params);
  return result.rows;
};
