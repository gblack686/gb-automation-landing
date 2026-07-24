---
type: proposal
client: florish
project: vendor-enrollment-engine-mvp
title: "Florish — Vendor Enrollment Engine MVP + Value Matrix"
created: 2026-07-05
updated: 2026-07-05
status: draft-for-greg-review
tags: [client/florish, proposal, vendor-enrollment, value-matrix, supabase, growth-ops]
---

# Florish — Vendor Enrollment Engine MVP + Value Matrix

Prepared for Eric Ferguson / Florish Technologies, Inc.  
Prepared by GB Automation / GB Auto  
Date: 2026-07-05

> Recommended first paid build: a focused, one-market Vendor Enrollment Engine that proves measurable vendor supply growth before Florish commits to a broader automation platform.

## Executive summary

Florish does not need a giant automation platform first. The highest-leverage starting point is a small, measurable MVP: one market, one vendor segment, one operating loop, and Supabase as the canonical system of record.

The MVP should help Florish find, qualify, contact, nurture, and enroll plant-material vendors in a single market while keeping humans in the approval loop for risky steps. If this produces enough qualified vendor conversations and signed supply relationships, later phases can extend the same spine into trade-customer nurture, inventory housekeeping, marketplace distribution, and higher-autonomy agents.

The value framing is intentionally practical: automate repeatable $25-$50/hr work, prove whether it unlocks qualified vendor pipeline, and let Eric/team trade up into $100+/hr and $250+/hr activities. All financial language below is illustrative and should be edited after discovery; no Florish operating numbers are assumed.

## Table of contents

1. Recommended MVP
2. Isaac-informed value framing
3. Value matrix by Eric priority
4. Proposed operating loop
5. Suggested architecture
6. Monthly software cost bands
7. Phased roadmap
8. Compliance and platform guardrails
9. Discovery questions for the call
10. Scope boundaries
11. Public research note
12. Eric email draft

## 1. Recommended MVP: one-market Vendor Enrollment Engine

**Build item:** Vendor Enrollment Engine for one market.

**Goal:** Prove that agents can take over the mundane growth-ops work around vendor enrollment without asking Florish to fund a full platform rebuild.

**Canonical data store:** Supabase, not Airtable.

**MVP outcomes to measure:**

- Number of vendor leads sourced
- Number of verified vendor records
- Number of approved outreach sequences launched
- Reply rate by channel and segment
- Discovery calls booked
- Vendors moved to enrollment / onboarding
- Opt-outs, bounces, and compliance exceptions
- Estimated manual hours avoided each week

## 2. Isaac-informed value framing

Internal positioning note from Isaac’s value framing: review Eric’s ask by priority, not as one undifferentiated automation request. For each priority, make the business value explicit through a What / Why / So What lens, tying it to revenue or pipeline value, labor displaced, and the opportunity-cost trade-up from $25-$50/hr work into $100+/hr or $250+/hr work. Use the numbers below as discovery placeholders, not claims about Florish’s current performance.

This should be used as proposal strategy and call framing, not as a quote to Eric. The client-facing version is: every automation priority gets evaluated by what it does, why it matters, and so what business value it can prove.

```text
Eric priority
  -> What operational loop are we automating?
  -> Why does that loop matter to revenue, supply, demand, or trust?
  -> So what proof would justify paying for the next phase?
  -> Labor moved from $25-$50/hr execution to $100+/hr or $250+/hr decisions
```

## 3. Value matrix by Eric priority

Assumptions: the revenue and labor language below is directional. It is meant to identify what to measure in discovery and the MVP, not to claim current Florish volumes, conversion rates, or revenue.

### Vendor enrollment engine

**Phase:** Paid MVP — first wedge

**What:** Source, dedupe, enrich, review, and nurture vendors in one market with Supabase as the enrollment spine.

**Why:** Marketplace supply is the prerequisite for every downstream Florish growth motion. Cleaner vendor density should make trade-customer demand easier to satisfy.

**So what:** Eric gets a measurable supply-growth loop instead of paying for a broad platform bet before the economics are visible.

