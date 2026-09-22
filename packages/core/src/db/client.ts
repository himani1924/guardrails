import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { loadConfig } from '../config/index';
import * as schema from './schema/index';

const { Pool } = pg;

let pool: pg.Pool | undefined;
let cachedDb: NodePgDatabase<typeof schema> | undefined;

export function getDbPool(): pg.Pool {
  if (!pool) {
    const cfg = loadConfig();
    pool = new Pool({
      connectionString: cfg.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!cachedDb) {
    cachedDb = drizzle(getDbPool(), { schema });
  }
  return cachedDb;
}

export type Db = ReturnType<typeof getDb>;

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
    cachedDb = undefined;
  }
}

export { schema };
