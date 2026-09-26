#!/usr/bin/env python
"""Stage 2: package public company facts + citations -> research-citations.json.

Deterministic packaging, not autonomous crawling: facts arrive via a sources
file (agent-collected or fixture) and this stage enforces the citation policy —
public http(s) URLs only, every fact carries at least one source, and
confidence labels are honest (a fact with no source can only be `needs_call`).
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from urllib.parse import urlparse

from _common import (
    FIXTURES, dump_json, fail_gate, load_artifact, load_schema, load_structured,
    validate_schema, workdir_arg,
)

PRIVATE_HOST_MARKERS = ("localhost", "127.0.0.1", "0.0.0.0", ".local", ".internal")
AUTH_PATH_MARKERS = ("/login", "/signin", "/account", "/admin", "/dashboard")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    parser.add_argument("--sources", help="Facts+sources YAML/JSON collected from public pages")
    parser.add_argument("--fixture", action="store_true", help="Use the bundled acme-sample sources")
    args = parser.parse_args()

    workdir = Path(args.workdir)
    intake = load_artifact(workdir, "intake.json")

    sources_path = Path(args.sources) if args.sources else None
    if args.fixture:
        sources_path = FIXTURES / "acme-sample" / "sources.yaml"
    if not sources_path or not sources_path.exists():
        print("ERROR: provide --sources <file> or --fixture", file=sys.stderr)
        return 2

    payload = load_structured(sources_path)
    citations = {
        "schema_version": "tac-research-citations.v1",
        "company_url": intake["company_url"],
        "facts": payload.get("facts", []),
    }

    errors = validate_schema(citations, load_schema("research-citations.schema.json"), "research")
    errors += policy_errors(citations)
    if errors:
        fail_gate(errors, "research-citation-policy")

    dump_json(workdir / "research-citations.json", citations)
    verified = sum(1 for f in citations["facts"] if f["confidence"] == "verified")
    print(f"OK research packaged: {len(citations['facts'])} facts ({verified} verified) -> research-citations.json")
    return 0


def policy_errors(citations: dict) -> list[str]:
    errors = []
    for fact in citations.get("facts", []):
        fid = fact.get("fact_id", "?")
        sources = fact.get("sources", [])
        if fact.get("confidence") == "verified" and not sources:
            errors.append(f"fact {fid}: 'verified' requires at least one public source")
        if not sources and fact.get("confidence") != "needs_call":
            errors.append(f"fact {fid}: sourceless facts must be labeled 'needs_call'")
        for src in sources:
            url = src.get("url", "")
            parsed = urlparse(url)
            if parsed.scheme not in ("http", "https"):
                errors.append(f"fact {fid}: source '{url}' is not public http(s)")
            host = (parsed.hostname or "").lower()
            if any(marker in host for marker in PRIVATE_HOST_MARKERS):
                errors.append(f"fact {fid}: source host '{host}' is not a public surface")
            if any(marker in parsed.path.lower() for marker in AUTH_PATH_MARKERS):
                errors.append(f"fact {fid}: source path '{parsed.path}' looks authenticated/private")
    return errors


if __name__ == "__main__":
    sys.exit(main())
