import { asc, eq } from 'drizzle-orm';

import { getDb } from '../db/client';
import { knowledgeChunks, knowledgeDocuments } from '../db/schema';
import type {
  KnowledgeDocumentRow,
  NewKnowledgeChunkRow,
  NewKnowledgeDocumentRow,
} from '../db/schema';

export async function upsertDocument(doc: NewKnowledgeDocumentRow): Promise<KnowledgeDocumentRow> {
  const db = getDb();
  const [inserted] = await db
    .insert(knowledgeDocuments)
    .values(doc)
    .returning();
  if (!inserted) throw new Error('Failed to insert knowledge document');
  return inserted;
}

export async function replaceChunks(
  documentId: string,
  chunks: Array<Omit<NewKnowledgeChunkRow, 'documentId'>>,
): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(knowledgeChunks).where(eq(knowledgeChunks.documentId, documentId));
    if (chunks.length > 0) {
      await tx.insert(knowledgeChunks).values(
        chunks.map((c) => ({ ...c, documentId })),
      );
    }
  });
}

export async function listDocuments(): Promise<KnowledgeDocumentRow[]> {
  const db = getDb();
  return db.select().from(knowledgeDocuments).orderBy(knowledgeDocuments.title);
}

/** Chunks for the re-embed backfill (`npm run db:reembed`). */
export async function listChunksForReembed(): Promise<Array<{ id: string; content: string }>> {
  const db = getDb();
  return db
    .select({ id: knowledgeChunks.id, content: knowledgeChunks.content })
    .from(knowledgeChunks)
    .orderBy(asc(knowledgeChunks.documentId), asc(knowledgeChunks.ordinal));
}

export async function updateChunkEmbedding(
  chunkId: string,
  embedding: number[],
  embeddingModel: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(knowledgeChunks)
    .set({ embedding, embeddingModel })
    .where(eq(knowledgeChunks.id, chunkId));
}
