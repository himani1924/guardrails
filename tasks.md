## STEP 1
Read `PROJECT_CONTEXT.md` completely.

Do NOT write implementation code yet.

First inspect the entire repository and understand:

1. Existing frontend architecture
2. Existing backend architecture
3. Existing package manager
4. Existing TypeScript configuration
5. Existing database setup
6. Existing API patterns
7. Existing UI/component patterns
8. Existing testing setup
9. Existing environment configuration
10. Existing authentication, if any

Then compare the existing repository against `PROJECT_CONTEXT.md`.

Create:

`docs/IMPLEMENTATION_PLAN.md`

Include:

* Current architecture
* Proposed architecture
* What can be reused
* What needs to be created
* Files/modules that should be added
* Database requirements
* AI requirements
* Dependencies
* Implementation order
* Risks
* MVP exclusions

Do not make major architectural changes.

Do not install dependencies yet.

Do not implement features yet.


## STEP 2
Using `PROJECT_CONTEXT.md` and the approved `docs/IMPLEMENTATION_PLAN.md`, create the initial project structure.

Requirements:

1. Preserve existing repository conventions.
2. Create clear frontend/backend boundaries.
3. Create an `agents` module.
4. Create a `knowledge`/RAG module.
5. Create database module.
6. Create API module.
7. Create shared TypeScript types.
8. Create configuration/environment module.
9. Create error-handling infrastructure.
10. Create logging infrastructure.

Create interfaces/types for:

* Campaign
* CampaignAsset
* CampaignContext
* Finding
* Evidence
* RiskAssessment
* Recommendation
* AudienceSegment
* AnalysisResult

Do not implement actual AI logic yet.

Do not create fake hardcoded AI results.

Run type checking and linting after scaffolding.

## STEP 3
Implement the initial PostgreSQL data model described in `PROJECT_CONTEXT.md`.

Create tables/models for:

* campaigns
* campaign_assets
* findings
* evidence
* risk_assessments
* recommendations
* audience_segments
* analysis_runs
* human_reviews
* audit_logs

Use appropriate relationships and indexes.

Requirements:

* Type-safe database access
* Migration support
* Timestamps
* Status fields
* JSON fields only where appropriate
* Foreign keys
* Proper indexes
* No unnecessary normalization/complexity

Do not implement the AI agents yet.

Create seed data for a few realistic demo campaigns.

Do not fabricate regulatory sources. Demo campaign data can be fictional.

Run migrations and verify the database works.


## STEP 4
Implement campaign management.

Users should be able to:

1. Create a campaign
2. Enter campaign name
3. Enter campaign copy
4. Upload or reference campaign assets
5. Select geography
6. Select target audience
7. Select campaign type
8. Select platform
9. Select festival/event context if applicable
10. Save campaign
11. View campaign
12. Edit campaign

Create:

* Frontend pages
* Forms
* Validation
* API endpoints
* Database operations
* Loading states
* Error states
* Empty states

Do not implement AI analysis yet.

Add tests for:

* valid campaign
* missing required fields
* invalid input
* API errors

## STEP 5
Implement the reusable AI infrastructure.

Create:

1. LLM provider abstraction
2. Embedding provider abstraction
3. Structured-output helper
4. Prompt management
5. Retry handling
6. Timeout handling
7. Token/cost logging
8. AI request logging
9. JSON schema validation
10. AI error handling

The rest of the application should NOT directly depend on a specific LLM SDK.

Use an interface such as:

LLMProvider
EmbeddingProvider

Create typed helpers for structured responses.

Do not implement business-specific agents yet.

Do not hardcode AI responses.

Add tests for malformed model output and provider failures.

## STEP 6
Implement the Compliance Agent according to `PROJECT_CONTEXT.md`.

Input:

Campaign

* campaign assets
* geography
* campaign type
* platform
* applicable policy context

The agent should:

1. Extract potentially regulated claims.
2. Identify potentially misleading claims.
3. Identify pricing/discount claims.
4. Identify missing-disclaimer risks.
5. Identify influencer disclosure risks.
6. Identify other configured compliance checks.
7. Return structured findings.

Each finding must contain:

* category
* severity
* title
* explanation
* affectedContent
* confidence
* requiresHumanReview
* evidenceRequired
* suggestedAction

Important:

Do NOT invent regulations.

If the system has no supporting regulatory/policy source, explicitly return:

`evidenceStatus: "NOT_FOUND"`

Do not claim that a violation exists solely because the model thinks it might be illegal.

Implement the agent as a modular service.

Add unit tests with at least 5 campaign examples.

## STEP 7
Implement a deterministic compliance-rule engine.

The rule engine should handle checks that do not require subjective LLM reasoning.

Examples:

* Required disclaimer missing
* Discount format validation
* Required campaign metadata
* Empty evidence reference
* Invalid promotional dates
* Missing influencer disclosure field
* Required brand disclaimer

Create a rule interface:

Rule:

* id
* name
* description
* applicableWhen()
* evaluate()
* finding output

