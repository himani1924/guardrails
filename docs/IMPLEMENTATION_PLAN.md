# Guardrail — Implementation Plan

Source of truth for the product scope: [PROJECT_CONTEXT (1).md](../PROJECT_CONTEXT%20(1).md)
Source of truth for the build steps: [tasks.md](../tasks.md)

This plan is the output of **STEP 1**. It is written before any code is committed
and is meant to be approved before scaffolding begins in STEP 2.

---

## 1. Current architecture

The `guardRails/` folder is effectively a **greenfield** workspace. It contains only:

- `PROJECT_CONTEXT (1).md` — the product brief
- `tasks.md` — the 21-step build plan
- `docs/IMPLEMENTATION_PLAN.md` — this document

There is:

- No existing frontend
- No existing backend
- No existing package manager / lockfile
- No existing TypeScript configuration
- No existing database or migrations
- No existing API surface
- No existing UI component library / design system
- No existing test setup
- No existing environment configuration (`.env*`)
- No existing authentication

The wider VS Code workspace contains unrelated projects (`ATV MC INVEST/`,
`atvmc-roadmap-manager/`, `cost-deviation-checker/`, `f_atv_clara/`, etc.).
These are **out of scope** — Guardrail is built inside `guardRails/` only and
does not import from or modify any sibling project.

Because there are no existing conventions inside `guardRails/`, the plan
follows the "Preferred Technology" section of `PROJECT_CONTEXT.md`.

## 2. Proposed architecture

A single **monorepo** rooted at `guardRails/`, using **npm workspaces**.
Two workspaces:

- `apps/web` — Next.js 14 (App Router) + TypeScript + Tailwind CSS frontend.
  Also hosts the REST API via Next.js Route Handlers under `app/api/*`.
- `packages/core` — the domain, agents, RAG, database and AI infrastructure
  as a plain TypeScript library. The web app is a thin transport layer over
  this library.

Rationale:

- One deployable unit for the MVP (avoids unnecessary microservices, per
  `PROJECT_CONTEXT.md`).
- Clean separation of "brain" (`packages/core`) from "skin" (`apps/web`)
  so the same core can later be exposed via a standalone server or CLI.
- Uses Next.js Route Handlers for REST — no extra Express/Fastify layer
  to maintain.

Runtime:

- Node.js 20 LTS
- PostgreSQL 16 with the `pgvector` extension for embeddings
- Docker Compose for local Postgres

High-level module boundaries inside `packages/core`:

```
packages/core/src/
  config/          # env loading + typed config
  logging/         # pino logger
  errors/          # domain error classes + typed Result helpers
  db/              # Drizzle ORM schema, client, migrations
  types/           # shared domain types (Campaign, Finding, Evidence, ...)
  ai/              # LLMProvider / EmbeddingProvider abstractions + adapters
  knowledge/       # RAG: ingestion, chunking, embeddings, retrieval
  rules/           # deterministic compliance rules
  agents/
    compliance/
    sentiment/
    cultural/
    audience/
    risk-aggregator/
    recommendation/
  orchestrator/    # analysis run coordinator
  audit/           # audit log helpers
  feedback/        # human-review feedback capture
```

`apps/web` layout:

```
apps/web/src/
  app/
    (marketing shell)/
    campaigns/           # list, create, edit, view
    campaigns/[id]/analysis/  # analysis dashboard
    review/              # human review queue
    admin/               # feedback / evaluation view
    api/
      campaigns/
      analysis/
      review/
      knowledge/
      health/
  components/            # UI components (Tailwind + Radix primitives)
  lib/                   # thin client-side helpers, fetchers
  styles/
```

## 3. What can be reused

Nothing from the current `guardRails/` folder except the two markdown docs.
No sibling project is reused.

The following external building blocks are used off-the-shelf to avoid
re-implementation:

- **Next.js** — routing, SSR, Route Handlers, dev server
- **Drizzle ORM** + **drizzle-kit** — typed SQL, migrations, `pgvector` support
- **Zod** — runtime validation for API bodies, env vars, and LLM structured
  outputs
- **Tailwind CSS** + **shadcn/ui** primitives (Radix under the hood) —
  accessible components
