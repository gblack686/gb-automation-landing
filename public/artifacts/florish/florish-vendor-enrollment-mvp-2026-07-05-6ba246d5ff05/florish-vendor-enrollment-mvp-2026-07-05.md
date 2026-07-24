---
type: proposal
client: florish
project: vendor-enrollment-engine-mvp
title: "Florish — Vendor Enrollment Engine MVP Proposal"
created: 2026-07-05
status: draft-for-greg-review
tags: [client/florish, proposal, vendor-enrollment, supabase, growth-ops]
---

# Florish — Vendor Enrollment Engine MVP Proposal

Prepared for Eric Ferguson / Florish Technologies, Inc.  
Prepared by GB Automation / GB Auto  
Date: 2026-07-05

> Recommended first paid build: a focused, one-market Vendor Enrollment Engine that proves measurable vendor supply growth before Florish commits to a broader automation platform.

## Executive summary

Florish does not need a giant automation platform first. The highest-leverage starting point is a small, measurable MVP: one market, one vendor segment, one operating loop, and Supabase as the canonical system of record.

The MVP should help Florish find, qualify, contact, nurture, and enroll plant-material vendors in a single market while keeping humans in the approval loop for risky steps. If this produces enough qualified vendor conversations and signed supply relationships, later phases can extend the same spine into multi-market vendor coverage, trade-customer nurture, inventory housekeeping, marketplace distribution, and higher-autonomy agents.

## Table of contents

1. Recommended MVP
2. Why this wedge
3. Proposed system design
4. Monthly software cost bands
5. Phased roadmap
6. Compliance and platform guardrails
7. Discovery questions for the call
8. Eric email draft

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

## 2. Why this wedge

Vendor enrollment appears to be the single needle-moving first build because it creates marketplace supply. Trade-customer nurture, inventory housekeeping, and distribution automation become more valuable once Florish has better vendor density and fresher supplier records.

This MVP is intentionally narrow:

- One geography or market
- One vendor persona / segment
- One source-of-truth schema
- One human approval queue
- One outreach and enrollment loop
- One weekly KPI review

## 3. Proposed operating loop

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
```

## 4. Suggested architecture

**Supabase** is the canonical operating database:

- `vendors`
- `vendor_locations`
- `contacts`
- `lead_sources`
- `outreach_events`
- `enrollment_status`
- `compliance_events`
- `audit_log`

**Automation layer:** lightweight workers and scheduled jobs for sourcing, enrichment, dedupe, sequence preparation, and reporting.

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

## 5. Estimated monthly software costs, excluding development labor

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

## 6. Phased roadmap after MVP

### Phase 1 — Vendor Enrollment Engine

- One market
- Vendor sourcing
- Supabase vendor spine
- Human approval queue
- Email-first nurture
- Enrollment KPI dashboard

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

## 7. Compliance and platform guardrails

The system should be designed with compliance first, not bolted on later.

- Cold SMS: avoid unless there is a clear consent basis and compliant opt-out path.
- TCPA: treat phone outreach as high-risk until reviewed.
- CAN-SPAM: include sender identity, opt-out handling, suppression lists, and truthful subject lines.
- Email deliverability: use dedicated domains/inboxes, warmup, bounce handling, and throttling.
- Meta / Facebook Marketplace: treat automation and scraping/distribution as platform-risky; avoid brittle or policy-violating automations.
- Opt-outs: centralize suppression records in Supabase.
- Audit logs: record source, message, approval, send event, reply, status change, and operator.
- Human approvals: keep humans in the loop for first-contact copy, edge cases, and channel expansion.

## 8. Discovery questions for Eric

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

## 9. Scope boundaries

Included in MVP:

- One market
- Vendor lead discovery and enrichment
- Supabase schema and workflow state
- Human review queue
- Initial outreach sequence setup
- KPI reporting
- Audit and suppression basics

Not included in MVP:

- Full two-sided marketplace automation
- Fully autonomous SMS programs
- Inventory management rebuild
- Marketplace distribution engine
- Multi-market scaling
- Deep CRM migration
- Paid ad automation

## 10. Proposed call positioning

The call should align on a paid MVP, not a speculative full build. A strong close is:

> “Let’s prove the vendor-enrollment loop in one market first. If the engine creates qualified vendor conversations and cleaner enrollment data, then we can price the next build phase around the real operating value instead of guessing.”

## 11. Public research note

Public footprint is limited. Search results show Eric Ferguson associated with Florish Technologies, Inc. and Chandler, AZ signals; the email thread remains the strongest source. This proposal therefore assumes Florish is a plant-material marketplace / sourcing platform and keeps discovery questions explicit.

## Email draft to Eric

Subject: Florish vendor enrollment MVP

Hi Eric,

Thanks again for the context. I think the best first move is to keep this small and measurable rather than trying to automate the whole Florish growth engine at once.

The wedge I would recommend is a one-market Vendor Enrollment Engine. The idea is to use Supabase as the source of truth, pull together a clean vendor lead pipeline for one target market, enrich and dedupe those records, put the risky steps behind a human approval queue, and then run a measured email-first nurture/enrollment loop.

That gives us a practical way to answer the real question: can agents take meaningful mundane growth-ops work off your plate and create qualified vendor conversations without creating compliance or platform risk?

If that works, the same spine can expand into multi-market vendor coverage, trade-customer nurture, inventory housekeeping, marketplace distribution, and higher-autonomy workflows. But I would rather prove the first loop and then talk about the true compensation for later phases once we can see the value clearly.

For our call, I’d like to pin down:

- the first market,
- the vendor segment with the most leverage,
- what “enrolled vendor” means operationally,
- what systems you already have in place,
- and what weekly KPI would make this MVP obviously worth scaling.

I put together a short proposal package around that shape so we can use it as the call agenda.

Best,
Greg
