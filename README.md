# Guardrail

Guardrail is an agentic marketing compliance and audience-risk review platform (MVP).

Guardrail helps marketing teams check campaigns **before** publication. It surfaces potential regulatory, cultural, sentiment and brand risks, together with the evidence behind each finding. Under the hood it uses three layers:

- deterministic rules;
- retrieval-augmented reasoning over a pgvector knowledge base;
- typed, schema-validated AI agents.

A human reviewer always makes the final decision.

## Repository layout

```
guardRails/
  apps/
    web/        # Next.js 15 App Router UI + REST API (Route Handlers)
  packages/
    core/       # Domain, rules, agents, RAG (pgvector), DB (Drizzle), AI providers
      drizzle/  # SQL migrations (0000, 0001, 0002_pgvector)
  docker-compose.yml  # Postgres 16 + pgvector (pgvector/pgvector:pg16)
  scripts/            # One-off DB bootstrap SQL (create-db.sql)
```

## How an analysis runs

`POST /api/campaigns/:id/analyze` → `packages/core/src/analyses/orchestrator.ts` runs these steps in order:

1. **Rule engine.** 6 deterministic rules: disclaimer, discount format, influencer `#ad`, health claims, festival line, metadata.
2. **Compliance agent.** Retrieves the top 6 chunks from internal_policy, brand_guideline, approved_claim and regulatory docs.
3. **Sentiment agent.**
4. **Cultural agent.** Runs only when a festival is set. Retrieves the top 4 chunks from brand_guideline and internal_policy docs.
5. **Audience perspective agent.**
6. **Deterministic risk aggregator.** Produces 6 dimensions and no single score.
7. **Recommendation agent.** Followed by a deterministic gap-fill.
8. **Persist and audit.** Everything is written in one transaction; the campaign moves to `in_review` or `analyzed`.

Agents may only cite retrieved sources. Unknown citations are dropped.

## Requirements

- Node.js **>=20** (developed on Node 24) and npm **>=10**.
- PostgreSQL 16+ **with the pgvector extension** (version 0.5 or later, for HNSW). `db:migrate` runs `CREATE EXTENSION IF NOT EXISTS vector` and fails on Postgres without pgvector. Two options:
  - **Docker (recommended):** `docker compose up -d postgres` uses `pgvector/pgvector:pg16` on port 5432. Stop any other local Postgres on 5432 first, e.g. `brew services stop postgresql@14`.
  - **Homebrew / local Postgres:** install pgvector for your server version (e.g. `brew install pgvector`), then run `scripts/create-db.sql` once as a superuser. A stock Homebrew `postgresql@14` does not ship pgvector.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Environment (never commit .env)
cp .env.example .env

# 3. Database with pgvector (see Requirements)
docker compose up -d postgres

# 4. Migrate + seed + ingest knowledge base
npm run db:migrate      # includes CREATE EXTENSION vector + HNSW index
npm run db:seed         # wipes + inserts 8 audience personas and 7 demo campaigns
npm run db:ingest       # chunks + embeds the fictional demo KB into pgvector

# 4b. Upgrading a database created before pgvector (migration 0002)?
#     0002 recreates knowledge_chunks.embedding as vector(768) (empty) and keeps chunk text.
npm run db:reembed

# 5. Type-check + lint + test
npm run verify

# 6. Run the app
npm run dev             # http://localhost:3000, health probe: GET /api/health
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server for `apps/web` |
| `npm run build` | Build all workspaces |
| `npm run typecheck` | `tsc --noEmit` in every workspace |
| `npm run lint` | ESLint in every workspace |
| `npm run test` | Vitest in every workspace |
| `npm run verify` | `typecheck` + `lint` + `test` |
| `npm run format` | Prettier write on the whole repo |
| `npm run db:generate` | Generate SQL migrations from the Drizzle schema |
| `npm run db:migrate` | Apply migrations (enables pgvector) |
| `npm run db:seed` | Wipe + reinsert demo campaigns and audience segments |
| `npm run db:ingest` | Ingest the fictional demo knowledge base (re-running duplicates documents) |
| `npm run db:reembed` | Re-embed all existing chunks into pgvector (backfill / provider switch) |
| `npm run db:studio` | Drizzle Studio |
| `npm run evaluate` | Run the evaluation harness (4 seeded demo campaigns) |