- **Revenue unlocked / pipeline value:** Revenue unlocked / pipeline value: more qualified vendors can expand available supply, support more quote opportunities, and create the evidence needed to price later phases. Assumption to validate: value per enrolled vendor and expected conversion from vendor conversations to active supply.
- **Labor hours displaced:** Labor hours displaced: list building, vendor research, dedupe, enrichment, first-pass qualification, approved outreach prep, and weekly reporting.
- **Opportunity-cost trade-up:** Opportunity-cost trade-up: automate repetitive $25-$50/hr growth-ops work so Eric and senior operators can spend time on $100+/hr partnership, sales, market selection, and $250+/hr strategic deal decisions.
- **Concrete MVP proof metric:** Concrete MVP proof metric: one market produces a weekly scorecard for vendor leads sourced, verified records, approved outreach, reply rate, discovery calls booked, vendors moved to enrollment, and opt-outs/bounces.

### Trade-customer nurture

**Phase:** Future phase after supply proof

**What:** Segment trade customers, capture requests, route quote intent, and trigger nurture sequences once vendor coverage is credible.

**Why:** Demand-side nurture becomes more valuable when Florish can reliably match trade requests to available vendor supply.

**So what:** Florish can move from ad hoc follow-up to a pipeline motion that compounds every time supply coverage improves.

- **Revenue unlocked / pipeline value:** Revenue unlocked / pipeline value: improved conversion from captured trade interest into quote opportunities and repeatable demand signals. Assumption to validate: current lead volume, average job/order value, and drop-off points.
- **Labor hours displaced:** Labor hours displaced: manual follow-up reminders, status updates, request triage, lead tagging, and CRM hygiene.
- **Opportunity-cost trade-up:** Opportunity-cost trade-up: shift Eric/team away from low-value chase work into high-value account development, partner conversations, and offer refinement.
- **Concrete MVP proof metric:** Concrete proof metric: nurture cohort shows improved response rate, booked calls, quote requests, or reactivation rate versus a manually handled baseline.

### Inventory housekeeping

**Phase:** Future phase after vendor records are live

**What:** Detect stale listings, request vendor updates, normalize inventory fields, and route exceptions to humans.

**Why:** Fresh inventory data improves trust and reduces wasted sales cycles caused by unavailable or incorrect plant-material records.

**So what:** Florish protects marketplace credibility while reducing the operational drag of constantly checking vendor availability by hand.

- **Revenue unlocked / pipeline value:** Revenue unlocked / pipeline value: fresher supply data should reduce failed matches and make more opportunities actionable. Assumption to validate: frequency of stale inventory, lost opportunities, and manual update cadence.
- **Labor hours displaced:** Labor hours displaced: spreadsheet cleanup, reminder emails, record updates, stale-list detection, and exception tracking.
- **Opportunity-cost trade-up:** Opportunity-cost trade-up: move operator time from data janitorial work to supplier quality, margin, and customer-experience decisions.
- **Concrete MVP proof metric:** Concrete proof metric: percentage of vendor inventory records refreshed on schedule, stale records reduced, exceptions resolved, and manual update hours avoided.

### Marketplace / channel distribution

**Phase:** Future phase with platform-risk gate

**What:** Normalize approved listings and distribute them to selected marketplace or channel experiments with audit trails and platform guardrails.

**Why:** Distribution can amplify supply and demand, but it carries compliance, brand, and platform-policy risk if automated too early.

**So what:** Florish can test channel leverage without betting the business on brittle scraping, posting, or marketplace automations.

- **Revenue unlocked / pipeline value:** Revenue unlocked / pipeline value: channel experiments may open incremental demand or supplier discovery. Assumption to validate: target channels, allowed workflows, policy constraints, and measurable attribution.
- **Labor hours displaced:** Labor hours displaced: listing formatting, channel-specific prep, status reconciliation, and manual experiment reporting.
- **Opportunity-cost trade-up:** Opportunity-cost trade-up: keep Eric/team focused on channel strategy and partner economics instead of copy-pasting listings across surfaces.
- **Concrete MVP proof metric:** Concrete proof metric: approved channel test publishes normalized listings, records attribution, flags policy exceptions, and reports qualified opportunities per channel.


