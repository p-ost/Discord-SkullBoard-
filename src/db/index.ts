import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

declare global {
  var _postgresPool: Pool | undefined;
}

const pool = global._postgresPool || new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});

if (process.env.NODE_ENV !== 'production') {
  global._postgresPool = pool;
}

export const db = drizzle(pool, { schema });
