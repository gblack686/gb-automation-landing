#!/usr/bin/env python3
"""Render every expert family's justfile from the §1F standard.

The standard (STANDARD below) is the single source: header, settings, variables,
default, deterministic, dry-run, agentic, domain-verbs, remote, managed prime
block. A family's own recipes — anything not in the standard set — are carried
verbatim into the `domain-verbs` section, comments included, so re-rendering
never loses them. Everything else is overwritten.

  python scripts/render_expert_justfiles.py --check            # exit 1 on drift (CI)
  python scripts/render_expert_justfiles.py --write            # render all families + template
  python scripts/render_expert_justfiles.py --write --expert ecom
  python scripts/render_expert_justfiles.py --diff --expert ecom

Registry: config/justfile-section-registry.yaml (profile `expert-family`).
Spec: second-brain/systems/gbauto-config-spec.md §1F.
"""
from __future__ import annotations

import argparse
import difflib
import re
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
import justfile_registry_check as jrc  # noqa: E402

TREES = ("consulting", "gbautomation")

STANDARD = '''# @@TITLE@@ expert — operator recipes. `just --list` to browse.
#
# Rendered from the §1F standard by scripts/render_expert_justfiles.py — change
# the standard there, not here. Family-specific recipes live under `domain-verbs`
# and survive re-rendering; everything else is overwritten. Deterministic recipes
# run code and print facts. Agentic recipes hand the same work to Claude Code
# through this family's routes. Nothing here applies a change without the recipe
# that says apply.
#
# NOTE: `just` uses {{ }} for its own interpolation. Anything in braces below is
# just(1) syntax, not a scaffold placeholder.

# ------------------------------------------------------------------- settings
# dotenv for local overrides; a POSIX shell on every OS so Codex (PowerShell on
# Windows) and Claude Code (bash) run the same recipe text.

set dotenv-load := true
set windows-shell := ["sh", "-cu"]

# ------------------------------------------------------------------ variables
# `root` is always resolved from git — never a hardcoded path. `profile` is the
# Hermes distribution name this family installs on the Mac Mini.

expert  := "@@EXPERT@@"
tree    := "@@TREE@@"
profile := "expert-" + tree + "-" + expert
root    := `git rev-parse --show-toplevel`
mm      := "bash " + root + "/resources/skills/mac-mini-ssh/scripts/mm.sh"

# List all recipes (a bare `just` browses, never runs)
default:
    @just --list

# -------------------------------------------------------------- deterministic

# Install drift: is this expert's repo copy in sync with ~/.claude?
check:
    cd "{{root}}" && bash scripts/install_experts.sh --check {{expert}}

# Sync THIS expert repo -> ~/.claude (backs up first). Gated: run `just check` first.
install:
    cd "{{root}}" && bash scripts/install_experts.sh --apply {{expert}}

# Re-check after an apply — must report IN-SYNC to count as complete
verify:
    cd "{{root}}" && bash scripts/install_experts.sh --check {{expert}}

# Source drift: has the ground truth behind expertise.md moved?
drift:
    cd "{{root}}" && python scripts/check_expert_source_drift.py --expert {{expert}}

# Which of the standard routes does this family actually have?
routes:
    @ls -1 "{{justfile_directory()}}"/*.md | xargs -n1 basename | sed 's/\\.md$//' | sort

# Run this expert's CI gate: lint, every owned pytest module, and this
# family's tests/ doc replay if it ships one. A real failure fails this recipe.
test:
    cd "{{root}}" && python scripts/expert_ci_gate.py --expert {{expert}} --replay

# All deterministic checks, error-tolerant (one finding must not abort the rest)
audit:
    @echo "--- install drift ---"
    -@just check
    @echo "--- source drift ---"
    -@just drift
    @echo "--- routes present ---"
    -@just routes
    @echo "--- tests ---"
    -@just test

# -------------------------------------------------------------------- dry-run
# Every write-capable recipe has a plan-only twin. `install` writes; this lists.

# Plan only — what `just install` would sync, without syncing
install-dry:
    cd "{{root}}" && bash scripts/install_experts.sh --check {{expert}}

# -------------------------------------------------------------------- agentic
# One route call per recipe. Domain logic lives in the route file, never here.

# Ask a read-only question of this expert
question q:
    claude "/experts:{{expert}}:question {{q}}"

# Propose a change (produces a plan; applies nothing)
plan req:
    claude "/experts:{{expert}}:plan {{req}}"

# Validate expertise.md against live sources and propose updates
improve:
    claude "/experts:{{expert}}:self-improve"

# Query the second-brain knowledge graph for this domain
graph q="--freshness":
    claude "/experts:{{expert}}:graph {{q}}"

# Three-axis drift report: install, model, structural
maintain:
    claude "/experts:{{expert}}:maintenance"

# Full ACT -> LEARN -> REUSE chain (halts for approval after the plan)
pbi req:
    claude "/experts:{{expert}}:plan_build_improve {{req}}"

# --------------------------------------------------------------- domain-verbs
# Family-specific, additive. A write-capable verb ends in -apply and has a
# read-only sibling. Preserved verbatim when this file is re-rendered.

@@DOMAIN_VERBS@@
# --------------------------------------------------------------------- remote
# Runs on the Mac Mini through mm.sh (never raw ssh). Read-only. `just` is not
# installed on the Mini — recipes stay thin so crons call the same scripts.

# Is this family's Hermes profile installed on the Mini, and what did it last log?
remote-status:
    {{mm}} 'p="$HOME/.hermes/profiles/{{profile}}"; if [ -d "$p" ]; then echo "$p"; ls -t "$p/logs" 2>/dev/null | head -5; else echo "{{profile}}: not installed on this Mini"; fi'

# BEGIN MANAGED EXPERT PRIME RECIPE
# Refresh bounded current context through the shared PRIME engine
prime:
    claude "/experts:{{expert}}:prime"
# END MANAGED EXPERT PRIME RECIPE
'''