## 4. Proposed operating loop

```text
Market definition
      |
      v
Lead source pull: Google Places / SerpAPI / Apify / Apollo / Clay
      |
      v
Normalize + dedupe into Supabase vendor records
      |
      v
Enrich: website, category, service area, phone, email, notes
      |
      v
Human review queue: approve / reject / needs research
      |
      v
Outreach: email first, optional compliant SMS only when appropriate
      |
      v
Conversation capture + meeting booking
      |
      v
Enrollment status + next action in Supabase
      |
      v
Weekly value proof: pipeline created + hours avoided + next-phase evidence
```

## 5. Suggested architecture

**Supabase** is the canonical operating database:

- `vendors`
- `vendor_locations`
- `contacts`
- `lead_sources`
- `outreach_events`
- `enrollment_status`
- `compliance_events`
- `labor_savings_estimates`
- `audit_log`

**Automation layer:** lightweight workers and scheduled jobs for sourcing, enrichment, dedupe, sequence preparation, exception routing, and reporting.

**Human interface:** a simple review dashboard or operator view for approving leads, reviewing copy, seeing replies, and tracking enrollment status.

**Messaging / CRM options:**

- GoHighLevel: useful if Florish wants CRM, pipeline, calendar, landing pages, and SMS/email workflows in one operator tool.
- Supabase: system of record, audit trail, queue state, and metrics.
- Twilio: SMS only where consent and TCPA posture are clear.
- Postmark or SendGrid: transactional or carefully managed outbound email.
- Instantly or Smartlead: higher-volume cold email sequencing if deliverability is managed seriously.
- Apollo / Clay: lead enrichment and list-building assistance.
- Google Places / SerpAPI / Apify: public web / local-market discovery.
- Calendly or GHL Calendar: simple meeting booking.

## 6. Estimated monthly software costs, excluding development labor

These are directional planning bands, not vendor quotes.

### Lean MVP: approximately $100–$350 / month

- Supabase starter / pro: $25–$50
- Email provider: $15–$50
- Small sourcing / scraping budget: $50–$150
- Domain inbox tooling / warmup / basic deliverability: $20–$100
- Calendar: $0–$20

Best when: validating one market with low volume and human review.

### Serious MVP: approximately $500–$1,500 / month

- Supabase Pro with backups: $25–$100
- GoHighLevel or comparable CRM: $97–$297+
- Instantly / Smartlead: $40–$200+
- Apollo / Clay / enrichment credits: $100–$600+
- SerpAPI / Apify / Places-related usage: $100–$400+
- Postmark / SendGrid and deliverability tooling: $50–$200+
- Twilio reserved for compliant follow-up: usage-based

Best when: one market needs real outreach volume, structured pipelines, and repeatable weekly reporting.

### Scale Pilot: approximately $2,000–$5,000+ / month

- Higher-volume enrichment / sourcing credits
- Multiple domains / inboxes / deliverability monitoring
- CRM + sequencing + calendar + call tracking
- Expanded Supabase usage, backups, logging, analytics
- More robust monitoring, data QA, and reporting

Best when: Florish has proven the wedge and wants multiple markets or vendor segments.

## 7. Phased roadmap after MVP

### Phase 1 — Vendor Enrollment Engine

- One market
- Vendor sourcing
- Supabase vendor spine
- Human approval queue
- Email-first nurture
- Enrollment KPI dashboard
- Value proof: pipeline created, hours avoided, next-phase evidence

### Phase 2 — Multi-market vendor expansion

- Market templates
- Duplicate detection across regions
- Vendor category segmentation
- Regional performance comparisons

### Phase 3 — Trade-customer nurture

- Trade customer lead capture
- Segmented nurture paths
- Quote / request intake routing
- CRM handoff or GHL pipeline integration

### Phase 4 — Inventory housekeeping

- Vendor inventory refresh reminders
- Stale listing detection
- Structured update workflows
- Exception queues for human review

### Phase 5 — Marketplace distribution

- Listing normalization
- Distribution to approved channels
- Marketplace feed experiments
- Strict platform-risk review for Meta / Facebook Marketplace and similar channels

