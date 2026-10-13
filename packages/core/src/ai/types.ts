import type { ZodType, ZodTypeDef } from 'zod';

/**
 * AI provider boundary. Concrete adapters (OpenAI, Mock) live in sibling
 * files under `./ai/`. The rest of the codebase depends only on these
 * interfaces.
 */

export interface LLMCompletionRequest {
  system?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

export interface LLMCompletionResponse {
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  finishReason: 'stop' | 'length' | 'content_filter' | 'other';
}

// `ZodType<T, ZodTypeDef, unknown>` widens the input side of the Zod type so
// schemas containing `.default(...)` or `.optional()` (whose input differs
// from their output) are assignable. `ZodSchema<T>` fixes input = output and
// rejects them.
export interface LLMStructuredRequest<T> extends LLMCompletionRequest {
  schema: ZodType<T, ZodTypeDef, unknown>;
  schemaName: string;
  schemaDescription?: string;
}

export interface LLMStructuredResponse<T> {
  data: T;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

export interface LLMProvider {
  readonly name: string;
  complete(req: LLMCompletionRequest): Promise<LLMCompletionResponse>;
  completeStructured<T>(req: LLMStructuredRequest<T>): Promise<LLMStructuredResponse<T>>;
}

export interface EmbeddingRequest {
  texts: string[];
  model?: string;
}

export interface EmbeddingResponse {
  vectors: number[][];
  model: string;
  promptTokens: number;
  latencyMs: number;
}

export interface EmbeddingProvider {
  readonly name: string;
  readonly dimension: number;
  embed(req: EmbeddingRequest): Promise<EmbeddingResponse>;
}
