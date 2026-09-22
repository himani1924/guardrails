import type { KnowledgeSourceType } from './enums';

/**
 * A single piece of retrieved supporting material attached to a finding.
 * Evidence is always sourced from the knowledge base — the LLM is never
 * allowed to invent citations.
 */
export interface Evidence {
  id: string;
  findingId: string;
  sourceType: KnowledgeSourceType;
  sourceTitle: string;
  sourceDocumentId: string;
  chunkId?: string;
  excerpt: string;
  relevanceScore: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