STANDARD_RECIPES = frozenset({
    "default", "check", "install", "verify", "drift", "routes", "test", "audit",
    "install-dry", "question", "plan", "improve", "graph", "maintain", "pbi",
    "remote-status", "prime",
})
NO_VERBS = "# (no family-specific recipes yet)\n"


@dataclass(frozen=True)
class Family:
    tree: str
    slug: str
    directory: Path

    @property
    def justfile(self) -> Path:
        return self.directory / "justfile"

    @property
    def is_template(self) -> bool:
        return self.slug.startswith("_")


def iter_families(repo_root: Path = REPO_ROOT, include_template: bool = True) -> list[Family]:
    out: list[Family] = []
    for tree in TREES:
        root = repo_root / "experts" / tree
        if not root.is_dir():
            continue
        for d in sorted(root.iterdir(), key=lambda p: p.name):
            if not d.is_dir() or not (d / "justfile").is_file():
                continue
            if d.name.startswith("_"):
                if include_template and d.name == "_template":
                    out.append(Family(tree, d.name, d))
                continue
            out.append(Family(tree, d.name, d))
    return out


def family_title(fam: Family) -> str:
    if fam.is_template:
        return "{{EXPERT_TITLE}}"
    banner = fam.directory / f"_{fam.slug}.md"
    if banner.is_file():
        m = re.search(r"^specialty:\s*[\"']?(.+?)[\"']?\s*$", banner.read_text(encoding="utf-8"), re.M)
        if m and "{{" not in m.group(1):
            return m.group(1).strip()
    return fam.slug.replace("-", " ").title()


def extract_domain_verbs(existing: str) -> str:
    """Return the verbatim block of non-standard recipes (comments + body), or ''."""
    lines = existing.replace("\r\n", "\n").split("\n")
    defs: list[tuple[int, str]] = []
    for i, ln in enumerate(lines):
        if ln.startswith((" ", "\t", "#")) or not ln.strip():
            continue
        if jrc.SET_RE.match(ln) or jrc.ALIAS_RE.match(ln) or jrc.ASSIGN_RE.match(ln) or ln.startswith("["):
            continue
        m = jrc.RECIPE_RE.match(ln)
        if m:
            defs.append((i, m.group(1)))
    chunks: list[str] = []
    for idx, (start, name) in enumerate(defs):
        if name in STANDARD_RECIPES:
            continue
        end = defs[idx + 1][0] if idx + 1 < len(defs) else len(lines)
        body_end = start + 1
        while body_end < end and (lines[body_end].startswith((" ", "\t")) or not lines[body_end].strip()):
            body_end += 1
        top = start
        while top - 1 >= 0 and lines[top - 1].startswith("#") \
                and not jrc.SEPARATOR_RE.match(lines[top - 1]) \
                and not jrc.MANAGED_BEGIN_RE.match(lines[top - 1]) \
                and not jrc.MANAGED_END_RE.match(lines[top - 1]):
            top -= 1
        chunk = "\n".join(lines[top:body_end]).rstrip("\n")
        if chunk:
            chunks.append(chunk)
    return ("\n\n".join(chunks) + "\n") if chunks else ""


def render(fam: Family, existing: str | None = None) -> str:
    if fam.is_template:
        expert, tree = "{{EXPERT}}", "{{TREE}}"
    else:
        expert, tree = fam.slug, fam.tree
    verbs = extract_domain_verbs(existing or "") or NO_VERBS
    text = (STANDARD
            .replace("@@TITLE@@", family_title(fam))
            .replace("@@EXPERT@@", expert)
            .replace("@@TREE@@", tree)
            .replace("@@DOMAIN_VERBS@@", verbs.rstrip("\n") + "\n"))
    return text if text.endswith("\n") else text + "\n"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8").replace("\r\n", "\n")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="exit 1 if any family drifts from the standard")
    mode.add_argument("--write", action="store_true", help="render every family (and the template) in place")
    mode.add_argument("--diff", action="store_true", help="print unified diffs, change nothing")
    ap.add_argument("--expert", default=None, help="limit to one family slug")
    ap.add_argument("--repo-root", default=str(REPO_ROOT))
    args = ap.parse_args(argv)

    repo_root = Path(args.repo_root)
    fams = [f for f in iter_families(repo_root) if not args.expert or f.slug == args.expert]
    if not fams:
        print(f"no family matched {args.expert!r}", file=sys.stderr)
        return 2
    drifted: list[str] = []
    for fam in fams:
        existing = _read(fam.justfile)
        desired = render(fam, existing)
        rel = fam.justfile.relative_to(repo_root).as_posix()
        if desired == existing:
            if not args.diff:
                print(f"OK    {rel}")
            continue
        drifted.append(rel)
        if args.write:
            fam.justfile.write_text(desired, encoding="utf-8", newline="\n")
            print(f"WROTE {rel}")
        elif args.diff:
            sys.stdout.writelines(difflib.unified_diff(
                existing.splitlines(True), desired.splitlines(True), f"a/{rel}", f"b/{rel}"))
        else:
            print(f"DRIFT {rel}")
    print(f"\n{len(fams)} family justfile(s) · {len(drifted)} {'rendered' if args.write else 'drifted'}")
    return 0 if (args.write or not drifted) else 1


if __name__ == "__main__":
    sys.exit(main())
