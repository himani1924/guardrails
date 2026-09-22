import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { MockLLMProvider } from '../ai/mock-provider';
import { AIOutputInvalidError, AIProviderError } from '../errors';

const schema = z.object({ ok: z.boolean(), n: z.number() });

describe('MockLLMProvider', () => {
  it('returns a queued response for completeStructured', async () => {
    const mock = new MockLLMProvider();
    mock.setNextResponse({ ok: true, n: 42 });
    const res = await mock.completeStructured({
      schemaName: 'X',
      schema,
      prompt: 'p',
    });
    expect(res.data).toEqual({ ok: true, n: 42 });
    expect(res.model).toBe('mock');
  });

  it('rejects a queued response that fails schema validation', async () => {
    const mock = new MockLLMProvider();
    mock.setNextResponse({ ok: 'yes', n: 'x' });
    await expect(
      mock.completeStructured({ schemaName: 'X', schema, prompt: 'p' }),
    ).rejects.toBeInstanceOf(AIOutputInvalidError);
  });

  it('uses matchers when no queue is set', async () => {
    const mock = new MockLLMProvider();
    mock.respondTo(
      (req) => 'schemaName' in req && req.schemaName === 'X',
      { ok: true, n: 1 },
    );
    const res = await mock.completeStructured({ schemaName: 'X', schema, prompt: 'p' });
    expect(res.data).toEqual({ ok: true, n: 1 });
  });

  it('falls back to a valid default for sentiment-shaped schemas', async () => {
    const mock = new MockLLMProvider();
    const sentiment = z.object({
      overallSentiment: z.enum(['positive', 'neutral', 'mixed', 'negative']),
      tone: z.string(),
      emotions: z.array(z.string()),
      riskSignals: z.array(z.unknown()),
      overallConfidence: z.number(),
    });
    const res = await mock.completeStructured({
      schemaName: 'SentimentAnalysis',
      schema: sentiment,
      prompt: 'p',
    });
    expect(res.data.overallSentiment).toBe('neutral');
    expect(res.data.riskSignals).toEqual([]);
  });

  it('propagates forced failures as AIProviderError', async () => {
    const mock = new MockLLMProvider();
    mock.failOnce(new Error('boom'));
    await expect(
      mock.completeStructured({ schemaName: 'X', schema, prompt: 'p' }),
    ).rejects.toBeInstanceOf(AIProviderError);
  });
});
