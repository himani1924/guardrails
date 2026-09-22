import { loadConfig } from '../config';
import { programDemoFixtures } from '../demo/fixtures';
import { getLogger } from '../logging';

import { MockEmbeddingProvider } from './mock-embedding';
import { MockLLMProvider } from './mock-provider';
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
    case 'mock':
    default: {
      try {
        log.info('llm_provider_mock');
      } catch (err) {
        // #region agent log
        fetch('http://127.0.0.1:7322/ingest/363266d2-671e-41b8-8614-9660cd345a57',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0685fc'},body:JSON.stringify({sessionId:'0685fc',runId:'pre-fix',hypothesisId:'C',location:'packages/core/src/ai/factory.ts:getLLMProvider',message:'log.info threw in getLLMProvider',data:{errorMessage:err instanceof Error ? err.message : String(err),provider:cfg.LLM_PROVIDER},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        throw err;
      }
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