## LLM and embedding providers

The default is `LLM_PROVIDER=mock` and `EMBEDDING_PROVIDER=mock`, so no keys are needed. The mock LLM has deterministic fixtures for the four seeded `[Demo] …` campaigns (Autumn Skincare, Flash Weekend Sale, Diwali Home Collection, Wellness Tea). Other campaigns get empty AI output, so only rule findings appear. Mock embeddings are hash-based: retrieval runs, but rankings aren't semantic.

To switch to Gemini:

```env
LLM_PROVIDER=gemini
EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=...
```

To switch to OpenAI:

```env
LLM_PROVIDER=openai
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

After changing `EMBEDDING_PROVIDER`, run `npm run db:reembed`.

## Vector search (pgvector)

Knowledge chunks are stored in `knowledge_chunks.embedding vector(768)` with an HNSW index (`vector_cosine_ops`). Retrieval (`packages/core/src/knowledge/retriever.ts`) embeds the query and runs top-k in SQL ordered by `embedding <=> query`, using Drizzle `cosineDistance`. The score is `1 - cosine distance`. The search filters on source type; geography and category filters treat NULL as "matches any".

- **One dimension for every provider.** `EMBEDDING_DIMENSION` (default `768`) is sent to:
  - OpenAI, as `dimensions` (text-embedding-3-* models only);
  - Gemini, as `outputDimensionality`;
  - the mock embedder.

  It must equal the column size (`KNOWLEDGE_EMBEDDING_DIMENSION` in `packages/core/src/db/schema/knowledge.ts`). A mismatch fails fast with a clear error.
- **No cross-model comparisons.** Each chunk records `embedding_model` (`<provider>:<model>`), and retrieval only searches chunks produced by the active embedding model.
- **Changing the dimension:** edit `KNOWLEDGE_EMBEDDING_DIMENSION` and `EMBEDDING_DIMENSION`, then run `npm run db:generate`, `npm run db:migrate` and `npm run db:reembed`. pgvector HNSW supports up to 2000 dimensions.
- **Not yet filtered:** document status, product and expiry. The schema has no such columns.

## Tests

- **Unit tests (Vitest, `packages/core`):**
  - rule engine (6)
  - risk aggregator (5)
  - mock LLM provider (5)
  - retrieval helpers (5): SQL filter builder, dimension guard, model id
- **Integration test:** `packages/core/src/knowledge/retriever.integration.test.ts` runs real pgvector retrieval. It is skipped unless `TEST_DATABASE_URL` points at a migrated database:
  ```bash
  TEST_DATABASE_URL=postgres://guardrail:guardrail@localhost:5432/guardrail npm test
  ```
- **`apps/web`:** no tests yet (placeholder script).

**Known pre-existing issues:**
- `npm run typecheck` reports one error in `packages/core/src/config/index.ts` (`ProcessEnv` typing) when checked from `apps/web`.
- `npm run lint` flags the generated `apps/web/next-env.d.ts`.

## Current status and known gaps

This is a working MVP for text campaigns: create → analyze → findings → review → approve, with an append-only audit log in the database.

**Recent changes:**
- Removed leftover debug telemetry calls and unused code/dependencies (`@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `@vitest/coverage-v8`).
- Moved retrieval to pgvector.

**Not yet built:**
- authentication and roles (the reviewer is the `DEFAULT_REVIEWER_ID` env identity);
- campaign versioning and comparison;
- image upload and multimodal review (assets are stored as metadata only and are not read by agents);
- claim extraction and claim-level evidence validation;
- rules as data;
- a UI or API for the audit log or for creating audience segments;
- per-finding override and escalation.

**Known quirks:**
- The aggregator's evidence dimension ignores `CONTRADICTED`.
- `analysis_runs.model` is recorded as `openai-configured` even for Gemini, and token columns are not populated.
- A single failing agent fails the whole run.
