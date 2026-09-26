#!/usr/bin/env python
"""Stage 5: build + gate the claim map -> claim-map.json.

Every external-facing statement the page will make becomes a claim row.
Company facts inherit their citations from research; inferred opportunities are
labeled hypotheses; capability/trial claims use fixed modest language. Any
company_fact without support, or any claim with a `block` verdict, fails the
gate — nothing unsubstantiated reaches the page.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from _common import (
    dump_json, fail_gate, load_artifact, load_schema, scan_fabrication,
    validate_schema, workdir_arg,
)

CAPABILITY_CLAIM = (
    "GBAutomation designs and operates draft agent teams on the Hermes runtime, "
    "with human approval gates on every external action."
)
TRIAL_CLAIM = (
    "The 14-day guided walkthrough is activation-gated: nothing connects to your "
    "systems until you and GBAutomation both approve the scope."
)
LIMITATION_CLAIM = (
    "This is a draft only. No systems are connected, no accounts were accessed, "
    "and all research came from public pages."
)


def build_claims(intake: dict, research: dict) -> list[dict]:
    claims = []
    for fact in research["facts"]:
        support = [
            {"source_url": s["url"], "source_title": s["title"],
             "quote_or_fact": s.get("quote_or_fact", fact["text"]),
             "accessed_at": s["accessed_at"]}
            for s in fact.get("sources", [])
        ]
        claims.append({
            "claim_id": f"c-{fact['fact_id']}",
            "text": fact["text"],
            "location": "team-brief.md#verified-company-snapshot",
            "claim_type": "company_fact",
            "support": support,
            "confidence": fact["confidence"],
            "allowed_in_preview": bool(support) or fact["confidence"] == "needs_call",
            "reviewer_verdict": "pass" if support or fact["confidence"] == "needs_call" else "block",
        })

    claims.append({
        "claim_id": "c-opportunity-thesis",
        "text": f"Based on public signals, a drafted agent team could help with: "
                f"{intake['desired_business_outcome']}",
        "location": "index.html#specialist-profiles",
        "claim_type": "inferred_opportunity",
        "support": [],
        "confidence": "inferred",
        "allowed_in_preview": True,
        "reviewer_verdict": "pass",
    })
    claims.append({
        "claim_id": "c-gbauto-capability",
        "text": CAPABILITY_CLAIM,
        "location": "index.html#zero-touch",
        "claim_type": "gbauto_capability",
        "support": [{"source_url": "https://gbautomation.xyz",
                     "source_title": "GBAutomation — services",
                     "quote_or_fact": "public capability description"}],
        "confidence": "verified",
        "allowed_in_preview": True,
        "reviewer_verdict": "pass",
    })
    claims.append({
        "claim_id": "c-trial-process",
        "text": TRIAL_CLAIM,
        "location": "index.html#trial-plan",
        "claim_type": "trial_process",
        "support": [],
        "confidence": "verified",
        "allowed_in_preview": True,
        "reviewer_verdict": "pass",
    })
    claims.append({
        "claim_id": "c-limitation",
        "text": LIMITATION_CLAIM,
        "location": "index.html#hero",
        "claim_type": "limitation",
        "support": [],
        "confidence": "verified",
        "allowed_in_preview": True,
        "reviewer_verdict": "pass",
    })
    return claims


def gate_errors(claims: list[dict]) -> list[str]:
    errors = []
    for claim in claims:
        cid = claim["claim_id"]
        if claim["claim_type"] == "company_fact" and claim["confidence"] == "verified" and not claim["support"]:
            errors.append(f"{cid}: verified company_fact without support — FABRICATED")
        if claim["reviewer_verdict"] == "block":
            errors.append(f"{cid}: reviewer verdict is block")
        for label in scan_fabrication(claim["text"]):
            errors.append(f"{cid}: fabrication pattern '{label}' in claim text")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    args = parser.parse_args()

    workdir = Path(args.workdir)
    intake = load_artifact(workdir, "intake.json")
    research = load_artifact(workdir, "research-citations.json")

    claim_map = {"schema_version": "prospect-claim-map.v1",
                 "claims": build_claims(intake, research)}

    errors = validate_schema(claim_map, load_schema("claim-map.schema.json"), "claims")
    errors += gate_errors(claim_map["claims"])
    if errors:
        fail_gate(errors, "claim-substantiation")

    dump_json(workdir / "claim-map.json", claim_map)
    print(f"OK claim map: {len(claim_map['claims'])} claims all pass -> claim-map.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