### Phase 6 — Higher autonomy

- Agent recommendations
- Automatic task assignment
- Weekly growth-ops briefings
- Guardrailed autonomous actions for low-risk workflows

## 8. Compliance and platform guardrails

The system should be designed with compliance first, not bolted on later.

- Cold SMS: avoid unless there is a clear consent basis and compliant opt-out path.
- TCPA: treat phone outreach as high-risk until reviewed.
- CAN-SPAM: include sender identity, opt-out handling, suppression lists, and truthful subject lines.
- Email deliverability: use dedicated domains/inboxes, warmup, bounce handling, and throttling.
- Meta / Facebook Marketplace: treat automation and scraping/distribution as platform-risky; avoid brittle or policy-violating automations.
- Opt-outs: centralize suppression records in Supabase.
- Audit logs: record source, message, approval, send event, reply, status change, and operator.
- Human approvals: keep humans in the loop for first-contact copy, edge cases, and channel expansion.

## 9. Discovery questions for Eric

1. What exact market should the first MVP target?
2. What vendor category has the highest supply-side leverage?
3. What counts as an enrolled vendor for Florish?
4. What vendor data does Florish already have?
5. What systems are already in use: CRM, email, SMS, marketplace backend, spreadsheets?
6. Does Florish already have approved outreach domains / inboxes?
7. Are vendors primarily reached by email, phone, text, forms, or social?
8. What outreach claims are safe to make today?
9. What compliance posture does Florish want for SMS?
10. Who approves vendor leads and first-contact messages?
11. How should meetings be booked and handed off?
12. What weekly KPI would make the MVP obviously worth expanding?
13. What is the current manual time spent on vendor sourcing, cleanup, follow-up, and reporting?
14. What is the best editable assumption for value per enrolled vendor, qualified trade opportunity, and avoided manual hour?

## 10. Scope boundaries

Included in MVP:

- One market
- Vendor lead discovery and enrichment
- Supabase schema and workflow state
- Human review queue
- Initial outreach sequence setup
- KPI reporting
- Audit and suppression basics
- Value proof scorecard for pipeline created and hours avoided

Not included in MVP:

- Full two-sided marketplace automation
- Fully autonomous SMS programs
- Inventory management rebuild
- Marketplace distribution engine
- Multi-market scaling
- Deep CRM migration
- Paid ad automation

## 11. Proposed call positioning

The call should align on a paid MVP, not a speculative full build. A strong close is:

> “Let’s prove the vendor-enrollment loop in one market first. If the engine creates qualified vendor conversations, cleaner enrollment data, and measurable labor displacement, then we can price the next build phase around the real operating value instead of guessing.”

## 12. Public research note

Public footprint is limited. Search results show Eric Ferguson associated with Florish Technologies, Inc. and Chandler, AZ signals; the email thread remains the strongest source. This proposal therefore assumes Florish is a plant-material marketplace / sourcing platform and keeps discovery questions explicit.

## Email draft to Eric

Subject: Florish vendor enrollment MVP

Hi Eric,

Thanks again for the context. I think the best first move is to keep this small and measurable rather than trying to automate the whole Florish growth engine at once.

The wedge I would recommend is a one-market Vendor Enrollment Engine. The idea is to use Supabase as the source of truth, pull together a clean vendor lead pipeline for one target market, enrich and dedupe those records, put the risky steps behind a human approval queue, and then run a measured email-first nurture/enrollment loop.

The reason I like this wedge is that it gives us a practical value test: can agents remove the repetitive $25-$50/hr growth-ops work, create qualified vendor conversations, and free you up for higher-value partner, sales, and strategic decisions?

If that works, the same spine can expand into trade-customer nurture, inventory housekeeping, marketplace distribution, and higher-autonomy workflows. But I would rather prove the first loop and then price later phases around real operating evidence instead of guessing.

For our call, I’d like to pin down:

- the first market,
- the vendor segment with the most leverage,
- what “enrolled vendor” means operationally,
- what systems you already have in place,
- and what weekly KPI would make this MVP obviously worth scaling.

I put together a short proposal package around that shape so we can use it as the call agenda.

Best,
Greg

