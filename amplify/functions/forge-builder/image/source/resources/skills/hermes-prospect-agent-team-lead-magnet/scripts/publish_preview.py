#!/usr/bin/env python
"""Stage 11: GATED Netlify preview publish (Gate 3).

This stage REFUSES to deploy unless BOTH are present:
  1. the --approve-gate-3 flag, and
  2. env GBAUTO_LEADMAGNET_GATE3_APPROVED=yes

Without them it prints the gate contract and exits 2 (blocked). With them it
requires a passing validation receipt and smoke report, then shells out to the
Netlify CLI in draft (preview) mode — never a production route — and readback-
verifies the served content before writing netlify-preview-receipt.json.
"""
from __future__ import annotations

import argparse
import fnmatch
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

from _common import dump_json, load_structured, workdir_arg

GATE_ENV = "GBAUTO_LEADMAGNET_GATE3_APPROVED"

# NEVER deployed: generation inputs and run debris that are not part of the
# output contract. assets/seed enforces the "seed art never ships" promise;
# logs/last-message files are raw subagent output. --strip-mtg additionally
# withholds the WotC demo art for prospect-facing (Gate-4-bound) bundles.
INTERNAL_PATTERNS = [
    "assets/seed/*", "*.log", "*-last-message.txt", "intake.input.*",
]
MTG_PATTERNS = ["assets/mtg/*", "mtg-art-manifest.json"]


def deployable(rel_path: str, strip_mtg: bool) -> bool:
    rel = rel_path.replace("\\", "/")
    patterns = INTERNAL_PATTERNS + (MTG_PATTERNS if strip_mtg else [])
    return not any(fnmatch.fnmatch(rel, p) or fnmatch.fnmatch(Path(rel).name, p)
                   for p in patterns)


def stage_deploy_dir(workdir: Path, dest: Path, strip_mtg: bool) -> tuple[int, int]:
    """Copy only deployable files into dest; returns (copied, excluded)."""
    copied = excluded = 0
    for path in sorted(workdir.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(workdir).as_posix()
        if not deployable(rel, strip_mtg):
            excluded += 1
            continue
        target = dest / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
        copied += 1
    return copied, excluded


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    parser.add_argument("--approve-gate-3", action="store_true",
                        help="Human Gate-3 approval flag (must pair with env var)")
    parser.add_argument("--site", help="Netlify site id/name for the draft deploy")
    parser.add_argument("--strip-mtg", action="store_true",
                        help="Withhold WotC demo art from the deployed bundle "
                             "(required posture for prospect-facing finals)")
    args = parser.parse_args()

    if not args.approve_gate_3 or os.environ.get(GATE_ENV) != "yes":
        print("BLOCKED [gate-3]: Netlify preview publication requires explicit human approval.")
        print(f"  Provide BOTH --approve-gate-3 AND {GATE_ENV}=yes to proceed.")
        print("  Gate 3 approves PREVIEW ONLY — prospect send remains Gate 4.")
        return 2

    workdir = Path(args.workdir)
    for artifact, key in (("validation-receipt.json", "overall"), ("smoke-report.json", "overall")):
        path = workdir / artifact
        if not path.exists() or load_structured(path)[key] != "pass":
            print(f"BLOCKED [gate-2]: {artifact} missing or not passing — publish refused.")
            return 2
    if not args.site:
        print("ERROR: --site required for an approved deploy", file=sys.stderr)
        return 2

    with tempfile.TemporaryDirectory(prefix="leadmagnet-deploy-") as staged:
        copied, excluded_n = stage_deploy_dir(workdir, Path(staged), args.strip_mtg)
        print(f"  staged {copied} files ({excluded_n} internal files withheld"
              + (", mtg stripped" if args.strip_mtg else "") + ")")
        result = subprocess.run(
            ["netlify", "deploy", "--dir", staged, "--site", args.site, "--json"],
            capture_output=True, text=True, shell=(os.name == "nt"),
        )
    if result.returncode != 0:
        print(f"ERROR: netlify deploy failed:\n{result.stderr}", file=sys.stderr)
        return 1
    deploy = json.loads(result.stdout)
    draft_url = deploy.get("deploy_url") or deploy.get("url")

    with urllib.request.urlopen(draft_url, timeout=30) as resp:
        body = resp.read().decode("utf-8", errors="replace")
        content_type = resp.headers.get("Content-Type", "")
    readback_ok = "text/html" in content_type and "Drafted for a Hermes-based guided walkthrough" in body

    receipt = {
        "schema_version": "leadmagnet-netlify-preview-receipt.v1",
        "deploy_url": draft_url,
        "production": False,
        "content_type": content_type,
        "readback_verified": readback_ok,
        "gate_3_approved_via": f"--approve-gate-3 + {GATE_ENV}",
        "gate_4_prospect_send": "NOT approved by this receipt",
        "files_deployed": copied,
        "internal_files_withheld": excluded_n,
        "mtg_stripped": args.strip_mtg,
    }
    dump_json(workdir / "netlify-preview-receipt.json", receipt)
    if not readback_ok:
        print("ERROR: readback verification failed — deployed content is not the PRD page", file=sys.stderr)
        return 1
    print(f"OK preview deployed (draft) {draft_url} readback verified -> netlify-preview-receipt.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
