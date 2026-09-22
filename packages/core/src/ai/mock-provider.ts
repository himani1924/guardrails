import type { ZodType, ZodTypeDef } from 'zod';

import { AIOutputInvalidError, AIProviderError, AITimeoutError } from '../errors';
import { getLogger } from '../logging';
import type {
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMProvider,
  LLMStructuredRequest,
  LLMStructuredResponse,
} from './types';

const log = getLogger({ component: 'ai.mock' });

/**
 * A programmable mock LLM provider used by tests and by offline demos.
 *
 * It is NOT an AI. It is a deterministic responder that either:
 *   - returns fixtures pre-registered via `setNextResponse` / `respondTo`, or
 *   - falls through to a schema-driven "safe default" that produces the
 *     minimum valid shape for the requested Zod schema.
 *
 * This lets the whole pipeline run end-to-end without an API key while
 * making it obvious in logs and audit trails that the output is a stub.
 */
export class MockLLMProvider implements LLMProvider {
  readonly name = 'mock';

  private queue: unknown[] = [];
  private matchers: {
    match: (req: LLMCompletionRequest | LLMStructuredRequest<unknown>) => boolean;
    response: unknown;
  }[] = [];
  private textQueue: string[] = [];
  private failNextWith?: Error;

  setNextResponse<T>(response: T): void {
    this.queue.push(response);
  }

  respondTo<T>(
    match: (req: LLMCompletionRequest | LLMStructuredRequest<unknown>) => boolean,
    response: T,
  ): void {
    this.matchers.push({ match, response });
  }

  setNextText(text: string): void {
    this.textQueue.push(text);
  }

  failOnce(err: Error): void {
    this.failNextWith = err;
  }

  reset(): void {
    this.queue = [];
    this.matchers = [];
    this.textQueue = [];
    this.failNextWith = undefined;
  }

  async complete(req: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    if (this.failNextWith) {
      const err = this.failNextWith;
      this.failNextWith = undefined;
      throw new AIProviderError('mock forced failure', { name: err.name }, err);
    }
    const matched = this.matchers.find((m) => m.match(req));
    const text =
      typeof matched?.response === 'string'
        ? matched.response
        : (this.textQueue.shift() ?? '');
    log.debug({ hasMatch: Boolean(matched) }, 'mock_complete');
    return {
      text,
      model: 'mock',
      promptTokens: countTokens(req.prompt),
      completionTokens: countTokens(text),
      latencyMs: 0,
      finishReason: 'stop',
    };
  }

  async completeStructured<T>(
    req: LLMStructuredRequest<T>,
  ): Promise<LLMStructuredResponse<T>> {
    if (this.failNextWith) {
      const err = this.failNextWith;
      this.failNextWith = undefined;
      throw new AIProviderError('mock forced failure', { name: err.name }, err);
    }

    let candidate = this.queue.shift();
    if (candidate === undefined) {
      const matched = this.matchers.find((m) => m.match(req));
      candidate = matched?.response;
    }
    if (candidate === undefined) {
      candidate = defaultForSchema(req.schema, req.schemaName);
      // #region agent log
      fetch('http://127.0.0.1:7322/ingest/363266d2-671e-41b8-8614-9660cd345a57',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0685fc'},body:JSON.stringify({sessionId:'0685fc',runId:'post-fix',hypothesisId:'F',location:'packages/core/src/ai/mock-provider.ts:completeStructured',message:'mock using schema default',data:{schemaName:req.schemaName},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    }

    const parsed = req.schema.safeParse(candidate);
    if (!parsed.success) {
      log.warn({ schema: req.schemaName, issues: parsed.error.issues }, 'mock_invalid');
      throw new AIOutputInvalidError('Mock output failed schema validation', {
        schema: req.schemaName,
        issues: parsed.error.issues,
      });
    }

    return {
      data: parsed.data,
      model: 'mock',
      promptTokens: countTokens(req.prompt),
      completionTokens: 32,
      latencyMs: 0,
    };
  }
}

function countTokens(text: string | undefined): number {
  if (!text) return 0;
  // Rough estimate — 4 chars per token. Fine for logging/budget prototypes.
  return Math.ceil(text.length / 4);
}

/** Best-effort minimal valid instance for a Zod schema so an unspecified
 * mock still produces schema-valid output. Not exhaustive — extend as needed. */
export function defaultForSchema<T>(
  schema: ZodType<T, ZodTypeDef, unknown>,
  schemaName?: string,
): T {
  const candidates: unknown[] = [
    {},
    { findings: [], perspectives: [], recommendations: [] },
    {
      overallSentiment: 'neutral',
      tone: 'neutral',
      emotions: [],
      riskSignals: [],
      overallConfidence: 0.5,
    },
    { contextualSignals: [], overallConfidence: 0.5 },
    { perspectives: [], polarizationRisk: 'low' },
    { recommendations: [] },
  ];
  for (const candidate of candidates) {
    const parsed = schema.safeParse(candidate);
    if (parsed.success) return parsed.data;
  }
  throw new AITimeoutError('MockLLMProvider has no default for this schema', { schemaName });
}
