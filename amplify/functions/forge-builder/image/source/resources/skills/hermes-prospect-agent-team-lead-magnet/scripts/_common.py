"""Shared helpers for the hermes-prospect-agent-team-lead-magnet pipeline.

Every pipeline stage is a deterministic CLI writing into one --workdir.
Exit convention across all stages: 0 = ok, 1 = gate failure, 2 = usage/blocked.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    print("ERROR: PyYAML required. `pip install pyyaml`", file=sys.stderr)
    sys.exit(2)

SKILL_ROOT = Path(__file__).resolve().parents[1]
TEMPLATES = SKILL_ROOT / "templates"
ASSETS = SKILL_ROOT / "assets"
FIXTURES = SKILL_ROOT / "fixtures"

# Patterns that must never appear in any prospect-facing artifact. Grouped by
# label so gate failures say WHAT leaked without printing the match itself.
SECRET_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("aws_access_key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("github_token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b")),
    ("slack_token", re.compile(r"\bxox[abpr]-[A-Za-z0-9-]{10,}\b")),
    ("telegram_bot_token", re.compile(r"\b\d{8,10}:AA[A-Za-z0-9_-]{30,}\b")),
    ("private_key_block", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("bearer_header", re.compile(r"(?i)\bauthorization:\s*bearer\s+\S+")),
    ("chat_id_field", re.compile(r"(?i)\bchat_id[\"']?\s*[:=]\s*[\"']?-?\d{6,}")),
    ("oauth_file_ref", re.compile(r"(?i)\.credentials\.json|oauth[-_]?token")),
    ("hermes_private_path", re.compile(r"(?i)[/\\]\.hermes[/\\](?:config\.yaml|auth\.json|state\.db)")),
    ("home_dir_leak", re.compile(r"(?i)(?:/Users/greg|C:\\+Users\\+gblac)\b")),
    ("dotenv_assignment", re.compile(r"(?im)^[A-Z][A-Z0-9_]{2,}=(?:sk-|ey[JI]|ghp_|xox)\S+")),
]

# Copy that would misrepresent the draft as live. Checked in prospect-facing text.
FABRICATION_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("claims_already_active", re.compile(r"(?i)\byour (?:team|agents?) (?:is|are) (?:now |already )?(?:live|active|running|deployed)\b")),
    ("implied_partnership", re.compile(r"(?i)\bin partnership with (?:hermes|nous research)\b")),
    ("fabricated_metric", re.compile(r"(?i)\b(?:saved|reduced|increased|cut)\b[^.\n]{0,40}\b\d{1,3}\s?%")),
]


def read_text(path: Path) -> str:
    return Path(path).read_text(encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")


def load_structured(path: Path):
    """Load JSON or YAML by extension."""
    text = read_text(path)
    if str(path).lower().endswith((".yaml", ".yml")):
        return yaml.safe_load(text)
    return json.loads(text)


def dump_json(path: Path, data) -> None:
    write_text(path, json.dumps(data, indent=2, ensure_ascii=False, sort_keys=False) + "\n")


def dump_yaml(path: Path, data) -> None:
    write_text(path, yaml.safe_dump(data, sort_keys=False, allow_unicode=True))


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return re.sub(r"-{2,}", "-", value) or "prospect"


def sha256_fingerprint(*parts: str) -> str:
    h = hashlib.sha256()
    for part in parts:
        h.update(part.encode("utf-8"))
        h.update(b"\x00")
    return h.hexdigest()


def scan_secrets(text: str) -> list[str]:
    """Return labels of secret patterns present in text (never the matches)."""
    return [label for label, pattern in SECRET_PATTERNS if pattern.search(text)]


def scan_fabrication(text: str) -> list[str]:
    return [label for label, pattern in FABRICATION_PATTERNS if pattern.search(text)]


def validate_schema(data, schema: dict, where: str = "") -> list[str]:
    """Minimal structural validator: required keys + shallow type names.

    Schema files use standard JSON-Schema-ish keys we honor: `required`
    (recursively via `properties`), `type`, and `enum`. Deliberately
    dependency-free; not a full JSON Schema implementation.
    """
    errors: list[str] = []
    _validate_node(data, schema, where or "$", errors)
    return errors


_TYPE_MAP = {
    "object": dict,
    "array": list,
    "string": str,
    "number": (int, float),
    "integer": int,
    "boolean": bool,
    "null": type(None),
}


def _validate_node(data, schema: dict, path: str, errors: list[str]) -> None:
    expected = schema.get("type")
    if expected:
        allowed = expected if isinstance(expected, list) else [expected]
        if not any(isinstance(data, _TYPE_MAP[t]) for t in allowed if t in _TYPE_MAP):
            errors.append(f"{path}: expected {allowed}, got {type(data).__name__}")
            return
    if "enum" in schema and data not in schema["enum"]:
        errors.append(f"{path}: {data!r} not in enum {schema['enum']}")
    if isinstance(data, dict):
        for key in schema.get("required", []):
            if key not in data:
                errors.append(f"{path}: missing required key '{key}'")
        for key, subschema in schema.get("properties", {}).items():
            if key in data and isinstance(subschema, dict):
                _validate_node(data[key], subschema, f"{path}.{key}", errors)
    if isinstance(data, list) and isinstance(schema.get("items"), dict):
        for i, item in enumerate(data):
            _validate_node(item, schema["items"], f"{path}[{i}]", errors)


def load_schema(name: str) -> dict:
    return json.loads(read_text(TEMPLATES / name))


def render_template(template_text: str, context: dict) -> str:
    """Minimal mustache-style renderer: replaces {{key}} placeholders.

    Templates keep the .j2 suffix from the PRD for familiarity, but rendering
    is intentionally dependency-free — no logic in templates, all structure
    is precomputed by the calling script.
    """
    def _sub(match: re.Match) -> str:
        key = match.group(1).strip()
        if key not in context:
            raise KeyError(f"template placeholder '{{{{{key}}}}}' has no value")
        return str(context[key])

    return re.sub(r"\{\{([^{}]+)\}\}", _sub, template_text)


def esc(value: str) -> str:
    """HTML-escape prospect-derived text before it touches the page."""
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def pick_accent(brand_colors: list[str], default: str = "#D97757") -> str:
    """Logo-first accent: the first extracted brand color that reads as a real
    color on the void ground (skips near-black and near-white); falls back to
    the brightest non-black mark color, then the GB terracotta default."""
    def channels(hex_str: str) -> tuple[int, int, int]:
        return int(hex_str[1:3], 16), int(hex_str[3:5], 16), int(hex_str[5:7], 16)

    chromatic = []
    light_neutral = None
    for color in brand_colors or []:
        r, g, b = channels(color)
        luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
        if luma < 40:            # near-black — invisible on the void
            continue
        if max(r, g, b) - min(r, g, b) > 24:
            chromatic.append(color)
        elif light_neutral is None and luma > 120:
            light_neutral = color
    return chromatic[0] if chromatic else (light_neutral or default)


def find_repo_root(start: Path | None = None) -> Path | None:
    """Walk up to the monorepo root — identified by the canonical vault entry
    point second-brain/CLAUDE.md (a bare second-brain/ dir also exists under
    resources/, so a directory check alone matches too early)."""
    current = (start or SKILL_ROOT).resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "second-brain" / "CLAUDE.md").is_file():
            return candidate
    return None


def workdir_arg(parser) -> None:
    parser.add_argument("--workdir", required=True, help="Prospect run output directory")


def load_artifact(workdir: Path, name: str):
    path = Path(workdir) / name
    if not path.exists():
        print(f"ERROR: missing upstream artifact {name} in {workdir} — run earlier stages first", file=sys.stderr)
        sys.exit(2)
    return load_structured(path)


def fail_gate(messages: list[str], gate: str) -> None:
    print(f"GATE FAIL [{gate}]:")
    for msg in messages:
        print(f"  - {msg}")
    sys.exit(1)