- **pino** — structured logging
- **Vitest** + **@testing-library/react** — unit + component tests
- **Playwright** — a small number of end-to-end tests for the demo flow
- **OpenAI SDK** — behind our own `LLMProvider` / `EmbeddingProvider`
  interfaces so it stays replaceable

## 4. What needs to be created

Everything else. Concretely:

- Monorepo scaffolding (root `package.json`, workspaces, `tsconfig`
  base, ESLint, Prettier, `.editorconfig`, `.gitignore`, `.env.example`)
- Docker Compose for local Postgres + pgvector
- `packages/core` with the modules listed in section 2
- `apps/web` Next.js app + Tailwind + shadcn setup
- Database schema and migrations
- Deterministic rule engine
- Agent implementations
- RAG ingestion pipeline + a small curated demo knowledge base (fictional,
  clearly marked as demo content)
- Analysis orchestrator
- Dashboard, human review, admin/feedback UIs
- Evaluation dataset + evaluation script
- Demo seed data for the four MVP scenarios

## 5. Files/modules to be added

Top-level files (created in STEP 2):

- `package.json` (workspaces)
- `tsconfig.base.json`, `tsconfig.json`
- `eslint.config.js`, `.prettierrc`
- `.env.example`, `.gitignore`, `.editorconfig`
- `docker-compose.yml` (Postgres + pgvector)
- `README.md`
- `docs/ARCHITECTURE.md` (added later, in STEP 2)

Per-module files: see the tree in section 2. Each module gets a
`index.ts` barrel plus focused files (`schema.ts`, `provider.ts`, etc.)
rather than one large file per module.

## 6. Database requirements

PostgreSQL 16 with the `pgvector` extension.

Tables (implemented in STEP 3):

- `campaigns`
- `campaign_assets`
- `analysis_runs`
- `findings`
- `evidence`
- `risk_assessments`
- `recommendations`
- `audience_segments`
- `audience_perspective_results`
- `human_reviews`
- `audit_logs`
- `knowledge_documents`
- `knowledge_chunks` (has a `vector(1536)` column for embeddings)
- `feedback_events`

Conventions:

- UUID primary keys (`gen_random_uuid()`).
- `created_at` / `updated_at` `timestamptz` on every table.
- Explicit foreign keys with `on delete cascade` only where semantically
  correct (e.g. `campaign_assets` → `campaigns`).
- Enum-like fields (`status`, `severity`, `evidence_status`) stored as
  Postgres enums via Drizzle so they stay type-safe.
- `jsonb` used **only** for shapes that are inherently variable
  (structured LLM outputs, provider metadata, rule parameters).
- Indexes on foreign keys, `campaigns.status`, `analysis_runs.campaign_id`,
  `findings.analysis_run_id`, `knowledge_chunks` (`ivfflat` on the vector
  column, plus btree on `document_id`).

## 7. AI requirements

- One `LLMProvider` interface with `complete()` and `completeStructured<T>()`
  methods. `completeStructured` takes a Zod schema, calls the model with
  JSON-mode / tool-calling, validates the response, and re-prompts once on
  validation failure before surfacing an error.
- One `EmbeddingProvider` interface with `embed(texts: string[])`.
- Default adapter: OpenAI (`gpt-4o-mini` for reasoning, `text-embedding-3-small`
  for embeddings). Swappable via env var. A `MockLLMProvider` /
  `MockEmbeddingProvider` is added for tests so no test hits a real API.
- All AI calls go through a single `ai/client.ts` that logs
  `provider`, `model`, `prompt_tokens`, `completion_tokens`, `latency_ms`
  and a hash of the prompt (never the raw prompt in prod logs).
- Retries: at most 2, exponential backoff, only on transient errors.
- Timeouts: hard 30s per call.
- Structured outputs are the default. Free-text responses are only used
  for explanatory fields inside an already-validated JSON envelope.
- Prompts live under `packages/core/src/agents/*/prompts/` as `.ts`
  functions so they are typed and testable.

## 8. Dependencies

Runtime (added in STEP 2 unless noted):

- `next`, `react`, `react-dom`
- `typescript`, `@types/node`, `@types/react`, `@types/react-dom`
- `tailwindcss`, `postcss`, `autoprefixer`
- `@radix-ui/react-*` primitives used by shadcn
- `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`
- `drizzle-orm`, `pg`
- `zod`
- `pino`, `pino-pretty` (dev only)
- `openai` (added in STEP 5, behind the provider interface)

