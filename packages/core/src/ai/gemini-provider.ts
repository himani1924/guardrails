import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ZodType, ZodTypeDef } from 'zod';

import { loadConfig } from '../config';
import {
  AIOutputInvalidError,
  AIProviderError,
  AITimeoutError,
} from '../errors';
import { getLogger } from '../logging';

import { describeSchemaShapeForPrompt, parseCoercedJson } from './gemini-json';
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

const log = getLogger({ component: 'ai.gemini' });

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
/** gemini-embedding-001 default output size */
const DEFAULT_EMBEDDING_DIMENSION = 768;

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
    const anyErr = err as Error & { status?: number; code?: string; statusCode?: number };
    const status = anyErr.status ?? anyErr.statusCode;
    if (status && status >= 500) return true;
    if (status === 429) return true;
    if (anyErr.code === 'ECONNRESET' || anyErr.code === 'ETIMEDOUT') return true;
    const msg = anyErr.message.toLowerCase();
    if (msg.includes('resource_exhausted') || msg.includes('rate limit')) return true;
  }
  return false;
}

function wrap(err: unknown): Error {
  if (err instanceof AITimeoutError || err instanceof AIProviderError) return err;
  if (err instanceof Error) return new AIProviderError(err.message, {}, err);
  return new AIProviderError('Unknown AI provider error');
}

function mapFinishReason(r: string | undefined | null): LLMCompletionResponse['finishReason'] {
  switch ((r ?? '').toUpperCase()) {
    case 'STOP':
      return 'stop';
    case 'MAX_TOKENS':
      return 'length';
    case 'SAFETY':
    case 'RECITATION':
    case 'BLOCKLIST':
    case 'PROHIBITED_CONTENT':
      return 'content_filter';
    default:
      return 'other';
  }
}

function parseJson<T>(
  raw: string,
  schema: ZodType<T, ZodTypeDef, unknown>,
  schemaName: string,
): T {
  const result = parseCoercedJson(raw, schema);
  if (result.ok) return result.data;
  throw new AIOutputInvalidError('LLM output failed schema validation', {
    schemaName,
    issues: result.issues,
    raw: result.rawSlice,
  });
}

function resolveApiKey(explicit?: string): string {
  const cfg = loadConfig();
  const apiKey = explicit ?? cfg.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AIProviderError(
      'GEMINI_API_KEY missing; set LLM_PROVIDER=mock or provide the key',
    );
  }
  return apiKey;
}

export class GeminiLLMProvider implements LLMProvider {
  readonly name = 'gemini';
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    const cfg = loadConfig();
    this.client = new GoogleGenerativeAI(resolveApiKey(opts?.apiKey));
    this.model = opts?.model ?? cfg.GEMINI_LLM_MODEL;
  }

  async complete(req: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const started = Date.now();
    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: req.system,
      generationConfig: {
        temperature: req.temperature ?? 0.2,
        maxOutputTokens: req.maxOutputTokens,
      },
    });

    const res = await withRetry(
      'gemini.complete',
      () => model.generateContent(req.prompt),
      timeoutMs,
    );

    const response = res.response;
    const text = response.text();
    const usage = response.usageMetadata;
    return {
      text,
      model: this.model,
      promptTokens: usage?.promptTokenCount ?? 0,
      completionTokens: usage?.candidatesTokenCount ?? 0,
      latencyMs: Date.now() - started,
      finishReason: mapFinishReason(response.candidates?.[0]?.finishReason?.toString()),
    };
  }

  async completeStructured<T>(
    req: LLMStructuredRequest<T>,
  ): Promise<LLMStructuredResponse<T>> {
    const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const started = Date.now();
    const enumBlock = describeSchemaShapeForPrompt(req.schema as never);
    const systemBase = req.system ?? '';
    const jsonInstruction =
      ` Respond ONLY with a JSON object matching the schema named "${req.schemaName}".` +
      ` Do not include prose or markdown fences.` +
      ` Use exact enum literals (case-sensitive) listed below.` +
      enumBlock;

    let lastError: unknown;
    let prompt = req.prompt;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const model = this.client.getGenerativeModel({
          model: this.model,
          systemInstruction: systemBase + jsonInstruction,
          generationConfig: {
            temperature: req.temperature ?? 0.1,
            maxOutputTokens: req.maxOutputTokens ?? 4096,
            responseMimeType: 'application/json',
          },
        });

        const res = await withRetry(
          'gemini.completeStructured',
          () => model.generateContent(prompt),
          timeoutMs,
        );
        const raw = res.response.text();
        const parsed = parseJson<T>(raw, req.schema, req.schemaName);
        const usage = res.response.usageMetadata;
        return {
          data: parsed,
          model: this.model,
          promptTokens: usage?.promptTokenCount ?? 0,
          completionTokens: usage?.candidatesTokenCount ?? 0,
          latencyMs: Date.now() - started,
        };
      } catch (err) {
        lastError = err;
        if (err instanceof AIOutputInvalidError && attempt < 2) {
          const details = (err as AIOutputInvalidError).details;
          log.warn({ schema: req.schemaName, attempt, details }, 'ai_invalid_retry');
          prompt =
            `${req.prompt}\n\nPREVIOUS_JSON_WAS_INVALID. Fix these validation issues and return corrected JSON only:\n` +
            `${JSON.stringify(details ?? { message: err.message }, null, 2)}`;
          continue;
        }
        throw err;
      }
    }
    throw wrap(lastError);
  }
}

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'gemini';
  readonly dimension: number;
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(opts?: { apiKey?: string; model?: string; dimension?: number }) {
    const cfg = loadConfig();
    this.client = new GoogleGenerativeAI(resolveApiKey(opts?.apiKey));
    this.model = opts?.model ?? cfg.GEMINI_EMBEDDING_MODEL;
    this.dimension = opts?.dimension ?? DEFAULT_EMBEDDING_DIMENSION;
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const started = Date.now();
    const modelName = req.model ?? this.model;
    const model = this.client.getGenerativeModel({ model: modelName });

    const vectors: number[][] = [];
    let promptTokens = 0;

    // Sequential to stay within free-tier RPM; batchEmbedContents is available
    // but per-item embedContent is simpler and reliable across SDK versions.
    for (const text of req.texts) {
      const res = await withRetry(
        'gemini.embed',
        () => model.embedContent(text),
        DEFAULT_TIMEOUT_MS,
      );
      const values = res.embedding.values;
      if (!values?.length) {
        throw new AIProviderError('Gemini embedding returned empty vector');
      }
      vectors.push(Array.from(values));
      promptTokens += Math.ceil(text.length / 4);
    }

    return {
      vectors,
      model: modelName,
      promptTokens,
      latencyMs: Date.now() - started,
    };
  }
}
