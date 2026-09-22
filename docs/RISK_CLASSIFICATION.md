# Risk classification rules (STEP 13)

These are the deterministic rules used by
[`aggregateRisks`](../packages/core/src/agents/risk-aggregator/aggregator.ts).
The LLM never sets a risk level directly — it only produces findings; this
document is the contract for how those findings translate into risk levels.

## Dimensions

Guardrail always publishes six risk dimensions per analysis run. It never
publishes a single "overall risk" number.

| Dimension | What ends up here |
|---|---|
| `compliance`   | Findings produced by the Compliance Agent or the Rule Engine (except cultural/sentiment/audience_polarization/brand_policy categories) |
| `cultural`     | Findings whose `producedBy = cultural` or whose `category = cultural` |
| `sentiment`    | Findings whose `producedBy = sentiment` or whose `category = sentiment` |
| `brand`        | Findings whose `category = brand_policy` |
| `polarization` | Findings whose `category = audience_polarization` (+ boosted by cross-perspective disagreement) |
| `evidence`     | Any finding with `evidenceRequired = true` AND `evidenceStatus ∈ {NOT_FOUND, INSUFFICIENT_EVIDENCE, REQUIRES_HUMAN_REVIEW}` |

A single finding can contribute to more than one dimension. For example a
Compliance Agent finding about an unsupported clinical claim contributes to
both `compliance` and `evidence`.

## Level rules

Evaluated per dimension on the findings in its bucket:

| Level | Condition |
|---|---|
| `critical` | any finding with `severity = critical` |
| `high`     | any `severity = high` — OR polarization boost ≥ 2 |
| `medium`   | any `severity = medium` — OR ≥ 2 `severity = low` findings — OR polarization boost = 1 |
| `low`      | exactly one `severity = low` — OR any `severity = info` |
| `unknown`  | no findings and no polarization boost |

## Polarization boost

Computed from `AudiencePerspectiveResult[]`:

- +1 for every perspective that has BOTH positive and concern signals
- +1 if at least one perspective has concerns AND at least one perspective has none

## Human review requirement

A dimension is flagged `humanReviewRequired = true` if any of:

- its level is `high` or `critical`
- any finding in the bucket has `requiresHumanReview = true`
- the dimension is `evidence` and there is at least one finding in the bucket

## Confidence

Average confidence of the findings in the bucket (rounded to 3 decimals).
An empty bucket defaults to 0.7 (baseline for "no signals detected").

## What this deliberately does NOT do

- It does not compute a single "overall" risk number.
- It does not let the LLM decide the level of any dimension.
- It does not attempt to combine dimensions into a weighted average.
- It does not silently ignore low-confidence findings — they are surfaced with a lower dimension confidence instead.
