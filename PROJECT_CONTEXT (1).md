# **Project: Guardrail**

## **Product**

Guardrail is an agentic marketing compliance and audience-risk review platform.

Its purpose is to help marketing teams evaluate campaigns BEFORE publication.

A campaign can contain:

* Text/ad copy  
* Images  
* Videos  
* Captions  
* Offers and pricing  
* Product claims  
* Influencer content  
* Target audience  
* Geography  
* Festival/event context  
* Marketing channel

The system evaluates the campaign through two major layers.

---

## **Layer 1: Marketing Compliance**

The system checks for potential:

* Regulatory violations  
* Misleading claims  
* Unsupported product claims  
* Pricing/discount issues  
* Missing disclaimers  
* Influencer disclosure issues  
* Privacy/data-use issues  
* Brand-policy violations  
* Industry-specific requirements

The system should combine:

* Deterministic rules  
* Structured validation  
* RAG  
* LLM reasoning  
* Evidence verification  
* Human review

The system must NOT invent regulations or evidence.

Every compliance finding should ideally contain:

* Finding  
* Risk level  
* Explanation  
* Evidence  
* Source  
* Confidence  
* Suggested correction  
* Human review requirement

---

## **Layer 2: Human Sentiment & Cultural Risk**

A campaign can be legally compliant but still create negative public reaction.

The system should identify signals related to:

* Sentiment  
* Emotion  
* Cultural sensitivity  
* Festival context  
* Regional context  
* Gender sensitivity  
* Stereotyping  
* Inclusivity  
* Brand-context mismatch  
* Audience polarization  
* Potential reputation/backlash risk

The system must NOT claim that it can definitively predict public reaction.

It should instead provide:

* Potential risk signals  
* Possible interpretations  
* Audience-specific perspectives  
* Supporting evidence  
* Confidence  
* Uncertainty  
* Human review recommendation

---

## **Agentic Architecture**

The planned agents are:

1. Campaign Intake Agent  
2. Content Extraction Agent  
3. Compliance Agent  
4. Policy/Regulation Retrieval Agent  
5. Evidence Verification Agent  
6. Sentiment Agent  
7. Cultural Context Agent  
8. Audience Perspective Agents  
9. Risk Aggregator  
10. Recommendation Agent  
11. Human Review Agent/workflow  
12. Audit Agent

For the MVP, agents can be implemented as modular services/functions rather than independent deployed services.

Do NOT over-engineer the MVP.

---

## **Example**

A campaign may be:

"50% off our premium skincare range. Clinically proven to deliver visible results."

The system could identify:

* "50% off" → pricing/discount claim requiring validation  
* "Clinically proven" → evidence required

Another campaign may pass regulatory checks but contain imagery or messaging associated with a festival/cultural event that could reasonably be interpreted differently by different audiences.

The system should flag this as a contextual/cultural risk rather than declaring the campaign offensive.

---

## **Target User Flow**

Marketing user:

1. Creates campaign  
2. Uploads/pastes campaign content  
3. Selects:  
   * geography  
   * target audience  
   * campaign type  
   * platform  
   * relevant event/festival  
4. Starts analysis  
5. System runs compliance analysis  
6. System runs sentiment analysis  
7. System runs cultural/context analysis  
8. System runs audience perspective analysis  
9. System aggregates findings  
10. User sees explainable risk report  
11. User can inspect evidence  
12. User can modify campaign  
13. Campaign can be re-analyzed  
14. High-risk/uncertain cases can be sent for human review  
15. Reviewer approves/rejects/requests changes

---

## **MVP**

The MVP should demonstrate:

### **Scenario 1**

A campaign with no significant issues.

### **Scenario 2**

A campaign containing an unsupported or potentially misleading claim.

### **Scenario 3**

A campaign that is legally acceptable but has potential cultural/sentiment risk.

### **Scenario 4**

A campaign where the AI is uncertain and escalates to human review.

---

## **Important Principles**

1. Do not make unsupported claims.  
2. Do not fabricate regulations or sources.  
3. Do not present simulated audience reactions as actual public sentiment.  
4. Clearly distinguish evidence from AI interpretation.  
5. Preserve source information.  
6. Provide confidence and uncertainty.  
7. Human reviewers make the final decision.  
8. Prefer simple architecture for the MVP.  
9. Use typed interfaces.  
10. Keep AI providers replaceable.  
11. Keep agents modular.  
12. Avoid unnecessary microservices.

---

## **Preferred Technology**

Frontend:

* Next.js  
* TypeScript  
* Tailwind CSS  
* Accessible component library where useful

Backend:

* Node.js  
* TypeScript  
* REST APIs

Database:

* PostgreSQL  
* pgvector for embeddings/RAG

AI:

* LLM with structured output  
* Embeddings  
* Multimodal model where required

Development:

* Docker where useful  
* Environment variables for secrets  
* Automated tests  
* ESLint/Prettier

The exact technology can be adjusted if the existing repository already has established patterns.

---

## **Product Philosophy**

Guardrail is a decision-support system, not an autonomous decision-maker.

It should answer:

"Here are the risks, evidence, possible interpretations and recommended actions."

It should NOT answer:

"This campaign will definitely cause backlash."