The Compliance Agent should be able to combine:

1. Deterministic rule results
2. Retrieved evidence
3. LLM reasoning

Do not duplicate deterministic checks inside prompts.

Add tests for every rule.

## STEP 8
Implement the initial RAG system.

Knowledge sources should support:

* Internal marketing policies
* Brand guidelines
* Approved claims
* Regulatory/reference documents
* Historical campaign examples

Create an ingestion pipeline:

Document
→ parsing
→ chunking
→ metadata
→ embeddings
→ PostgreSQL/pgvector

Metadata should include:

* source
* title
* category
* geography
* effectiveDate
* version
* documentType

Implement:

* semantic search
* metadata filtering
* top-k retrieval
* source preservation

The Compliance Agent should use retrieved knowledge when appropriate.

Every retrieved result must preserve its source metadata.

If no relevant evidence is found, return that explicitly.

Do not scrape arbitrary websites for the MVP.

Create a small curated demo knowledge base.


## STEP 9
Update the Compliance Agent to use the RAG system.

Flow:

Campaign
→ Claim extraction
→ Identify applicable knowledge
→ Retrieve evidence
→ Evaluate claim
→ Generate finding
→ Attach evidence
→ Return result

Each finding should expose:

* Finding
* Reason
* Supporting source
* Relevant excerpt/summary
* Confidence
* Evidence status

The LLM must distinguish between:

SUPPORTED
INSUFFICIENT_EVIDENCE
CONTRADICTED
NOT_FOUND
REQUIRES_HUMAN_REVIEW

Do not allow the model to manufacture citations.

Add integration tests covering:

* evidence found
* evidence not found
* conflicting evidence
* irrelevant retrieved documents


## STEP 10
Implement the Sentiment Agent.

The agent should analyze campaign text and, where supported, campaign imagery.

Analyze:

* overall sentiment
* emotions
* ambiguity
* potentially polarizing language
* potentially sensitive themes
* tone
* audience interpretation differences

Do NOT ask the model to predict exactly how the public will react.

The output should be framed as:

"Potential reaction signals"

rather than factual predictions.

Return:

* sentiment
* emotions
* riskSignals
* explanation
* confidence
* uncertainty
* requiresHumanReview

Use structured output.

Create test campaigns with:

* positive messaging
* neutral messaging
* controversial/ambiguous messaging
* culturally contextual messaging


## STEP 11
Implement a Cultural Context Agent.

Input:

* campaign
* geography
* target audience
* event/festival
* campaign imagery
* campaign copy

The agent should identify potentially relevant cultural context.

It should retrieve contextual information from the knowledge base where available.

Analyze:

* festival/event context
* cultural references
* regional context
* gender-related context
* religious/cultural references
* stereotypes
* potentially conflicting messaging
* inclusivity considerations

Important:

Do not label a campaign as offensive.

Instead report:

* potential sensitivity
* possible interpretation
* affected context
* supporting evidence
* confidence
* uncertainty
* human review recommendation

Avoid assuming that an audience group has a single opinion.

Add tests for multiple interpretations of the same campaign.

## STEP 12
Implement Audience Perspective Simulation.

The system should evaluate a campaign from multiple configured perspectives.

Initial perspectives:

* General audience
* Existing customers
* Younger digital audience
* Family-oriented audience
* Festival/context-focused audience

These are simulated perspectives, NOT actual survey results.

For each perspective generate:

* possible interpretation
* positive signals
* concern signals
* ambiguity
* potential sensitivity
* confidence

Then compare perspectives and identify:

* agreement
* disagreement
* polarization
* uncertainty

Do not stereotype demographic groups.

Do not make claims such as:

"Gen Z will dislike this."

Instead use:

"Under this configured audience perspective, the following interpretation may occur."

Create a comparison API and UI.

## STEP 13
Implement the Risk Aggregator.

Inputs:

* Compliance findings
* Sentiment findings
* Cultural findings
* Audience perspective results
* Evidence quality
* Brand-policy findings

Do NOT create a single arbitrary score as the primary output.

Return separate dimensions:

* Compliance Risk
* Cultural Risk
* Sentiment Risk
* Brand Risk
* Evidence Risk
* Polarization Risk

Each dimension should contain:

* level
* reasons
* supporting findings
* confidence
* uncertainty
* humanReviewRequired

The aggregator should be deterministic where possible.

Do not allow an LLM to arbitrarily calculate the final risk level without defined criteria.

Document the risk classification rules.

## STEP 14
Implement the Recommendation Agent.

It receives the findings and generates actionable suggestions.

Examples:

* Add supporting evidence
* Modify a claim
* Add disclaimer
* Clarify promotional conditions
* Review imagery
* Review cultural context
* Request legal review
* Request brand review

Every recommendation must reference the finding that caused it.

The agent must NOT silently rewrite the campaign.

Provide:

* original content
* suggested modification
* reason
* related finding
* confidence

Allow the user to accept/reject suggestions.

Add tests.

