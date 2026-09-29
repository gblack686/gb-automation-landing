"""Render one proposed expert in the Agent Forge UI with a matching YAML export."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys

from jsonschema import Draft202012Validator

from _common import TEMPLATES, dump_json, load_structured, scan_fabrication, scan_secrets, write_text

ROOT = Path(__file__).resolve().parents[4]
CONFIG_SCHEMA = ROOT / "resources/skills/agent-forge/templates/agent-expert-config.schema.json"

# Every required expert-config field has one visible explanation, including identity in the hero.
GROUPS = (
    ("purpose", "Purpose", "What your expert is here to do.", ("purpose",)),
    ("context", "Knowledge", "The context behind every answer.", ("client_context_refs",)),
    ("skills", "Skills", "Capabilities built around your work.", ("skills",)),
    ("commands", "Commands", "A clear starting point. Familiar actions.", ("prime_commands", "preset_commands")),
    ("runtime", "Runtime", "Where it runs. How it thinks.", ("profile_config",)),
    ("connections", "Connections", "Your tools, with the right access.", ("secrets_required",)),
    ("validation", "Quality", "Know what good looks like.", ("validation_workflows",)),
    ("approval", "Approval", "You set the boundaries.", ("activation_gate",)),
)
IDENTITY_FIELDS = ("schema_version", "agent_id", "display_name")
FIELD_HELP = {
    "purpose": "The job this expert exists to do.",
    "client_context_refs": "References to approved briefs, answers and knowledge. References are not fetched by this page.",
    "skills": "The skills selected for this expert. Empty means no skills are bound yet.",
    "prime_commands": "Startup actions that load context and prepare the expert. Empty means not configured.",
    "preset_commands": "Repeatable actions you can invoke. Empty means no executable recipes are bound yet.",
    "profile_config": "The runtime profile and its settings. An empty object means runtime selection is still open.",
    "secrets_required": "Credential references only, never credentials. Empty means references have not been supplied.",
    "validation_workflows": "Checks that decide whether work is ready. Empty means checks have not been wired yet.",
    "activation_gate": "A human must approve activation. Downloading the draft does not install or activate it.",
}


def validate_profile(profile: dict) -> None:
    schema = json.loads((TEMPLATES / "expert-profile-page.schema.json").read_text(encoding="utf-8"))
    errors = sorted(Draft202012Validator(schema).iter_errors(profile), key=lambda e: str(e.path))
    if errors:
        raise ValueError("Invalid expert profile page at " + ".".join(map(str, errors[0].path)))
    config_schema = json.loads(CONFIG_SCHEMA.read_text(encoding="utf-8"))
    errors = list(Draft202012Validator(config_schema).iter_errors(profile["config"]))
    if errors:
        raise ValueError("Invalid expert config at " + ".".join(map(str, errors[0].path)))
    mapped = set(IDENTITY_FIELDS) | {f for _, _, _, fields in GROUPS for f in fields}
    if mapped != set(config_schema["required"]):
        raise ValueError("Expert config changed; update the section-to-config map")
    raw = json.dumps(profile, ensure_ascii=False)
    findings = scan_secrets(raw) + scan_fabrication(raw)
    if re.search(r"\bsk-(?:or-v1-)?[A-Za-z0-9_-]{16,}\b", raw):
        findings.append("api_key")
    if findings:
        raise ValueError("Profile content rejected: " + ", ".join(sorted(set(findings))))


def render_profile(profile: dict, *, generated_on: str | None = None, asset_root: Path | None = None) -> tuple[str, str, dict]:
    """Compatibility entry point: the selected Agent Forge UI is the document."""
    from render_forge_workspace import render_workspace
    return render_workspace(profile, generated_on=generated_on, asset_root=asset_root)


def write_profile(profile_path: Path, workdir: Path, generated_on: str | None = None) -> dict:
    from forge_artifacts import load_artifacts
    profile = load_structured(profile_path)
    page, yaml_text, receipt = render_profile(profile, generated_on=generated_on, asset_root=profile_path.parent)
    artifacts = load_artifacts(profile, profile_path.parent)
    # A dedicated directory prevents stale team pages or private input files joining a release.
    workdir = Path(workdir)
    outputs = {"index.html", "expert-config.yaml", "expert-profile-receipt.json"} | {a['filename'] for a in artifacts}
    if workdir.is_symlink() or (workdir.exists() and any(p.name not in outputs or not p.is_file() or p.is_symlink() for p in workdir.iterdir())):
        raise ValueError("Use a dedicated single-expert output directory")
    for artifact in artifacts:
        write_text(workdir / artifact['filename'], artifact['content'])
    write_text(workdir / "expert-config.yaml", yaml_text)
    write_text(workdir / "index.html", page)
    dump_json(workdir / "expert-profile-receipt.json", receipt)
    return receipt


def main() -> int:
    sys.path.insert(0, str(ROOT))
    from resources.lib.tracing import trace_agent

    @trace_agent("lead_magnet.single_expert_profile", metadata={"mode": "local_render"})
    def run():
        parser = argparse.ArgumentParser(description=__doc__)
        parser.add_argument("--profile", required=True, type=Path)
        parser.add_argument("--workdir", required=True, type=Path)
        parser.add_argument("--generated-on")
        args = parser.parse_args()
        try:
            receipt = write_profile(args.profile, args.workdir, args.generated_on)
        except (ValueError, OSError) as error:
            # Paths and input values are not echoed by this command.
            print(f"Profile render failed: {error}" if isinstance(error, ValueError) else "Profile file could not be read or written", file=sys.stderr)
            return 1
        print(json.dumps(receipt))
        return 0
    return run()


if __name__ == "__main__":
    raise SystemExit(main())
