# Guardrail

Agentic marketing compliance and audience-risk review platform (MVP).

Guardrail helps marketing teams evaluate campaigns **before** publication.
It combines deterministic rules, retrieval-augmented reasoning and typed
agents to surface potential regulatory, cultural, sentiment and brand risks
along with the evidence behind each finding.

See:

- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) — the plan
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — how the pieces fit together
- [docs/RISK_CLASSIFICATION.md](docs/RISK_CLASSIFICATION.md) — how findings become risk levels
- [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) — 5–7 minute demo
- [PROJECT_CONTEXT (1).md](./PROJECT_CONTEXT%20(1).md) — product brief

## Repository layout

```
guardRails/
  apps/
    web/        # Next.js App Router frontend + REST API (Route Handlers)
  packages/
    core/       # Domain, agents, RAG, database, AI infrastructure (TS library)
  docs/         # Architecture and planning documents
  docker-compose.yml  # Postgres 16 + pgvector (recommended)
  scripts/     # One-off DB bootstrap SQL
```

## Requirements

- Node.js **>=20** (developed on Node 24)
- npm **>=10**
- PostgreSQL 16+ **with the pgvector extension** (>= 0.5, for HNSW), either via
  Docker Desktop (compose file provided, `pgvector/pgvector:pg16`) or a local
  install (`brew install pgvector`). Plain Postgres without pgvector will fail
  at `db:migrate` (`CREATE EXTENSION vector`).

## Quick start

```powershell
# 1. Install dependencies
npm install

# 2. Copy environment defaults
Copy-Item .env.example .env

# 3a. Docker path (optional): docker compose up -d postgres
# 3b. Local Postgres path: run scripts/create-db.sql once as the postgres superuser.

# 4. Migrate + seed + ingest knowledge base
npm run db:migrate      # also runs CREATE EXTENSION IF NOT EXISTS vector
npm run db:seed
npm run db:ingest

# 4b. Upgrading an existing database from before pgvector? The 0002 migration
#     recreates knowledge_chunks.embedding as vector(768) (empty). Backfill:
npm run db:reembed

# 5. Type-check + lint everything
npm run verify

# 6. Run the app
npm run dev
```

The app boots on http://localhost:3000. A health probe is available at
`GET /api/health`.

## Scripts

| Command             | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Next.js dev server for `apps/web`                  |
| `npm run build`     | Build all workspaces                               |
| `npm run typecheck` | `tsc --noEmit` in every workspace                  |
| `npm run lint`      | ESLint in every workspace                          |
| `npm run test`      | Vitest in every workspace                          |
| `npm run verify`    | `typecheck` + `lint` + `test`                      |
| `npm run format`    | Prettier write on the whole repo                   |
| `npm run db:generate` | Generate SQL migrations from Drizzle schema      |
| `npm run db:migrate`  | Apply migrations                                 |
| `npm run db:seed`     | Wipe + reinsert demo campaigns                   |
| `npm run db:ingest`   | Ingest the fictional demo knowledge base         |
| `npm run db:reembed`  | Re-embed all existing chunks into pgvector (backfill / provider switch) |
| `npm run db:studio`   | Drizzle Studio                                   |
| `npm run evaluate`    | Run the evaluation harness (STEP 19)             |

## LLM provider

Default: `LLM_PROVIDER=mock`. The mock is programmable and comes with
deterministic fixtures for the four seeded demo campaigns, so the demo runs
reliably without an OpenAI key. To switch to OpenAI:

```env
LLM_PROVIDER=openai
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

## Vector search (pgvector)

Knowledge chunks are stored in `knowledge_chunks.embedding vector(768)` with an
HNSW index (`vector_cosine_ops`). Retrieval (`packages/core/src/knowledge/retriever.ts`)
embeds the query and runs top-k in SQL ordered by `embedding <=> query`
(compliance agent top 6, cultural agent top 4). Score = `1 - cosine distance`.

- **One dimension for every provider.** `EMBEDDING_DIMENSION` (default `768`) is
  sent to OpenAI (`dimensions`, text-embedding-3-* only), Gemini
  (`outputDimensionality`) and the mock embedder. It must equal the column size
  (`KNOWLEDGE_EMBEDDING_DIMENSION` in `db/schema/knowledge.ts`); a mismatch fails
  fast with a clear error.
- **No cross-model comparisons.** Each chunk records `embedding_model`
  (`<provider>:<model>`); retrieval only searches chunks produced by the active
  embedding model. After changing `EMBEDDING_PROVIDER`, run `npm run db:reembed`.
- **Changing the dimension:** edit `KNOWLEDGE_EMBEDDING_DIMENSION` and
  `EMBEDDING_DIMENSION`, run `npm run db:generate`, `npm run db:migrate`, then
  `npm run db:reembed`. pgvector HNSW supports up to 2000 dimensions.
- **Mock embeddings are hash-based**, not semantic: retrieval works mechanically
  but rankings are arbitrary. Use Gemini/OpenAI for meaningful results.
- **Integration test:** `TEST_DATABASE_URL=postgres://... npm test` runs
  `retriever.integration.test.ts` against a migrated database (skipped otherwise).

## Current status

All 21 tasks from `tasks.md` implemented at MVP scope.