## STEP 15
Implement the campaign analysis orchestrator.

When a user starts analysis:

1. Create analysis run
2. Extract campaign content
3. Run deterministic compliance rules
4. Run Compliance Agent
5. Retrieve supporting evidence
6. Run Sentiment Agent
7. Run Cultural Context Agent when relevant
8. Run Audience Perspective Simulation
9. Aggregate risks
10. Generate recommendations
11. Store complete results
12. Mark analysis complete
13. Escalate to human review if required

The orchestrator should:

* track agent status
* handle failures
* support retries
* prevent duplicate analysis
* preserve intermediate results
* record execution time
* record AI provider/model
* create an audit trail

Do not create unnecessary autonomous loops.

Use deterministic workflow orchestration for the MVP, with agents responsible for specific reasoning tasks.

## STEP 16
Build the campaign analysis dashboard.

Show:

### Overview

* Campaign status
* Analysis status
* Compliance risk
* Cultural risk
* Sentiment risk
* Brand risk
* Evidence risk
* Polarization risk

### Findings

For every finding show:

* severity
* category
* explanation
* affected content
* confidence
* evidence
* recommendation
* human review requirement

### Evidence

Allow users to inspect the source behind a finding.

### Audience Perspectives

Show the different simulated perspectives and areas of agreement/disagreement.

### Recommendations

Show:

* suggested action
* original content
* proposed modification
* reason

Do not overload the UI with AI technical details.

Make the dashboard understandable to a marketing manager rather than an engineer.

Include loading, empty and error states.

## STEP 17
Implement human review.

A campaign should be eligible for human review when:

* compliance evidence is insufficient
* risk is high
* audience perspectives strongly disagree
* cultural risk is uncertain
* AI confidence is low
* a configured rule requires human approval

Create:

* Review queue
* Campaign review page
* Finding details
* Evidence viewer
* Reviewer comments
* Approve
* Reject
* Request changes
* Override AI finding

Every reviewer action must be recorded in the audit log.

The system must make clear when a human has overridden an AI recommendation.

## STEP 18
Implement a feedback mechanism.

After human review, capture:

* AI finding accepted
* AI finding rejected
* Finding severity changed
* Recommendation accepted
* Recommendation rejected
* Reviewer comments
* Final campaign decision

Use this information initially for:

* evaluation
* analytics
* prompt improvement
* rule improvement
* future dataset creation

Do NOT automatically retrain models from feedback.

Create an admin/evaluation view showing:

* AI findings
* human decisions
* disagreement rate
* common false positives
* common false negatives

## STEP 19
Create an evaluation dataset containing at least:

* clearly compliant campaigns
* clearly problematic claims
* missing disclaimer examples
* pricing examples
* ambiguous campaigns
* culturally sensitive examples
* campaigns with conflicting audience interpretations

Create expected human-reviewed outcomes.

Measure:

### Compliance

* precision
* recall
* false-positive rate
* evidence accuracy

### Sentiment/Cultural

* agreement with human reviewers
* false-positive rate
* uncertainty calibration
* reviewer override rate

### RAG

* retrieval relevance
* source accuracy
* citation correctness

### System

* latency
* token usage
* cost per analysis
* failure rate

Generate an evaluation report.

## STEP 20
Review the complete application for production risks.

Check:

* API authentication
* authorization
* input validation
* file upload security
* prompt injection
* malicious campaign content
* sensitive data handling
* secrets management
* rate limiting
* database security
* logging
* audit logs
* AI provider failures
* hallucinations
* RAG poisoning
* unsafe external URLs
* excessive token usage

For each issue:

* explain the risk
* classify severity
* implement the appropriate fix for MVP
* document production improvements

Do not introduce unnecessary infrastructure.

## STEP 21
Prepare the application for a 5–7 minute Catalyst AI demonstration.

Create four polished demo scenarios.

### Scenario 1 — Safe campaign

Expected:

* low compliance risk
* low cultural risk
* low sentiment risk
* approve

### Scenario 2 — Compliance issue

Use a fictional campaign containing an unsupported marketing claim.

Expected:

* compliance finding
* evidence requirement
* source
* recommendation
* human review

### Scenario 3 — Cultural/sentiment risk

Use a fictional campaign associated with a festival/event where the campaign is not necessarily legally problematic but could reasonably produce different interpretations.

Expected:

Compliance:
LOW

Cultural:
HIGH

Sentiment:
MEDIUM

Polarization:
HIGH

The UI should clearly communicate that these are risk signals and simulated perspectives, not factual predictions of public reaction.

### Scenario 4 — Uncertainty

Create a campaign where available evidence is insufficient.

Expected:

* uncertainty
* low confidence
* human review
* no fabricated conclusion

Create seed data and a simple demo setup so all four scenarios can be demonstrated reliably.

Finally provide:

1. Demo script
2. Key screens
3. Agent flow during each scenario
4. Expected output
5. Key talking points
6. Architecture diagram
7. Known limitations
8. Future production roadmap