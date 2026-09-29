#!/usr/bin/env python3
"""scaffold_expert_from_config.py -- the missing seam between Agent Forge and deploy_expert.py.

THE SEAM (Phase 6.1, second-brain/plans/2026-09-19-expert-agent-system-two-week.html §12):

    Agent Forge produces an ``agent_expert_config.v1`` document
      (resources/skills/agent-forge/scripts/generate_agent_expert_draft.py,
       schema: resources/skills/agent-forge/templates/agent-expert-config.schema.json)
                                  |
                                  v  <-- THIS SCRIPT bridges the gap
                                  |
        experts/<tree>/<slug>/ directory, in the exact shape
        scripts/deploy_expert.py's resolve_expert() and DISTRIBUTION_FILES expect
                                  |
                                  v
                     scripts/deploy_expert.py --expert <slug> [--dry-run] ...

Before this script existed, an ``agent_expert_config.v1`` draft was a dead end: nothing
turned it into a directory ``deploy_expert.py`` could resolve. This script scaffolds
``experts/<tree>/<slug>/`` from the ten required family files in
``experts/gbautomation/_template/`` (the ratified copy-source, 2026-07-27), substituting
the six UPPERCASE placeholders (EXPERT, TREE, EXPERT_TITLE, ONE_LINE_DOMAIN, SOURCE_PATHS,
RELATED) from the config's real fields, then renders the justfile through the existing
``scripts/render_expert_justfiles.py`` §1F standard (never hand-rolled).

    python scripts/scaffold_expert_from_config.py \\
        --config fixtures/bracket-to-agent-forge/artifacts/drafts/agent-expert-config.json \\
        --tree gbautomation \\
        [--slug <override>] [--repo-root <repo>] [--force] [--json]

Field mapping (agent_expert_config.v1 -> experts/<tree>/<slug>/):

    agent_id             -> directory slug + {{EXPERT}} (validated against deploy_expert's
                             own EXPERT_SLUG pattern; --slug overrides)
    display_name         -> {{EXPERT_TITLE}} (banner, profile/config.yaml role, SOUL.md)
    purpose               -> {{ONE_LINE_DOMAIN}}; also copied into profile/SOUL.md verbatim
    client_context_refs  -> {{SOURCE_PATHS}} in expertise.md / question.md / maintenance.md
    profile_config        -> profile/config.yaml: known keys (runtime, mode,
                             manual_activation_only) are commented inline; the whole object
                             is ALSO stashed losslessly under
                             x_gbautomation_expert_profile.forge_profile_config so no key is
                             silently dropped (the schema declares it a free-form object,
                             so this script cannot know every key in advance)
    prime_commands        -> appended to prime.md as a "Forge-declared prime steps" section
    preset_commands       -> justfile domain-verbs: one `forge-preset-<name>` recipe per
                             entry that ECHOES the declared command, never executes it
                             (see GAP below)
    validation_workflows  -> justfile domain-verbs: one `forge-validate-<name>` recipe,
                             same echo-only treatment
    skills                -> config/expert.yaml `forge_skills:` + noted in profile/SOUL.md
    secrets_required       -> config/expert.yaml `forge_secrets_required:` (pointer strings
                             only -- this script never handles or prints a real secret) +
                             noted in profile/SOUL.md
    activation_gate        -> config/expert.yaml `forge_activation_gate:` + noted in
                             profile/SOUL.md; profile/config.yaml already defaults to
                             approvals.mode: manual, cron_mode: deny (matches the schema's
                             one legal value, human_approval_required)

REAL GAP worth flagging (not papered over): ``preset_commands[].command`` and
``validation_workflows[].command`` are free-text shell strings that may contain
Forge-authored placeholder tokens the fixture itself uses, e.g. ``<run.json>`` -- not
valid shell syntax (`<` is redirection). This script deliberately does NOT wire them as
live, executable just(1) recipes; it emits `@echo`-only recipes so the declared command
text is visible and reviewable without ever being shell-evaluated. An operator must turn
a reviewed preset/validation command into a real recipe by hand. A second gap: the
schema has no ``tree`` field, so ``--tree`` must always be supplied out of band -- Forge
config alone cannot tell you whether an expert belongs under gbautomation/ or
consulting/. And a third: Part 2-8 of expertise.md (domain picture, invariants, seams,
gotchas) are mental-model content the config has no equivalent of; they stay as
_template's own bracketed authoring prompts (lowercase/mixed placeholders, e.g.
``{{Capability}}``) for a human to fill after scaffolding -- this script only satisfies
the ``grep -rn '{{[A-Z_]*}}'`` structural completeness check the template itself defines.

This script never mutates experts/gbautomation/ or experts/consulting/ unless you point
--repo-root there yourself and accept that on purpose; it is a reusable capability, not a
one-time scaffold-and-commit action.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

import yaml

try:
    import jsonschema
except Exception:  # pragma: no cover
    jsonschema = None

SCRIPT_DIR = Path(__file__).resolve().parent
SCRIPT_REPO_ROOT = SCRIPT_DIR.parents[0]
if str(SCRIPT_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPT_REPO_ROOT))
TREES = ("gbautomation", "consulting")
EXPERT_SLUG = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$")
SCHEMA_PATH = SCRIPT_REPO_ROOT / "resources" / "skills" / "agent-forge" / "templates" / "agent-expert-config.schema.json"
RENDER_JUSTFILES = SCRIPT_REPO_ROOT / "scripts" / "render_expert_justfiles.py"

# The ten required family files (per experts/gbautomation/_template/README.md), minus the
# template's own README.md and its banner (handled separately: _template.md -> _<slug>.md).
ROUTE_FILES = (
    "expertise.md", "graph.md", "install.md", "maintenance.md", "plan.md",
    "plan_build_improve.md", "prime.md", "question.md", "self-improve.md",
)


class ScaffoldRefused(RuntimeError):
    """A fail-closed refusal."""


def load_config(path: Path) -> dict[str, Any]:
    try:
        doc = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError) as exc:
        raise ScaffoldRefused(f"cannot read config {path}: {exc}") from exc
    if not isinstance(doc, dict):
        raise ScaffoldRefused(f"expected a JSON object: {path}")
    if doc.get("schema_version") != "agent_expert_config.v1":
        raise ScaffoldRefused(f"not an agent_expert_config.v1 document: {path} "
                              f"(schema_version={doc.get('schema_version')!r})")
    if jsonschema is not None and SCHEMA_PATH.is_file():
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        jsonschema.Draft202012Validator.check_schema(schema)
        errors = sorted(jsonschema.Draft202012Validator(schema).iter_errors(doc), key=lambda e: list(e.path))
        if errors:
            detail = "; ".join(f"{'/'.join(str(p) for p in e.path) or '<root>'}: {e.message}" for e in errors)
            raise ScaffoldRefused(f"config fails agent_expert_config.v1 schema: {detail}")
    return doc


def slugify(agent_id: str) -> str:
    lowered = re.sub(r"[^a-z0-9]+", "-", agent_id.lower()).strip("-")
    lowered = re.sub(r"-{2,}", "-", lowered)
    return lowered


def resolve_slug(config: dict[str, Any], override: str | None) -> str:
    slug = override or config["agent_id"]
    if not EXPERT_SLUG.fullmatch(slug):
        slug = slugify(slug)
    if not EXPERT_SLUG.fullmatch(slug):
        raise ScaffoldRefused(f"could not derive a valid expert slug from agent_id={config['agent_id']!r}")
    return slug


def render_placeholders(text: str, mapping: dict[str, str]) -> str:
    for key, value in mapping.items():
        text = text.replace("{{" + key + "}}", value)
    return text


def build_source_paths(config: dict[str, Any]) -> str:
    refs = [str(r) for r in (config.get("client_context_refs") or [])]
    if not refs:
        return "(none declared in agent_expert_config.v1 -- fill after operator review)"
    return "; ".join(refs)


def _yaml_dump(data: Any) -> str:
    return yaml.safe_dump(data, default_flow_style=False, sort_keys=False, allow_unicode=True)


def build_config_expert_yaml(config: dict[str, Any], tree: str, slug: str) -> str:
    doc = {
        "schema_version": "expert-setup.v1",
        "expert_id": f"{tree}/{slug}",
        "profile": f"expert-{tree}-{slug}",
        "prime_adapter": "prime.md",
        "shared_prime": "PRIME.md",
        "self_improve": "self-improve.md",
        "proposal_policy": "sprint/expert-sprint.yaml",
        "session_prime_hooks": True,
    }
    header = (
        "# Scaffolded by scripts/scaffold_expert_from_config.py from an agent_expert_config.v1\n"
        f"# document (agent_id: {config['agent_id']}). Forge-declared fields below are carried\n"
        "# through losslessly for traceability; none of them are read by resolve_expert().\n"
    )
    extra = {
        "forge_agent_id": config["agent_id"],
        "forge_skills": config.get("skills") or [],
        "forge_secrets_required": config.get("secrets_required") or [],
        "forge_activation_gate": config.get("activation_gate"),
    }
    return header + _yaml_dump(doc) + "\n" + _yaml_dump(extra)


def build_profile_config_yaml(template_text: str, mapping: dict[str, str], config: dict[str, Any]) -> str:
    rendered = render_placeholders(template_text, mapping)
    doc = yaml.safe_load(rendered)
    if not isinstance(doc, dict):
        raise ScaffoldRefused("profile/config.yaml template did not parse to a mapping")
    # Merge into the SAME x_gbautomation_expert_profile mapping the template already
    # defines -- a second top-level key of the same name would silently shadow the
    # first on load (yaml.safe_load keeps only the last of duplicate keys).
    block = doc.setdefault("x_gbautomation_expert_profile", {})
    block["forge_profile_config"] = config.get("profile_config") or {}
    from resources.lib.agent_operating_policy import apply_context
    apply_context(doc)
    header = (
        "# x_gbautomation_expert_profile.forge_profile_config below is the Forge-declared\n"
        "# profile_config (agent_expert_config.v1), stashed losslessly -- the schema leaves\n"
        "# this object free-form, so known keys are not hand-picked out of it here.\n"
    )
    return header + _yaml_dump(doc)


def build_soul_md(template_text: str, mapping: dict[str, str], config: dict[str, Any]) -> str:
    rendered = render_placeholders(template_text, mapping)
    lines = [rendered.rstrip("\n"), "", "## Forge provenance (agent_expert_config.v1)", ""]
    lines.append(f"- **Purpose**: {config['purpose']}")
    skills = config.get("skills") or []
    if skills:
        names = ", ".join(f"{s.get('skill_id', '?')}@{s.get('version_ref', '?')}" for s in skills)
        lines.append(f"- **Declared skills**: {names}")
    secrets = config.get("secrets_required") or []
    if secrets:
        lines.append(f"- **Secret pointers required** (never the values): {', '.join(secrets)}")
    lines.append(f"- **Activation gate**: `{config.get('activation_gate')}` -- never auto-activate.")
    lines.append("")
    return "\n".join(lines)


def build_prime_md(template_text: str, mapping: dict[str, str], config: dict[str, Any]) -> str:
    rendered = render_placeholders(template_text, mapping)
    prime_commands = config.get("prime_commands") or []
    if not prime_commands:
        return rendered
    lines = [rendered.rstrip("\n"), "", "## Forge-declared prime steps (agent_expert_config.v1)", ""]
    for pc in prime_commands:
        name = pc.get("name", "?")
        desc = pc.get("description", "")
        lines.append(f"- `{name}` -- {desc}")
    lines.append("")
    return "\n".join(lines)


def build_justfile_seed(slug: str, tree: str, config: dict[str, Any]) -> str:
    """A minimal, valid domain-verbs seed that render_expert_justfiles.py's own
    extract_domain_verbs() will carry into the standard §1F rendering. Recipes are
    echo-only by construction -- see the module docstring's GAP note."""
    lines = [
        f"# {tree}/{slug} expert — scaffolded stub; rendered below by render_expert_justfiles.py\n",
        "# --------------------------------------------------------------- domain-verbs",
        "# Forge-declared preset commands / validation workflows (agent_expert_config.v1).",
        "# Echo-only: surfaces the declared command text for operator review without",
        "# executing it -- Forge command strings may carry non-shell placeholder tokens",
        "# (e.g. <run.json>) that are not valid until an operator fills them in.",
        "",
    ]
    for pc in config.get("preset_commands") or []:
        name = slugify(f"forge-preset-{pc.get('name', 'unnamed')}")
        cmd = str(pc.get("command", "")).replace('"', '\\"')
        lines.append(f"{name}:")
        lines.append(f'    @echo "{cmd}"')
        lines.append("")
    for vw in config.get("validation_workflows") or []:
        name = slugify(f"forge-validate-{vw.get('name', 'unnamed')}")
        cmd = str(vw.get("command", "")).replace('"', '\\"')
        lines.append(f"{name}:")
        lines.append(f'    @echo "{cmd}"')
        lines.append("")
    return "\n".join(lines)


