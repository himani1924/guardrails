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
  docker-compose.yml  # Optional: Postgres 16 + pgvector for teams with Docker
  scripts/     # One-off DB bootstrap SQL
```

## Requirements

- Node.js **>=20** (developed on Node 24)
- npm **>=10**
- PostgreSQL 16+ locally OR Docker Desktop (compose file provided)

## Quick start

```powershell
# 1. Install dependencies
npm install

# 2. Copy environment defaults
Copy-Item .env.example .env

# 3a. Docker path (optional): docker compose up -d postgres
# 3b. Local Postgres path: run scripts/create-db.sql once as the postgres superuser.

# 4. Migrate + seed + ingest knowledge base
npm run db:migrate
npm run db:seed
npm run db:ingest

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

## Current status

All 21 tasks from `tasks.md` implemented at MVP scope.

# guardRails
