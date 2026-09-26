#!/usr/bin/env python
"""Stage 1: validate + normalize prospect intake -> <workdir>/intake.json."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from urllib.parse import urlparse

from _common import (
    FIXTURES, dump_json, fail_gate, load_schema, load_structured, slugify, workdir_arg,
)


def public_url_errors(url: str, label: str) -> list[str]:
    parsed = urlparse(url or "")
    errors = []
    if parsed.scheme not in ("http", "https"):
        errors.append(f"{label}: '{url}' is not a public http(s) URL")
    if parsed.username or parsed.password:
        errors.append(f"{label}: credentials embedded in URL are forbidden")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    parser.add_argument("--intake", help="Intake YAML/JSON path")
    parser.add_argument("--fixture", action="store_true",
                        help="Use the bundled acme-sample fixture intake")
    args = parser.parse_args()

    intake_path = Path(args.intake) if args.intake else None
    if args.fixture:
        intake_path = FIXTURES / "acme-sample" / "intake.yaml"
    if not intake_path or not intake_path.exists():
        print("ERROR: provide --intake <file> or --fixture", file=sys.stderr)
        return 2

    intake = load_structured(intake_path)
    errors = validate_intake(intake)
    if errors:
        fail_gate(errors, "intake")

    company_name = intake.get("company_name") or urlparse(intake["company_url"]).hostname or "prospect"
    normalized = {
        **intake,
        "company_name": company_name,
        "prospect_slug": slugify(company_name),
        "prospect": intake.get("prospect") or {},
        "optional_context": intake.get("optional_context") or [],
    }
    workdir = Path(args.workdir)
    dump_json(workdir / "intake.json", normalized)
    print(f"OK intake normalized slug={normalized['prospect_slug']} -> {workdir / 'intake.json'}")
    return 0


def validate_intake(intake) -> list[str]:
    from _common import validate_schema
    errors = validate_schema(intake, load_schema("intake.schema.json"), "intake")
    if isinstance(intake, dict):
        errors += public_url_errors(intake.get("company_url", ""), "company_url")
        profile_url = (intake.get("prospect") or {}).get("public_profile_url")
        if profile_url:
            errors += public_url_errors(profile_url, "prospect.public_profile_url")
    return errors


if __name__ == "__main__":
    sys.exit(main())
