import fs from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

function readEnvFile(filePath: string): Record<string, string> | null {
  let text: string;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
  const parsed: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

/**
 * Next.js only auto-loads `.env*` from `apps/web`, while seed/migrate use the
 * repo-root file. Fill missing keys from that file so DATABASE_URL is not
 * silently replaced by the default `guardrail` role.
 */
function mergeRepoEnvFile(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '../../.env'),
  ];
  for (const file of candidates) {
    const parsed = readEnvFile(file);
    if (!parsed) continue;
    const merged: NodeJS.ProcessEnv = { ...parsed };
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined && value !== '') merged[key] = value;
    }
    if (env === process.env) {
      for (const [key, value] of Object.entries(parsed)) {
        if (process.env[key] === undefined || process.env[key] === '') {
          process.env[key] = value;
        }
      }
    }
    return merged;
  }
  return env;
}

/**
 * Environment schema. Anything the app reads from `process.env` must be
 * declared here so a missing/typo'd variable fails fast at startup.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  APP_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgres://guardrail:guardrail@localhost:5432/guardrail'),

  LLM_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
  EMBEDDING_PROVIDER: z.enum(['mock', 'openai']).default('mock'),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_LLM_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),

  DEFAULT_REVIEWER_ID: z.string().default('reviewer-demo'),
  DEFAULT_REVIEWER_NAME: z.string().default('Demo Reviewer'),
});

export type AppConfig = z.infer<typeof EnvSchema>;

let cached: AppConfig | undefined;

/**
 * Parse and cache the app config. Callers should treat the result as
 * immutable. `reset()` is provided for tests only.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(mergeRepoEnvFile(env));
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  cached = parsed.data;
  // #region agent log
  fetch('http://127.0.0.1:7322/ingest/363266d2-671e-41b8-8614-9660cd345a57',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0685fc'},body:JSON.stringify({sessionId:'0685fc',runId:'post-fix',hypothesisId:'G',location:'packages/core/src/config/index.ts:loadConfig',message:'resolved AI providers',data:{llmProvider:cached.LLM_PROVIDER,embeddingProvider:cached.EMBEDDING_PROVIDER,hasOpenAiKey:Boolean(cached.OPENAI_API_KEY)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return cached;
}

export function resetConfigForTests(): void {
  cached = undefined;
}
