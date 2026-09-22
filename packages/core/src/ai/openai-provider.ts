import OpenAI from 'openai';
import type { ZodType, ZodTypeDef } from 'zod';

import { loadConfig } from '../config';
import {
  AIOutputInvalidError,
  AIProviderError,
  AITimeoutError,
} from '../errors';
import { getLogger } from '../logging';

import type {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMProvider,
  LLMStructuredRequest,
  LLMStructuredResponse,
} from './types';

const log = getLogger({ component: 'ai.openai' });

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

async function withRetry<T>(
  name: string,
  fn: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs, name);
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || attempt === MAX_RETRIES) break;
      const backoff = 250 * 2 ** attempt;
      log.warn({ err, attempt, backoff }, 'ai_retry');
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw wrap(lastErr);
}

function withTimeout<T>(p: Promise<T>, timeoutMs: number, name: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new AITimeoutError(`${name} timed out`)), timeoutMs);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

function isTransient(err: unknown): boolean {
  if (err instanceof AITimeoutError) return true;
  if (err instanceof Error) {
    const anyErr = err as Error & { status?: number; code?: string };
    if (anyErr.status && anyErr.status >= 500) return true;
    if (anyErr.status === 429) return true;
    if (anyErr.code === 'ECONNRESET' || anyErr.code === 'ETIMEDOUT') return true;
  }
  return false;
}

function wrap(err: unknown): Error {
  if (err instanceof AITimeoutError || err instanceof AIProviderError) return err;
  if (err instanceof Error) return new AIProviderError(err.message, {}, err);
  return new AIProviderError('Unknown AI provider error');
}

export class OpenAILLMProvider implements LLMProvider {
  readonly name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    const cfg = loadConfig();
    const apiKey = opts?.apiKey ?? cfg.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AIProviderError(
        'OPENAI_API_KEY missing; set LLM_PROVIDER=mock or provide the key',
      );
    }
    this.client = new OpenAI({ apiKey });
    this.model = opts?.model ?? cfg.OPENAI_LLM_MODEL;
  }

  async complete(req: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const started = Date.now();
    const res = await withRetry(
      'openai.complete',
      () =>
        this.client.chat.completions.create({
          model: this.model,
          temperature: req.temperature ?? 0.2,
          max_tokens: req.maxOutputTokens,
          messages: [
            ...(req.system ? [{ role: 'system' as const, content: req.system }] : []),
            { role: 'user' as const, content: req.prompt },
          ],
        }),
      timeoutMs,
    );
    const choice = res.choices[0];
    return {
      text: choice?.message?.content ?? '',
      model: res.model,
      promptTokens: res.usage?.prompt_tokens ?? 0,
      completionTokens: res.usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - started,
      finishReason: mapFinishReason(choice?.finish_reason),
    };
  }

  async completeStructured<T>(
    req: LLMStructuredRequest<T>,
  ): Promise<LLMStructuredResponse<T>> {
    const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const started = Date.now();

    const systemBase = req.system ?? '';
    const jsonInstruction = ` Respond ONLY with a JSON object matching the schema named "${req.schemaName}". Do not include prose.`;

    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await withRetry(
          'openai.completeStructured',
          () =>
            this.client.chat.completions.create({
              model: this.model,
              temperature: req.temperature ?? 0.1,
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system' as const, content: systemBase + jsonInstruction },
                { role: 'user' as const, content: req.prompt },
              ],
            }),
          timeoutMs,
        );
        const raw = res.choices[0]?.message?.content ?? '';
        const parsed = parseJson<T>(raw, req.schema, req.schemaName);
        return {
          data: parsed,
          model: res.model,
          promptTokens: res.usage?.prompt_tokens ?? 0,
          completionTokens: res.usage?.completion_tokens ?? 0,
          latencyMs: Date.now() - started,
        };
      } catch (err) {
        lastError = err;
        if (err instanceof AIOutputInvalidError && attempt === 0) {
          log.warn({ schema: req.schemaName, err }, 'ai_invalid_retry');
          continue;
        }
        throw err;
      }
    }
    throw wrap(lastError);
  }
}

function parseJson<T>(raw: string, schema: ZodType<T, ZodTypeDef, unknown>, schemaName: string): T {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    throw new AIOutputInvalidError('LLM returned non-JSON', { schemaName, raw: raw.slice(0, 400) });
  }
  const parsed = schema.safeParse(obj);
  if (!parsed.success) {
    throw new AIOutputInvalidError('LLM output failed schema validation', {
      schemaName,
      issues: parsed.error.issues,
    });
  }
  return parsed.data;
}

function mapFinishReason(r: string | undefined | null): LLMCompletionResponse['finishReason'] {
  switch (r) {
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    case 'content_filter':
      return 'content_filter';
    default:
      return 'other';
  }
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';
  readonly dimension: number;
  private client: OpenAI;
  private model: string;

  constructor(opts?: { apiKey?: string; model?: string; dimension?: number }) {
    const cfg = loadConfig();
    const apiKey = opts?.apiKey ?? cfg.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AIProviderError(
        'OPENAI_API_KEY missing; set EMBEDDING_PROVIDER=mock or provide the key',
      );
    }
    this.client = new OpenAI({ apiKey });
    this.model = opts?.model ?? cfg.OPENAI_EMBEDDING_MODEL;
    this.dimension = opts?.dimension ?? 1536;
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const started = Date.now();
    const res = await withRetry(
      'openai.embed',
      () =>
        this.client.embeddings.create({
          model: req.model ?? this.model,
          input: req.texts,
        }),
      DEFAULT_TIMEOUT_MS,
    );
    return {
      vectors: res.data.map((d) => d.embedding),
      model: res.model,
      promptTokens: res.usage?.prompt_tokens ?? 0,
      latencyMs: Date.now() - started,
    };
  }
}
