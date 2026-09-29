#!/usr/bin/env python3
"""Grade every registered justfile against config/justfile-section-registry.yaml.

This is the executable half of gbauto-config-spec §1F ("a working justfile").
For each justfile matched by a registry profile it checks:

  parse      duplicate recipes / `just --list` exit 0 (when `just` is on PATH)
  recipes    every profile-required recipe exists (minus declared exemptions)
  sections   every profile-required section type is present
  interp     every `{{name}}` in a recipe body resolves to a variable, a recipe
             parameter, or a just builtin — catches the managed-block regression
             where a generated `prime` recipe referenced an undeclared `expert`
  forbidden  profile `forbidden_patterns` (e.g. `cdk deploy`) never appear
  verbs      `<x>-apply` recipes have a read-only `<x>` sibling

Exit 1 on any failure. `--json` emits the full report; `--no-just` skips the
`just --list` probe (CI without just); `--only <substr>` narrows the file set.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[1]
REGISTRY = REPO_ROOT / "config" / "justfile-section-registry.yaml"

RECIPE_RE = re.compile(r"^@?([A-Za-z_][A-Za-z0-9_-]*)((?:\s+[+*$]?[A-Za-z_][A-Za-z0-9_-]*(?:=(?:\"[^\"]*\"|'[^']*'|\S+))?)*)\s*:(?!=)\s*(.*)$")
ASSIGN_RE = re.compile(r"^(?:export\s+)?([A-Za-z_][A-Za-z0-9_-]*)\s*:=")
ALIAS_RE = re.compile(r"^alias\s+([A-Za-z_][A-Za-z0-9_-]*)\s*:=\s*([A-Za-z_][A-Za-z0-9_-]*)")
SET_RE = re.compile(r"^set\s+([a-z-]+)")
SEPARATOR_RE = re.compile(r"^#\s*(?:[-─═]{3,}\s*(?P<a>[A-Za-z][\w /+-]*?)|(?P<b>[A-Za-z][\w /+-]*?)\s*[-─═]{3,})\s*$")
MANAGED_BEGIN_RE = re.compile(r"^#\s*BEGIN MANAGED (.+?)\s*$")
MANAGED_END_RE = re.compile(r"^#\s*END MANAGED (.+?)\s*$")
INTERP_RE = re.compile(r"\{\{\s*([A-Za-z_][A-Za-z0-9_-]*)\s*(\(?)")
PLACEHOLDER_RE = re.compile(r"^[A-Z][A-Z0-9_]*$")  # {{EXPERT}} scaffold tokens

PASS, FAIL, INFO = "PASS", "FAIL", "INFO"


@dataclass
class Recipe:
    name: str
    line: int
    params: list[str]
    body: list[str] = field(default_factory=list)
    in_managed: str | None = None


@dataclass
class Parsed:
    path: Path
    recipes: list[Recipe]
    assignments: set[str]
    settings: set[str]
    separators: list[str]
    managed_blocks: list[str]
    has_header: bool
    header_text: str
    text: str
    duplicates: list[str]


def parse_justfile(path: Path) -> Parsed:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    recipes: list[Recipe] = []
    assignments: set[str] = set()
    settings: set[str] = set()
    separators: list[str] = []
    managed: list[str] = []
    seen: dict[str, int] = {}
    duplicates: list[str] = []
    current: Recipe | None = None
    managed_name: str | None = None

    header_lines: list[str] = []
    for ln in lines:
        if ln.startswith("#"):
            header_lines.append(ln)
        elif ln.strip() == "" and header_lines:
            break
        else:
            break
    header_text = "\n".join(header_lines)

    for idx, ln in enumerate(lines, 1):
        if not ln.strip():
            continue  # blank lines do not end a recipe body
        if ln.startswith((" ", "\t")):
            if current is not None:
                current.body.append(ln)
            continue
        current = None
        if ln.startswith("#"):
            m = MANAGED_BEGIN_RE.match(ln)
            if m:
                managed_name = m.group(1)
                managed.append(managed_name)
                continue
            if MANAGED_END_RE.match(ln):
                managed_name = None
                continue
            m = SEPARATOR_RE.match(ln)
            if m:
                separators.append((m.group("a") or m.group("b")).strip().lower())
            continue
        if ln.startswith("["):  # attributes such as [private]
            continue
        m = SET_RE.match(ln)
        if m:
            settings.add(m.group(1))
            continue
        m = ALIAS_RE.match(ln)
        if m:
            continue
        m = ASSIGN_RE.match(ln)
        if m:
            assignments.add(m.group(1))
            continue
        m = RECIPE_RE.match(ln)
        if m:
            name = m.group(1)
            params = [re.sub(r"^[+*$]", "", p.split("=")[0]) for p in m.group(2).split()]
            if name in seen:
                duplicates.append(name)
            seen[name] = idx
            current = Recipe(name=name, line=idx, params=params, in_managed=managed_name)
            recipes.append(current)
    return Parsed(
        path=path,
        recipes=recipes,
        assignments=assignments,
        settings=settings,
        separators=separators,
        managed_blocks=managed,
        has_header=bool(header_lines),
        header_text=header_text,
        text=text,
        duplicates=duplicates,
    )


def load_registry(path: Path = REGISTRY) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def _rel(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def match_profile(rel: str, registry: dict) -> dict | None:
    from fnmatch import fnmatch

    for prof in registry.get("profiles", []):
        for pat in prof.get("paths", []):
            if fnmatch(rel, pat):
                return prof
    return None


def discover(registry: dict) -> list[tuple[Path, dict]]:
    out: list[tuple[Path, dict]] = []
    seen: set[Path] = set()
    for prof in registry.get("profiles", []):
        for pat in prof.get("paths", []):
            for p in sorted(REPO_ROOT.glob(pat)):
                if p.is_file() and p not in seen:
                    seen.add(p)
                    out.append((p, prof))
    return out


def classify(parsed: Parsed, registry: dict) -> dict[str, list[str]]:
    """Map section-id -> recipe names present; detection sections use markers."""
    by_recipe: dict[str, str] = {}
    matchers: list[tuple[str, re.Pattern]] = []
    for sec in registry["sections"]:
        for r in sec.get("recipes", []):
            by_recipe[r] = sec["id"]
        for blk in sec.get("known_blocks", []) or []:
            for r in blk.get("recipes", []):
                by_recipe.setdefault(r, sec["id"])
        if sec.get("match"):
            matchers.append((sec["id"], re.compile(sec["match"])))

    present: dict[str, list[str]] = {}

    def add(sec_id: str, what: str) -> None:
        present.setdefault(sec_id, []).append(what)

    for rcp in parsed.recipes:
        sec_id = by_recipe.get(rcp.name)
        if sec_id is None:
            for sid, rx in matchers:
                if rx.match(rcp.name):
                    sec_id = sid
                    break
        if sec_id is None:
            sec_id = "domain-verbs"
        add(sec_id, rcp.name)
        if rcp.in_managed:
            add("managed-block", rcp.name)
        if any(b.strip().startswith("#!") for b in rcp.body[:1]):
            add("shebang-recipe", rcp.name)
    if parsed.has_header:
        add("header", "banner")
    if parsed.settings:
        add("settings", ",".join(sorted(parsed.settings)))
    if parsed.assignments:
        add("variables", ",".join(sorted(parsed.assignments)))
    for blk in parsed.managed_blocks:
        add("managed-block", f"block:{blk}")
    return present


def check_file(path: Path, prof: dict, registry: dict, use_just: bool) -> dict:
    rel = _rel(path)
    parsed = parse_justfile(path)
    present = classify(parsed, registry)
    findings: list[tuple[str, str]] = []

    if parsed.duplicates:
        findings.append((FAIL, f"duplicate recipe(s): {', '.join(parsed.duplicates)}"))

    if use_just:
        r = subprocess.run(["just", "--list"], cwd=path.parent, capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            first = (r.stderr.strip().splitlines() or ["?"])[0]
            findings.append((FAIL, f"just --list exit {r.returncode}: {first}"))
        else:
            findings.append((INFO, "just --list ok"))

    exemptions = {e["path"]: e for e in prof.get("exemptions", []) or []}
    waived = set(exemptions.get(rel, {}).get("waive_recipes", []))
    waived_sections = set(exemptions.get(rel, {}).get("waive_sections", []))
    names = {r.name for r in parsed.recipes}
    if not prof.get("parse_only"):
        missing = [r for r in prof.get("required_recipes", []) if r not in names and r not in waived]
        if missing:
            findings.append((FAIL, f"missing required recipe(s): {', '.join(missing)}"))
        missing_sections = [s for s in prof.get("required_sections", [])
                            if s not in present and s not in waived_sections]
        if missing_sections:
            findings.append((FAIL, f"missing required section(s): {', '.join(missing_sections)}"))

    builtins = {"justfile_directory", "justfile", "invocation_directory", "env_var", "env_var_or_default",
                "os", "arch", "home_directory", "env", "require", "path_exists", "source_directory"}
    for rcp in parsed.recipes:
        for m in INTERP_RE.finditer("\n".join(rcp.body)):
            name, paren = m.group(1), m.group(2)
            if paren or name in builtins or name in parsed.assignments or name in rcp.params or PLACEHOLDER_RE.match(name):
                continue
            where = f" (inside managed block {rcp.in_managed!r})" if rcp.in_managed else ""
            findings.append((FAIL, f"recipe {rcp.name!r} interpolates undefined {{{{{name}}}}}{where}"))

    for pat in prof.get("forbidden_patterns", []) or []:
        if re.search(pat, parsed.text):
            findings.append((FAIL, f"forbidden pattern {pat!r} present"))
    for sec in registry["sections"]:
        if sec["id"] == "infra":
            for rule_pat in (r"cdk\s+(deploy|destroy|bootstrap)",):
                if re.search(rule_pat, parsed.text):
                    findings.append((FAIL, f"infra rule: {rule_pat!r} must not appear in any registered justfile"))

    for n in names:
        if n.endswith("-apply") and n[: -len("-apply")] not in names:
            findings.append((FAIL, f"write-capable {n!r} has no read-only {n[:-6]!r} sibling"))

    for rcp in parsed.recipes:
        if rcp.body and rcp.body[0].strip().startswith("#!") and len(rcp.body) > 15 and prof["id"] != "legacy":
            findings.append((INFO, f"shebang recipe {rcp.name!r} is {len(rcp.body)} lines (>15: consider scripts/)"))

    unknown = present.get("domain-verbs", [])
    if unknown:
        findings.append((INFO, f"domain-verbs: {', '.join(unknown)}"))

    verdict = FAIL if any(v == FAIL for v, _ in findings) else PASS
    return {
        "path": rel,
        "profile": prof["id"],
        "verdict": verdict,
        "recipes": [r.name for r in parsed.recipes],
        "sections": sorted(present),
        "generation": _generation(parsed),
        "findings": [{"level": lvl, "detail": d} for lvl, d in findings],
    }


def _generation(parsed: Parsed) -> str:
    names = {r.name for r in parsed.recipes}
    if {"remote-status", "install-dry", "prime", "audit"} <= names and "profile" in parsed.assignments:
        return "standard"
    if "validate-playbook" in names:
        return "gen-B+"
    if {"check", "audit", "pbi"} <= names:
        return "gen-A" if parsed.has_header and parsed.separators else "gen-B"
    if {"experts", "meet-run"} & names:
        return "root"
    if "setup" in names and "deploy" in names:
        return "legacy"
    return "custom"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--registry", default=str(REGISTRY))
    ap.add_argument("--only", default=None, help="substring filter on repo-relative path")
    ap.add_argument("--no-just", action="store_true", help="skip the `just --list` probe")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)

    registry = load_registry(Path(args.registry))
    use_just = not args.no_just and shutil.which("just") is not None
    rows = []
    for path, prof in discover(registry):
        if args.only and args.only not in _rel(path):
            continue
        rows.append(check_file(path, prof, registry, use_just))

    failed = [r for r in rows if r["verdict"] == FAIL]
    gens: dict[str, int] = {}
    for r in rows:
        gens[r["generation"]] = gens.get(r["generation"], 0) + 1

    if args.json:
        print(json.dumps({"files": rows, "generations": gens, "just_probe": use_just,
                          "summary": {"total": len(rows), "failed": len(failed)}}, indent=2))
    else:
        for r in rows:
            print(f"{r['verdict']:4} {r['path']}  [{r['profile']}/{r['generation']}]  {len(r['recipes'])} recipes")
            for f in r["findings"]:
                if f["level"] != INFO or args.only:
                    print(f"       {f['level']}: {f['detail']}")
        print(f"\n{len(rows)} justfile(s) · {len(failed)} failed · generations {gens} · just probe {'on' if use_just else 'off'}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
