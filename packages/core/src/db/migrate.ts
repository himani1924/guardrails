import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { getLogger } from '../logging/index';
import { closeDb, getDb } from './client';

const log = getLogger({ component: 'db.migrate' });

export async function runMigrations(migrationsFolder?: string): Promise<void> {
  const folder =
    migrationsFolder ??
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'drizzle');
  log.info({ folder }, 'applying_migrations');
  const db = getDb();
  await migrate(db, { migrationsFolder: folder });
  log.info('migrations_applied');
}

const isEntrypoint =
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;

if (isEntrypoint) {
  runMigrations()
    .then(async () => {
      await closeDb();
      process.exit(0);
    })
    .catch(async (err: unknown) => {
      log.error({ err }, 'migration_failed');
      await closeDb();
      process.exit(1);
    });
}
