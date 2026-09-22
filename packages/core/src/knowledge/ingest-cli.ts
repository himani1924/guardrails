import { getLogger } from '../logging';
import { closeDb } from '../db/client';

import { DEMO_KB } from './demo-kb';
import { ingestDocument } from './ingest';

const log = getLogger({ component: 'knowledge.ingest-cli' });

async function main(): Promise<void> {
  log.info({ count: DEMO_KB.length }, 'ingesting_demo_kb');
  for (const doc of DEMO_KB) {
    await ingestDocument(doc);
  }
  log.info('demo_kb_ingested');
}

const isEntrypoint =
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;

if (isEntrypoint) {
  main()
    .then(async () => {
      await closeDb();
      process.exit(0);
    })
    .catch(async (err: unknown) => {
      log.error({ err }, 'ingest_failed');
      await closeDb();
      process.exit(1);
    });
}