def scaffold(*, config_path: Path, tree: str, repo_root: Path, template_dir: Path,
            slug_override: str | None = None, force: bool = False) -> dict[str, Any]:
    if tree not in TREES:
        raise ScaffoldRefused(f"--tree must be one of {TREES}, got {tree!r}")
    if not template_dir.is_dir():
        raise ScaffoldRefused(f"template source not found: {template_dir}")

    config = load_config(config_path)
    slug = resolve_slug(config, slug_override)

    tree_root = (repo_root / "experts" / tree).resolve()
    target = (tree_root / slug).resolve()
    if target.parent != tree_root:
        raise ScaffoldRefused(f"expert path escapes canonical root: {slug!r}")
    if target.exists():
        if not force:
            raise ScaffoldRefused(f"{target} already exists; pass --force to overwrite")
    tree_root.mkdir(parents=True, exist_ok=True)
    (target / "config").mkdir(parents=True, exist_ok=True)
    (target / "profile").mkdir(parents=True, exist_ok=True)
    (target / "sprint").mkdir(parents=True, exist_ok=True)

    mapping = {
        "EXPERT": slug,
        "TREE": tree,
        "EXPERT_TITLE": config["display_name"],
        "ONE_LINE_DOMAIN": config["purpose"].rstrip("."),
        "SOURCE_PATHS": build_source_paths(config),
        "RELATED": '"[[agent-forge]]"',
    }

    written: list[str] = []

    def write(rel: str, text: str) -> None:
        p = target / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text if text.endswith("\n") else text + "\n")
        written.append(p.relative_to(repo_root).as_posix())

    # banner: _template.md -> _<slug>.md
    banner_src = (template_dir / "_template.md").read_text(encoding="utf-8")
    write(f"_{slug}.md", render_placeholders(banner_src, mapping))

    # the nine remaining route files (prime.md gets Forge-declared prime steps appended)
    for name in ROUTE_FILES:
        src = (template_dir / name).read_text(encoding="utf-8")
        if name == "prime.md":
            write(name, build_prime_md(src, mapping, config))
        else:
            write(name, render_placeholders(src, mapping))

    # profile/
    write("profile/config.yaml", build_profile_config_yaml(
        (template_dir / "profile" / "config.yaml").read_text(encoding="utf-8"), mapping, config))
    write("profile/distribution.yaml", render_placeholders(
        (template_dir / "profile" / "distribution.yaml").read_text(encoding="utf-8"), mapping))
    write("profile/SOUL.md", build_soul_md(
        (template_dir / "profile" / "SOUL.md").read_text(encoding="utf-8"), mapping, config))

    # sprint/
    write("sprint/expert-sprint.yaml", render_placeholders(
        (template_dir / "sprint" / "expert-sprint.yaml").read_text(encoding="utf-8"), mapping))

    # quality/ -- optional, non-collected guidance + illustrative behavior-case
    # placeholders (never a tests/ doc, never a test_*.py file; see
    # experts/gbautomation/_template/quality/README.md). Copied verbatim (with
    # placeholder substitution) when the template ships it; older/custom
    # --template-dir trees without it are not an error.
    quality_src = template_dir / "quality"
    if quality_src.is_dir():
        for rel in sorted(p.relative_to(quality_src).as_posix() for p in quality_src.rglob("*") if p.is_file()):
            text = (quality_src / rel).read_text(encoding="utf-8")
            write(f"quality/{rel}", render_placeholders(text, mapping))

    # Data footprint guidance is inert until the owner declares and registers it.
    data_src = template_dir / "data"
    if data_src.is_dir():
        for path in sorted(data_src.rglob("*")):
            if path.is_file():
                write(f"data/{path.relative_to(data_src).as_posix()}",
                      render_placeholders(path.read_text(encoding="utf-8"), mapping))

    # Report selection is deliberately empty in the generic scaffold. Domain
    # owners select catalog outputs only after their native samples validate.
    reports_src = template_dir / "reports"
    if reports_src.is_dir():
        for path in sorted(reports_src.rglob("*")):
            if path.is_file():
                write(f"reports/{path.relative_to(reports_src).as_posix()}",
                      render_placeholders(path.read_text(encoding="utf-8"), mapping))

    # config/expert.yaml -- the field deploy_expert.py's resolve_expert() reads
    write("config/expert.yaml", build_config_expert_yaml(config, tree, slug))

    # justfile: seed the domain-verbs, then render through the real §1F standard.
    write("justfile", build_justfile_seed(slug, tree, config))
    render_cmd = [sys.executable, str(RENDER_JUSTFILES), "--write", "--expert", slug, "--repo-root", str(repo_root)]
    proc = subprocess.run(render_cmd, capture_output=True, text=True, cwd=str(SCRIPT_REPO_ROOT))
    if proc.returncode != 0:
        raise ScaffoldRefused(f"render_expert_justfiles.py failed: {(proc.stderr or proc.stdout).strip()[-400:]}")

    return {
        "schema_version": "expert-scaffold.v1",
        "expert_id": f"{tree}/{slug}",
        "slug": slug,
        "tree": tree,
        "dir": target.as_posix(),
        "files": sorted(written),
        "justfile_render": proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else "",
        "source_config": str(config_path),
    }


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--config", required=True, help="path to an agent_expert_config.v1 JSON document")
    p.add_argument("--tree", required=True, choices=TREES,
                   help="the schema carries no tree field -- must be supplied out of band")
    p.add_argument("--slug", default=None, help="override the derived expert slug (default: agent_id)")
    p.add_argument("--repo-root", default=str(SCRIPT_REPO_ROOT), help="where experts/<tree>/<slug>/ is written")
    p.add_argument("--template-dir", default=str(SCRIPT_REPO_ROOT / "experts" / "gbautomation" / "_template"),
                   help="the copy-source template (default: the real repo's _template, per its own charter)")
    p.add_argument("--force", action="store_true", help="overwrite an existing target directory")
    p.add_argument("--json", action="store_true")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        result = scaffold(
            config_path=Path(args.config), tree=args.tree, repo_root=Path(args.repo_root).resolve(),
            template_dir=Path(args.template_dir).resolve(), slug_override=args.slug, force=args.force,
        )
    except ScaffoldRefused as exc:
        payload = {"schema_version": "expert-scaffold.v1", "ok": False, "refused": str(exc)}
        print(json.dumps(payload, indent=None if args.json else 2))
        return 2
    result["ok"] = True
    if args.json:
        print(json.dumps(result, indent=None))
    else:
        print(f"scaffolded {result['expert_id']} -> {result['dir']}")
        for f in result["files"]:
            print(f"  wrote {f}")
        print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
