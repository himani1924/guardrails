import { loadConfig } from '../config';
import { programDemoFixtures } from '../demo/fixtures';
import { getLogger } from '../logging';

import { MockEmbeddingProvider } from './mock-embedding';
import { MockLLMProvider } from './mock-provider';
import { GeminiEmbeddingProvider, GeminiLLMProvider } from './gemini-provider';
import { OpenAIEmbeddingProvider, OpenAILLMProvider } from './openai-provider';
import type { EmbeddingProvider, LLMProvider } from './types';

const log = getLogger({ component: 'ai.factory' });

let llmSingleton: LLMProvider | undefined;
let embeddingSingleton: EmbeddingProvider | undefined;

export function getLLMProvider(): LLMProvider {
  if (llmSingleton) return llmSingleton;
  const cfg = loadConfig();
  switch (cfg.LLM_PROVIDER) {
    case 'openai':
      log.info({ model: cfg.OPENAI_LLM_MODEL }, 'llm_provider_openai');
      llmSingleton = new OpenAILLMProvider();
      break;
    case 'gemini':
      log.info({ model: cfg.GEMINI_LLM_MODEL }, 'llm_provider_gemini');
      llmSingleton = new GeminiLLMProvider();
      break;
    case 'mock':
    default: {
      log.info('llm_provider_mock');
      const mock = new MockLLMProvider();
      programDemoFixtures(mock);
      llmSingleton = mock;
    }
  }
  return llmSingleton;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  if (embeddingSingleton) return embeddingSingleton;
  const cfg = loadConfig();
  switch (cfg.EMBEDDING_PROVIDER) {
    case 'openai':
      log.info({ model: cfg.OPENAI_EMBEDDING_MODEL }, 'embedding_provider_openai');
      embeddingSingleton = new OpenAIEmbeddingProvider();
      break;
    case 'gemini':
      log.info({ model: cfg.GEMINI_EMBEDDING_MODEL }, 'embedding_provider_gemini');
      embeddingSingleton = new GeminiEmbeddingProvider();
      break;
    case 'mock':
    default:
      log.info('embedding_provider_mock');
      embeddingSingleton = new MockEmbeddingProvider();
  }
  return embeddingSingleton;
}

export function setLLMProviderForTests(p: LLMProvider | undefined): void {
  llmSingleton = p;
}

export function setEmbeddingProviderForTests(p: EmbeddingProvider | undefined): void {
  embeddingSingleton = p;
}