Dev:

- `drizzle-kit`
- `eslint`, `@typescript-eslint/*`, `eslint-config-next`, `prettier`
- `vitest`, `@vitest/coverage-v8`, `@testing-library/react`,
  `@testing-library/jest-dom`, `jsdom`
- `playwright` (added in STEP 21 for demo E2E only)
- `tsx` (script runner for migrations, seeds, evaluation)

Nothing else is installed in STEP 1 — actual `npm install` happens in STEP 2.

## 9. Implementation order

Follows `tasks.md` verbatim. Summary:

1. STEP 1 — this plan
2. STEP 2 — scaffold, types, config, logging, errors
3. STEP 3 — DB schema, migrations, seed
4. STEP 4 — campaign CRUD + UI
5. STEP 5 — AI infrastructure (providers, structured output, logging)
6. STEP 6 — Compliance Agent (LLM path)
7. STEP 7 — deterministic rule engine
8. STEP 8 — RAG ingestion + retrieval + curated demo KB
9. STEP 9 — wire RAG into Compliance Agent
10. STEP 10 — Sentiment Agent
11. STEP 11 — Cultural Context Agent
12. STEP 12 — Audience Perspective Simulation
13. STEP 13 — Risk Aggregator (deterministic)
14. STEP 14 — Recommendation Agent
15. STEP 15 — Analysis orchestrator
16. STEP 16 — Dashboard UI
17. STEP 17 — Human review
18. STEP 18 — Feedback capture + admin/evaluation view
19. STEP 19 — Evaluation dataset + report
20. STEP 20 — Production risk review + hardening
21. STEP 21 — Demo scenarios + script

Each step ends with type-check + lint + relevant tests green.

## 10. Risks

- **LLM hallucination on regulations.** Mitigated by the RAG evidence-status
  contract (`SUPPORTED` / `INSUFFICIENT_EVIDENCE` / `CONTRADICTED` /
  `NOT_FOUND` / `REQUIRES_HUMAN_REVIEW`) and by never allowing the model
  to invent a citation — sources come only from the retrieval layer.
- **Cost blow-up during dev/eval.** Mitigated by mock providers in tests,
  a small demo KB, and per-run token accounting persisted in
  `analysis_runs`.
- **Prompt injection via campaign copy or knowledge documents.**
  Mitigated by fenced input sections, output schema validation, and
  refusal patterns in prompts; addressed formally in STEP 20.
- **Vector index cold-start.** `pgvector` `ivfflat` needs data to build a
  meaningful index; for the tiny demo KB we accept a sequential scan and
  document this as a known MVP limitation.
- **Scope creep on the UI.** Mitigated by leaning on shadcn primitives
  and cutting features aggressively in STEP 16.
- **Windows dev environment quirks** (Postgres/pgvector). Mitigated by
  Docker Compose so local dev is OS-agnostic.
- **Only one developer / no CI yet.** Mitigated by keeping lint + tests
  runnable via a single `npm run verify` script from STEP 2 onward.

## 11. MVP exclusions

Explicitly **not** in the MVP (documented so they can be revisited later):

- Multi-tenant accounts, org roles, SSO. A single hard-coded reviewer
  identity is used for `human_reviews.reviewer_id`.
- Real authentication provider. STEP 20 adds a minimal session/API-key
  gate; full auth (NextAuth, OAuth, RBAC) is out of scope.
- Video and audio asset analysis. Only text and image references are
  handled. Multimodal image analysis is optional and gated on a config
  flag; if disabled, findings state `NOT_ANALYZED`.
- Real regulatory corpora. The knowledge base is a small, clearly
  labelled **fictional demo corpus**. No scraping.
- Automatic model retraining or fine-tuning from feedback.
- Autonomous agent loops / tool-using agents that call each other freely.
  Orchestration is a deterministic workflow.
- Real-time collaboration, comments threads, notifications, email.
- Production-grade observability (OpenTelemetry, tracing dashboards).
  We log structured JSON via pino and stop there.
- Kubernetes manifests. Docker Compose is the only deployment artifact
  for the MVP.
- Internationalisation of the UI. English only.

---

## Approval

STEP 1 ends here. No code, no dependencies, no schema.
Awaiting approval before proceeding to STEP 2.
