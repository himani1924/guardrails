# Guardrail — 5–7 minute Catalyst AI demo script

Total target time: 5–7 min. Four scenarios × ~90 s each + wrap.

Pre-demo checklist (30 s, hidden):

```powershell
cd guardRails
npm run db:migrate
npm run db:seed
npm run db:ingest    # loads the demo knowledge base
npm run dev
```

Verify http://localhost:3000/api/health returns `status: ok`.

Provider default: `LLM_PROVIDER=mock`. The mock is pre-programmed with
fixtures for the four seeded campaigns so the demo is reproducible even
without an OpenAI key. To demo with a real key, set `LLM_PROVIDER=openai`
and `OPENAI_API_KEY` in `.env`.

Talking points to open with (~30 s):

- Guardrail is a **decision-support** tool for marketing teams.
- Every finding shows the **evidence** behind it and its **evidence status**.
- Simulated audience perspectives are labelled clearly — **not** public
  reaction predictions.

---

## Scenario 1 — Safe campaign

Campaign: **[Demo] Autumn Skincare Refresh — Fictional Beauty Co.**
Steps:

1. Open `/campaigns` → click the campaign.
2. Click **Run analysis**.
3. Land on the analysis dashboard.

Expected:

- Compliance risk: **LOW**
- Cultural risk: **LOW/UNKNOWN**
- Sentiment risk: **LOW/UNKNOWN**
- No findings; recommendations empty; not in review.

Talking point: "No signals — Guardrail is happy to say nothing is
wrong when nothing is wrong."

---

## Scenario 2 — Compliance issue with cited evidence

Campaign: **[Demo] Flash Weekend Sale — Premium Serum**
Steps:

1. Open the campaign, show the copy: *"50% off ... Clinically proven ..."*
2. Click **Run analysis**.

Expected:

- Compliance risk: **HIGH**
- One high-severity finding: *Unsupported "Clinically proven" health-style claim*
- Evidence status: **CONTRADICTED**, cited to the internal *"Approved
  marketing claims register"* which lists this phrase as NOT approved.
- One low-severity finding on discount phrasing.
- Recommendation: **add_evidence**.
- Campaign status: `in_review`.

Talking points:

- The rule engine also flagged it (`health_claim_requires_evidence`) — you
  can see both agents agree.
- The LLM did not invent a citation; the excerpt shown comes from the
  retrieval layer.

---

## Scenario 3 — Cultural + sentiment + polarization

Campaign: **[Demo] Diwali Home Collection**
Steps:

1. Open the campaign, show the festival context.
2. Click **Run analysis**.

Expected:

- Compliance risk: **LOW** (metadata rule fires "responsible celebration"
  disclaimer note but nothing above LOW).
- Cultural risk: **HIGH** — cited to the fictional *"Cultural sensitivity
  guideline for Diwali campaigns"*.
- Sentiment risk: **MEDIUM**.
- Polarization risk: **HIGH** — driven by disagreement across
  `family_oriented`, `festival_focused` and `general_audience` perspectives.

Talking points:

- The UI banner says: "simulated audience perspectives ... not factual
  predictions."
- Compliance is fine; cultural and polarization dimensions are what a
  regional lead would want to look at.

---

## Scenario 4 — Uncertainty / insufficient evidence

Campaign: **[Demo] Wellness Tea — Immunity Blend**
Steps:

1. Open the campaign.
2. Click **Run analysis**.

Expected:

- Compliance risk: **MEDIUM**
- Finding: *Soft health claim needs evidence review* — evidence status
  **INSUFFICIENT_EVIDENCE**, confidence ~0.55, `requiresHumanReview = true`.
- Recommendation: **add_evidence** (from deterministic fallback).
- Campaign status: `in_review`.

Talking points:

- Guardrail does not fabricate a conclusion when evidence is insufficient.
- The reviewer sees exactly why — confidence, uncertainty text, and the
  cited (partial) source.

---

## Wrap (~30 s)

- Six risk dimensions per run — never a single opaque score.
- Every finding has a category, severity, confidence, evidence status and
  (where applicable) a cited source with an excerpt.
- The rule engine handles deterministic checks; the agents handle
  subjective reasoning; the aggregator maps findings into dimensions
  deterministically (see [RISK_CLASSIFICATION.md](./RISK_CLASSIFICATION.md)).
- Human review is the source of truth. Every reviewer action is written
  to `audit_logs`.

## Known limitations (be honest)

- No real regulatory corpus — the demo KB is fictional.
- Multimodal (image/video) analysis is out of scope for the MVP.
- No real authentication / RBAC / multi-tenancy.
- The mock LLM provider is a deterministic responder for the demo, not
  an LLM. Switch to OpenAI for genuine LLM output.
- pgvector is not required in the MVP (Node-side cosine); a production
  migration would flip to `vector(dim)`.

## Future production roadmap

- Real KB ingestion (with signed sources) + eval-driven prompt improvements.
- pgvector + IVFFlat index for scale.
- Multimodal analysis (image + video) behind the same provider interface.
- Auth (session or SSO), RBAC and per-brand policies.
- Streaming analysis with per-agent progress in the UI.
- Prompt injection defence library (input tagging + output validation) —
  the STEP 20 hardening pass adds the MVP subset.

## Key screens (map to demo flow)

| Step | URL |
|---|---|
| Home | `/` |
| Campaigns list | `/campaigns` |
| Campaign detail | `/campaigns/[id]` |
| Analysis dashboard | `/campaigns/[id]/analysis/[runId]` |
| Review queue | `/review` |
| Review detail | `/review/[id]` |
| Admin/feedback | `/admin` |
