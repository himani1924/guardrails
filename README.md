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
      drizzle/  # SQL migrations (0000, 0001, 0002_pgvector, 0003_images)
  docker-compose.yml  # Postgres 16 + pgvector (pgvector/pgvector:pg16)
  scripts/            # One-off DB bootstrap SQL (create-db.sql)
```

## How an analysis runs

`POST /api/campaigns/:id/analyze` → `packages/core/src/analyses/orchestrator.ts` runs these steps in order:

0. **Image extraction.** For each uploaded campaign image, one vision call (Gemini/OpenAI; the mock returns a fixed fixture) returns Zod-validated `{extractedText, description, detectedElements, possibleConcerns}`, saved per run in `image_extractions`. A failed image is marked `failed` and adds a high-severity, human-review finding.
1. **Rule engine.** 6 deterministic rules: disclaimer, discount format, influencer `#ad`, health claims, festival line, metadata. They run over the copy plus image text: claim and discount rules also run on each image's text (findings titled `[Image N]`), and "missing marker" rules accept a marker found in an image.
2. **Compliance agent.** Retrieves the top 6 chunks from internal_policy, brand_guideline, approved_claim and regulatory docs.
3. **Sentiment agent.**
4. **Cultural agent.** Runs only when a festival is set. Retrieves the top 4 chunks from brand_guideline and internal_policy docs.
5. **Audience perspective agent.**
6. **Deterministic risk aggregator.** Produces 6 dimensions and no single score.
7. **Recommendation agent.** Followed by a deterministic gap-fill.
8. **Persist and audit.** Everything is written in one transaction; the campaign moves to `in_review` or `analyzed`.

Agents may only cite retrieved sources. Unknown citations are dropped. All five agents (compliance, sentiment, cultural, audience, recommendation) receive each image's extracted text and description. Compliance, sentiment and cultural findings may name a `sourceImage`; it is kept only if that image number exists. Retrieval queries include image text.

### Images

- **Upload:** the campaign form (new and edit) accepts PNG, JPEG or WebP, **max 4 MB each and 6 per campaign**, with previews and a remove button. The same limits are enforced by the API (`campaigns/schemas.ts`: `IMAGE_MIME_TYPES`, `MAX_IMAGE_BYTES`, `MAX_IMAGES_PER_CAMPAIGN`). Over the API, send an asset `{type:"image", title, mimeType, dataBase64}`.
- **Storage:** bytes live in Postgres (`campaign_asset_files`, bytea, 1:1 with `campaign_assets`, `ON DELETE CASCADE`), so they are transactional, deleted with the campaign and included in `pg_dump`. `campaign_assets.sort_order` defines "image N". Editing a campaign keeps assets sent back by `id`, so old runs' thumbnails stay valid.
- **Serving:** `GET /api/campaign-assets/:id` returns the stored image.
- **Which images are analysed:** only images with stored bytes. Older URL-only "reference" image assets (as in `db:seed`) are skipped.
- **Model:** vision uses the active `LLM_PROVIDER` and its `*_LLM_MODEL`, which must be multimodal. There is no separate vision-model setting. The mock returns a fixed description and empty text.
- **Results:** the analysis page has an **Images** section with thumbnail, status, extracted text, description, detected elements, possible concerns and the findings tied to that image. Finding cards show an `Image N` tag. A failed extraction shows an error banner.
- **Draft:** images are not stored in the browser draft (see below).

### Database tables added by migration 0003 (`0003_images.sql`)

| Table / column | Purpose |
| --- | --- |
| `campaign_asset_files` | image bytes, mime type, byte size per asset |
| `image_extractions` | per run and image: status, extracted text, description, detected elements, concerns, error, model |
| `campaign_assets.sort_order` | image order ("image N") |
| `findings.source_image_index` | image a finding came from |

Run `npm run db:migrate` after pulling. It only adds tables and columns.

### Web app

- **Dark UI only.** There is no light theme.
- **Campaign form** (`/campaigns/new`, `/campaigns/:id/edit`): basics, copy, image upload, policy checkboxes, extra policy keys and audience segments. The free-text "creative assets" field is hidden; editing a campaign resends existing non-image assets unchanged.
- **Draft autosave (new campaigns only):** fields are saved to `localStorage` (`guardrail:new-campaign-draft:v1`) after 500 ms and restored on reload; **Clear draft** resets it; the draft is cleared after a successful create. Images are deliberately not saved in the draft, so re-add them after a reload. Edit forms are never drafted.
- **Policies in the form:** one checkbox per policy key (a document's category key, or its id when it has none). Documents sharing a key are grouped under one checkbox with their titles and count. **Upload policy in new tab ↗** opens `/knowledge`; the list reloads when you return to the tab, or via **Refresh policies**.
- **Knowledge upload** (`/knowledge`, `POST /api/knowledge`): `.txt`/`.md` or pasted text (20–200,000 characters) with title, source type, category key and geography. Uploads are de-duplicated by **title + source type**: identical content returns `200 {"status":"unchanged"}` and adds nothing; different content updates that document in place and re-embeds it (`"updated"`); otherwise `201 {"status":"created"}`. `npm run db:ingest` uses the same logic, so re-running it no longer creates copies.

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

**Port 3000 tip:** if another dev server (for example Vite) is bound to `[::1]:3000`, `localhost:3000` may reach that app instead of Guardrail. Use `http://127.0.0.1:3000`, or stop the other server. Check with `lsof -nP -iTCP:3000 -sTCP:LISTEN`.

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
| `npm run db:ingest` | Ingest the fictional demo knowledge base (de-duplicated by title + source type) |
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
  - image extraction (9): schema validation, mock fixture, failed image handling, rules over image text, image-citation check
- **Integration test:** `packages/core/src/knowledge/retriever.integration.test.ts` runs real pgvector retrieval. It is skipped unless `TEST_DATABASE_URL` points at a migrated database:
  ```bash
  TEST_DATABASE_URL=postgres://guardrail:guardrail@localhost:5432/guardrail npm test
  ```
- **`apps/web`:** no tests yet (placeholder script).

**Known pre-existing issues:**
- `npm run typecheck` reports one error in `packages/core/src/config/index.ts` (`ProcessEnv` typing) when checked from `apps/web`.
- `npm run lint` flags the generated `apps/web/next-env.d.ts`.

## Current status and known gaps

This is a working MVP for text and image campaigns: create → analyze → findings → review → approve, with an append-only audit log in the database.

**Recent changes:**
- Removed leftover debug telemetry calls and unused code/dependencies (`@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `@vitest/coverage-v8`).
- Moved retrieval to pgvector.
- Dark-only UI redesign, hidden assets text field, draft autosave and in-form policy refresh (commit f2f5137).
- Image upload, vision extraction and image-aware rules and agents (migration 0003).
- Knowledge ingestion de-duplicated; policy checkboxes grouped by key.

**Not yet built:**
- authentication and roles (the reviewer is the `DEFAULT_REVIEWER_ID` env identity);
- campaign versioning and comparison;
- video/audio analysis and image review for URL-only assets;
- claim extraction and claim-level evidence validation;
- rules as data;
- a UI or API for the audit log or for creating audience segments;
- per-finding override and escalation.

**Known quirks:**
- The aggregator's evidence dimension ignores `CONTRADICTED`.
- `analysis_runs.model` is recorded as `openai-configured` even for Gemini, and token columns are not populated.
- A single failing agent fails the whole run (a failing image does not: it is marked failed and flagged for review).
- Documents ingested more than once before de-duplication remain in the database until removed manually.
