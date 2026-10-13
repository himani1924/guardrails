-- Enable pgvector and move chunk embeddings from double precision[] to vector(768).
-- Old array embeddings (mock = 384 dims, OpenAI = 1536) can't be cast to vector(768),
-- so the column is recreated empty. Chunk text is kept: run `npm run db:reembed`
-- (or re-ingest) afterwards to repopulate embeddings.
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" DROP COLUMN IF EXISTS "embedding";--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD COLUMN "embedding" vector(768);--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD COLUMN IF NOT EXISTS "embedding_model" varchar(150);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_chunks_embedding_hnsw_idx" ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops);
