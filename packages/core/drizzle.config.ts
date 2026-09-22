import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgres://guardrail:guardrail@localhost:5432/guardrail',
  },
  verbose: true,
  strict: true,
} satisfies Config;
