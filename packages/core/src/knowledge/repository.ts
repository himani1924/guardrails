import { eq, inArray } from 'drizzle-orm';

import { getDb } from '../db/client';
import { knowledgeChunks, knowledgeDocuments } from '../db/schema';
import type {
  KnowledgeChunkRow,
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

export async function loadAllChunks(): Promise<{
  chunks: KnowledgeChunkRow[];
  docsById: Map<string, KnowledgeDocumentRow>;
}> {
  const db = getDb();
  const chunks = await db.select().from(knowledgeChunks);
  const docIds = Array.from(new Set(chunks.map((c) => c.documentId)));
  const docs = docIds.length
    ? await db.select().from(knowledgeDocuments).where(inArray(knowledgeDocuments.id, docIds))
    : [];
  return { chunks, docsById: new Map(docs.map((d) => [d.id, d])) };
}
