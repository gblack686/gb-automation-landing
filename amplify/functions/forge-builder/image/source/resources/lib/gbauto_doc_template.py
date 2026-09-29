"""gbauto_doc_template — THE single canonical GBauto HTML document grammar.

Extracted from the approved template
``second-brain/plans/2026-07-01-hermes-webui-unified-gbauto-shell-tac-plan.html``
with the three convergence-ruling deltas applied:

  (a) LOGO, NOT DOT — the brand lockup uses the official GB logo
      (the compact ``gb-logo-report.png`` derivative of ``gb-logo.png``, embedded
      as a data URI). The old orange ``.brand-dot`` placeholder is banned
      (see canopy ``style-guide-keyword-router`` snippet).
  (b) LABEL-FIRST SECTION COUNT — section-count spans read
      ``"<label> - <N> words"`` (label LEFT of the hyphen, word count RIGHT)
      at 14px, muted color.
  (c) HYPERFRAMES STRIP — up to 3 hyperframe SVGs render ABOVE the first
      collapsible section in a responsive strip.

Optionally (d) the plan-page feedback widget (comment -> feedback-capture Edge
Function) can be injected. The embed carries ONLY the public anon key — never
a service-role key or any other secret.

Brand token VALUES mirror second-brain/systems/brand/gbauto-brand-tokens.md
(the SOT). Do not invent hexes; if the SOT changes, change it here once.

Python 3.9 compatible; stdlib only.
"""
from __future__ import annotations

import base64
import html as html_lib
import importlib.util
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Union

REPO_ROOT = Path(__file__).resolve().parents[2]

# Most consumers import this module normally. A few legacy renderers load it by
# file path, so retain a sibling-file fallback instead of assuming repo-root is
# already on sys.path.
try:
    from resources.lib.gbauto_theme_presets import (
        THEME_OVERRIDE_CSS,
        THEME_STORAGE_KEY,
        theme_presets_json,
        theme_settings_html,
        theme_token_map_json,
    )
except ModuleNotFoundError:
    _theme_module_path = Path(__file__).with_name("gbauto_theme_presets.py")
    _theme_spec = importlib.util.spec_from_file_location("gbauto_theme_presets", _theme_module_path)
    if _theme_spec is None or _theme_spec.loader is None:
        raise ImportError("unable to load gbauto_theme_presets from %s" % _theme_module_path)
    _theme_module = importlib.util.module_from_spec(_theme_spec)
    sys.modules.setdefault("gbauto_theme_presets", _theme_module)
    _theme_spec.loader.exec_module(_theme_module)
    THEME_OVERRIDE_CSS = _theme_module.THEME_OVERRIDE_CSS
    THEME_STORAGE_KEY = _theme_module.THEME_STORAGE_KEY
    theme_presets_json = _theme_module.theme_presets_json
    theme_settings_html = _theme_module.theme_settings_html
    theme_token_map_json = _theme_module.theme_token_map_json

# Canonical GB logo asset (get-gbauto-theme owns it).
LOGO_MARK = REPO_ROOT / "resources" / "skills" / "get-gbauto-theme" / "assets" / "gb-logo.png"
REPORT_LOGO_MARK = LOGO_MARK.with_name("gb-logo-report.png")

# ---------------------------------------------------------------------------
# Brand tokens (values from second-brain/systems/brand/gbauto-brand-tokens.md)
# ---------------------------------------------------------------------------
TERRACOTTA = "#D97757"
TERRACOTTA_HOVER = "#B75F43"
INK = "#191919"
CREAM_BG = "#F3F1E7"
CREAM_2 = "#E6E4D9"
STONE = "#D6D4C8"
TEXT_MUTE = "#8C8A84"
TEXT_MUTED_2 = "#5C5C5C"
STATUS_GREEN = "#4F9D69"
STATUS_AMBER = "#C08A3E"
STATUS_BLUE = "#3D6EA8"
STATUS_RED = "#B94A48"


# ---------------------------------------------------------------------------
# Versioned canonical report contract
# ---------------------------------------------------------------------------
SHELL_ID = "gbauto-doc.v1"
SHELL_VERSION = "2026-07-03"
THEME_ID = "gbauto-theme.v1"
THEME_VERSION = "2026-06-11"
DEFAULT_RENDERER_ID = "gbauto.report.collapsible"
DEFAULT_RENDERER_VERSION = "1.0.0"
REQUIRED_DOM_MARKERS = [
    ".topbar .topbar-inner",
    ".brand-lockup img.brand-logo[alt]",
    ".source-name",
    "header h1",
    ".taxonomy-pills .pill",
    "main.layout",
    "aside.section-menu nav#sectionNav",
    ".sections",
    "details.section > summary .section-index",
    "details.section > summary .section-title",
    "details.section > summary .section-count",
    "details.section .section-body",
    "details.metadata-card",
    "details.trace-card",
    "footer.metadata-footer",
]
REQUIRED_METADATA_FIELDS = [
    "report_id", "generated_at_utc", "source_task_id", "root_task_id",
    "renderer_id", "renderer_version", "shell_id", "shell_version",
    "theme_id", "theme_version", "source_paths",
]
REQUIRED_TRACE_FIELDS = [
    "pr_732_url", "pr_732_merge_commit", "pr_732_checks",
    "pr_733_url", "pr_733_merge_commit", "pr_733_checks",
    "human_approval_gate_id", "human_approval_decision",
    "host_readback_summary", "origin_main_readback", "kanban_closeout",
    "residual_risks", "old_artifact_status",
]

def renderer_contract(renderer_id: str = DEFAULT_RENDERER_ID, renderer_version: str = DEFAULT_RENDERER_VERSION) -> Dict[str, str]:
    return {
        "renderer_id": renderer_id,
        "renderer_version": renderer_version,
        "shell_id": SHELL_ID,
        "shell_version": SHELL_VERSION,
        "theme_id": THEME_ID,
        "theme_version": THEME_VERSION,
    }

def contract_meta_tags(report_id: str = "", renderer_id: str = DEFAULT_RENDERER_ID, renderer_version: str = DEFAULT_RENDERER_VERSION) -> str:
    values = renderer_contract(renderer_id, renderer_version)
    values["report_id"] = report_id
    return "\n".join(
        '<meta name="gbauto-%s" content="%s" />' % (html_lib.escape(key.replace("_", "-")), html_lib.escape(str(value), quote=True))
        for key, value in values.items()
        if value
    )

def contract_body_attrs(renderer_id: str = DEFAULT_RENDERER_ID, renderer_version: str = DEFAULT_RENDERER_VERSION) -> str:
    values = {
        "shell": SHELL_ID,
        "shell-version": SHELL_VERSION,
        "renderer": renderer_id,
        "renderer-version": renderer_version,
        "theme": THEME_ID,
        "theme-version": THEME_VERSION,
        "color-preset": "gbauto",
        "color-mode": "light",
    }
    return " ".join(
        'data-gbauto-%s="%s"' % (html_lib.escape(key), html_lib.escape(str(value), quote=True))
        for key, value in values.items()
    )

# Ruling delta (b): section counts render at 14px (was 11px in the approved file).
SECTION_COUNT_FONT_SIZE_PX = 14

_LOGO_CACHE: Dict[str, str] = {}

# Inline SVG monogram used ONLY by the email-safe helper when the raster logo
# exceeds the email byte budget.
_FALLBACK_MONOGRAM_SVG = (
    b'<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">'
    b'<text x="24" y="30" text-anchor="middle" fill="#191919"'
    b' font-family="Georgia,serif" font-style="italic" font-weight="bold" font-size="22">gb</text>'
    b"</svg>"
)


def logo_data_uri(path: Optional[Path] = None) -> str:
    """Return the canonical GB logo as an inline ``data:image/png;base64`` URI.

    Raises FileNotFoundError if the asset is missing — pages must never fall
    back to an invented mark or an orange-dot placeholder.
    """
    # A 96px derivative supports the 24px topbar at 4x density without embedding
    # the 302KB source in every document. Keep explicit caller assets supported.
    logo_path = Path(path) if path else REPORT_LOGO_MARK
    key = str(logo_path)
    if key not in _LOGO_CACHE:
        if not logo_path.exists():
            raise FileNotFoundError("canonical GB logo asset missing: %s" % logo_path)
        _LOGO_CACHE[key] = "data:image/png;base64," + base64.b64encode(logo_path.read_bytes()).decode()
    return _LOGO_CACHE[key]


def email_safe_logo_data_uri(path: Optional[Path] = None, max_bytes: int = 20 * 1024) -> str:
    """Logo data URI for Gmail-safe email HTML.

    Email bodies have a hard byte budget, so the raster logo is only embedded
    when it fits under ``max_bytes``; otherwise an inline SVG "gb" monogram is
    used (same behavior the PRD email leg has shipped with).
    """
    logo_path = Path(path) if path else LOGO_MARK
    if logo_path.exists() and logo_path.stat().st_size <= max_bytes:
        return "data:image/png;base64," + base64.b64encode(logo_path.read_bytes()).decode()
    return "data:image/svg+xml;base64," + base64.b64encode(_FALLBACK_MONOGRAM_SVG).decode()


def brand_lockup_html(brand_text: str = "GBauto", logo_path: Optional[Path] = None) -> str:
    """The canonical brand lockup: GB logo image + serif brand text.

    Ruling delta (a): logo, never a .brand-dot orange circle.
    Client hub (Greg 2026-07-19): when GBAUTO_HUB_URL is set at render time
    (the publisher sets it per client), the lockup becomes the door to the
    client hub. Internal renders leave it unset — lockup stays plain.
    """
    lockup = (
        '<div class="brand-lockup">'
        '<img class="brand-logo" src="%s" alt="GB logo"/>'
        '<span class="brand-text">%s</span></div>'
    ) % (logo_data_uri(logo_path), html_lib.escape(brand_text))
    hub = os.environ.get("GBAUTO_HUB_URL", "").strip()
    if hub.startswith("https://"):
        return ('<a href="%s" style="text-decoration:none;color:inherit" '
                'title="GB Automation home">%s</a>'
                % (html_lib.escape(hub, quote=True), lockup))
    return lockup


def topbar_html(source_name: str = "", brand_text: str = "GBauto") -> str:
    return (
        '<div class="topbar"><div class="topbar-inner">'
        + brand_lockup_html(brand_text)
        + '<div class="source-name">%s</div>' % html_lib.escape(source_name)
        + "</div></div>"
    )


# ---------------------------------------------------------------------------
# Section-count grammar — ruling delta (b): "<label> - <N> words"
# ---------------------------------------------------------------------------
def word_count(html_text: str) -> int:
    text = re.sub(r"<[^>]+>", " ", html_text or "")
    return len(re.findall(r"\b[\w'-]+\b", text))


def derive_count_label(heading: str) -> str:
    """Deterministic short descriptor for a section heading.

    First meaningful word, lowercased ("Prior Sprint Status" -> "prior").
    Renderers with a real label source should pass their own label instead.
    """
    for token in re.findall(r"[A-Za-z][A-Za-z0-9'-]*", heading or ""):
        return token.lower()
    return "section"


def format_section_count(count_label: str, words: int) -> str:
    """Label LEFT of the hyphen, word count RIGHT: ``goal - 83 words``."""
    label = (count_label or "section").strip()
    return "%s - %d words" % (label, words)


def section_count_span(count_label: str, words: int) -> str:
    return '<span class="section-count">%s</span>' % html_lib.escape(format_section_count(count_label, words))


SECTION_COUNT_CSS = (
    ".section-count{color:var(--text-mute,%s);font-size:%dpx;font-weight:600;"
    "white-space:nowrap;text-transform:none;letter-spacing:0}"
    % (TEXT_MUTE, SECTION_COUNT_FONT_SIZE_PX)
)


# ---------------------------------------------------------------------------
# Header visual — the static SVG in the header's top-right (approved exemplar)
# Standalone CSS chunk so converged renderers with their own skeletons can
# inject a header visual without adopting the whole BASE_CSS.
# ---------------------------------------------------------------------------
HEADER_VISUAL_CSS = """
header.has-visual{display:flex;gap:28px;align-items:flex-start;justify-content:space-between}
header.has-visual .header-copy{flex:1;min-width:0}
svg.header-visual{flex:0 0 370px;max-width:370px;min-height:230px;height:auto;border:1px solid var(--stone);border-radius:8px;background:linear-gradient(180deg,rgba(255,255,255,.34),rgba(230,228,217,.68))}
svg.header-visual text{font:600 13px Inter,sans-serif;fill:var(--ink)}
svg.header-visual .muted{fill:var(--text-muted-2);font-weight:500;font-size:11px}
svg.header-visual .box{fill:#f8f5ea;stroke:var(--stone);stroke-width:1.2;rx:8}
svg.header-visual .hot{fill:rgba(217,119,87,.16);stroke:var(--terracotta)}
svg.header-visual .line{stroke:var(--terracotta-hover);stroke-width:2;fill:none}
@media(max-width:860px){header.has-visual{flex-direction:column}svg.header-visual{flex:none;width:100%}}
"""


def load_header_visual(path):
    # type: (Union[str, Path]) -> str
    """Read a static header SVG (top-right of the header, per the approved
    exemplar). Returns "" when the file is missing or is not an <svg> root;
    ensures the root tag carries class="flow header-visual" so the exemplar
    CSS applies."""
    svg_path = Path(path)
    if not svg_path.is_file():
        return ""
    text = svg_path.read_text(encoding="utf-8").strip()
    if text.startswith("<?xml"):
        text = text.split("?>", 1)[-1].strip()
    if not text.startswith("<svg"):
        return ""
    head, rest = text.split(">", 1)
    if "header-visual" not in head:
        match = re.search(r'class="([^"]*)"', head)
        if match:
            head = head.replace(match.group(0), 'class="%s header-visual"' % match.group(1), 1)
        else:
            head += ' class="flow header-visual"'
    return head + ">" + rest


# ---------------------------------------------------------------------------
# Hyperframes strip — ruling delta (c): up to 3 SVGs above the first section
# ---------------------------------------------------------------------------
HYPERFRAMES_CSS = """
.visual-package{margin:0 0 14px}
.visual-package-title{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 0 8px}
.visual-package-title h2{font-family:var(--font-sans,Inter,sans-serif);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--text-mute,#8C8A84);margin:0}
.visual-package-title span{font-size:10.5px;color:var(--text-mute,#8C8A84);font-weight:600}
.hypeframes{display:flex;flex-wrap:wrap;gap:12px}
.hypeframes .hypeframe{flex:1 1 0;min-width:200px;border:1px solid var(--stone,#D6D4C8);border-radius:8px;background:rgba(255,255,255,.58);overflow:hidden}
.hypeframe svg,.hypeframe img,.hypeframe video{display:block;width:100%;height:auto;aspect-ratio:1/1;object-fit:contain}
.hypeframe video{background:#111}
/* Rich inline HTML diagrams are not forced to a square — let them flow. */
.hypeframe figure,.hypeframe .hyperframe-html,.hypeframe canvas{display:block;width:100%;margin:0}
.hypeframe figure{padding:0}
@media(max-width:900px){.hypeframes{flex-direction:column}.hypeframes .hypeframe{min-width:0}}
"""

_RASTER_SUFFIXES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif"}
_VIDEO_SUFFIXES = {".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime"}
# Inline strings that are already renderable markup (embed as-is, not a path).
_INLINE_MEDIA_PREFIXES = ("<svg", "<video", "<figure", "<div", "<canvas", "<picture")


def _hyperframe_media(item: Union[str, Path]) -> str:
    """Render a hyperframe card's media. Accepts:
      - an inline SVG / HTML-diagram / <video> string (embedded verbatim),
      - a path to .svg (inlined), .html/.htm (detailed diagram fragment, inlined),
      - a raster image (.png/.jpg/.webp/.gif) -> base64 <img>,
      - a video (.mp4/.webm/.mov) -> base64 <video> (ambient loop).
    Videos/rasters embed as self-contained base64 data URIs because the artifact
    CSP blocks external hosts. Large mp4s inflate the HTML — keep clips short.
    """
    if isinstance(item, str):
        s = item.lstrip()
        if s.startswith(_INLINE_MEDIA_PREFIXES):
            return item
    path = Path(item)
    suffix = path.suffix.lower()
    if suffix == ".svg":
        return path.read_text(encoding="utf-8")
    if suffix in (".html", ".htm"):
        return path.read_text(encoding="utf-8")
    vmime = _VIDEO_SUFFIXES.get(suffix)
    if vmime:
        data = base64.b64encode(path.read_bytes()).decode()
        return (
            '<video class="hyperframe-video" autoplay loop muted playsinline preload="metadata" '
            'aria-label="%s"><source src="data:%s;base64,%s" type="%s"></video>'
        ) % (html_lib.escape(path.stem), vmime, data, vmime)
    mime = _RASTER_SUFFIXES.get(suffix)
    if mime:
        data = base64.b64encode(path.read_bytes()).decode()
        return '<img src="data:%s;base64,%s" alt="%s" loading="lazy">' % (mime, data, html_lib.escape(path.stem))
    raise ValueError("unsupported hyperframe asset: %s" % path)


def hyperframes_strip_html(
    hyperframes: Sequence[Union[str, Path]],
    title: str = "Hyperframe Pack",
    subtitle: str = "Visual proof cards",
) -> str:
    """The visual-package lead block placed ABOVE the first section (max 3)."""
    items = list(hyperframes or [])[:3]
    if not items:
        return ""
    cards = "".join('<article class="hypeframe">%s</article>' % _hyperframe_media(item) for item in items)
    return (
        '<section class="visual-package" aria-label="Report hyperframe pack">'
        '<div class="visual-package-title"><h2>%s</h2><span>%s</span></div>'
        '<div class="hypeframes">%s</div></section>'
    ) % (html_lib.escape(title), html_lib.escape(subtitle), cards)


def visual_package_html(cards_html: str, title: str = "Hyperframe Pack", subtitle: str = "Visual proof cards") -> str:
    """Wrap pre-built hyperframe <article> cards in the canonical strip shell.

    Used by renderers (e.g. render_collapsible_report) that build richer cards
    (zoom buttons, review ids) but must share the strip skeleton.
    """
    if not cards_html:
        return ""
    return (
        '<section class="visual-package" aria-label="Report hyperframe pack">'
        '<div class="visual-package-title"><h2>%s</h2><span>%s</span></div>'
        '<div class="hypeframes">%s</div></section>'
    ) % (html_lib.escape(title), html_lib.escape(subtitle), cards_html)




# ---------------------------------------------------------------------------
# AI Library paper trail — public-safe official report provenance
# ---------------------------------------------------------------------------
REPORT_AI_LIBRARY_SCHEMA_VERSION = "gbauto.report_ai_library.v1"
REPORT_AI_LIBRARY_CATEGORIES = [
    "profiles", "skills", "canopy_snippets", "prompts", "context_packs",
    "evidence", "renderers", "visual_prompts",
]
_SECRET_VALUE_RE = re.compile(
    r"(SUPABASE_SERVICE_ROLE|BEGIN (?:RSA )?PRIVATE KEY|sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]+|xox[baprs]-[A-Za-z0-9-]+|oauth[_-]?token|service[_-]?role|\.env)",
    re.I,
)
_UNSAFE_ABS_PATH_RE = re.compile(r"(?:/Users/[^\s'\"<>]+|/home/[^\s'\"<>]+|[A-Za-z]:\\[^\s'\"<>]+)")


def now_utc_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_file(path: Union[str, Path]) -> str:
    import hashlib
    p = Path(path)
    h = hashlib.sha256()
    with p.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return "sha256:" + h.hexdigest()


def safe_public_path(path_value: Any, repo_root: Optional[Path] = None) -> str:
    raw = str(path_value or "").strip()
    if not raw:
        return ""
    root = Path(repo_root or REPO_ROOT).resolve()
    p = Path(raw).expanduser()
    try:
        if p.is_absolute():
            resolved = p.resolve()
            try:
                return resolved.relative_to(root).as_posix()
            except ValueError:
                return resolved.name or "[redacted-path]"
    except Exception:
        pass
    normalized = raw.replace("\\", "/")
    if normalized.startswith(("/Users/", "/home/")) or re.match(r"^[A-Za-z]:/", normalized):
        return Path(normalized).name or "[redacted-path]"
    return normalized.lstrip("./")


def _redact_string(value: str, repo_root: Optional[Path], removed_fields: List[str]) -> str:
    out = value
    if _SECRET_VALUE_RE.search(out):
        removed_fields.append("secret_like_value")
        out = _SECRET_VALUE_RE.sub("[redacted]", out)
    if _UNSAFE_ABS_PATH_RE.search(out):
        removed_fields.append("unsafe_absolute_path")
        out = _UNSAFE_ABS_PATH_RE.sub(lambda m: safe_public_path(m.group(0), repo_root), out)
    return out


def sanitize_report_ai_library(data: Dict[str, Any], repo_root: Optional[Path] = None) -> Dict[str, Any]:
    if data.get("schema_version") != REPORT_AI_LIBRARY_SCHEMA_VERSION:
        raise ValueError("unsupported AI Library schema_version: %r" % data.get("schema_version"))
    removed_fields: List[str] = []
    def clean(value: Any, key: str = "") -> Any:
        if key in {"body", "prompt_body", "private_prompt_body", "raw", "env", "secret", "token"}:
            removed_fields.append(key)
            return "[redacted]"
        if isinstance(value, dict):
            return {str(k): clean(v, str(k)) for k, v in value.items() if str(k) not in {"credential", "credentials"}}
        if isinstance(value, list):
            return [clean(v, key) for v in value]
        if isinstance(value, str):
            if key.endswith("path") or key in {"source_path", "html_path", "manifest_path", "package_root", "asset_path"}:
                return _redact_string(safe_public_path(value, repo_root), repo_root, removed_fields)
            return _redact_string(value, repo_root, removed_fields)
        return value
    sanitized = clean(data)
    for category in REPORT_AI_LIBRARY_CATEGORIES:
        sanitized.setdefault("used_for_this_report", {}).setdefault(category, [])
    sanitization = dict(sanitized.get("sanitization") or {})
    merged_removed = list(dict.fromkeys(list(sanitization.get("removed_fields") or []) + removed_fields))
    sanitization.update({"public_safe": True, "removed_fields": merged_removed, "redaction_count": len(merged_removed), "rules": ["no_secrets", "no_env_contents", "no_oauth", "no_service_keys", "no_private_prompt_bodies", "no_unsafe_absolute_paths"]})
    sanitized["sanitization"] = sanitization
    return sanitized


def report_ai_library_entry(category: str, label: str, source_path: str = "", source_kind: str = "", recorded_by: str = "renderer", content_hash: str = "", size_bytes: int = 0, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if category not in REPORT_AI_LIBRARY_CATEGORIES:
        raise ValueError("unknown AI Library category: %s" % category)
    stable = re.sub(r"[^a-z0-9]+", "-", (source_path or label).lower()).strip("-") or category
    return {"id": "%s:%s" % (category, stable[:96]), "label": label, "category": category, "source_path": safe_public_path(source_path), "source_kind": source_kind or category.rstrip("s"), "recorded_by": recorded_by, "used_for_this_report": True, "recommendation": False, "content_hash": content_hash, "size_bytes": int(size_bytes or 0), "metadata": metadata or {}}


def build_report_ai_library(report: Dict[str, Any], used_for_this_report: Optional[Dict[str, List[Dict[str, Any]]]] = None, adjacent_files: Optional[Sequence[str]] = None, generator: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    used = {cat: list((used_for_this_report or {}).get(cat) or []) for cat in REPORT_AI_LIBRARY_CATEGORIES}
    data = {"schema_version": REPORT_AI_LIBRARY_SCHEMA_VERSION, "generated_at": now_utc_iso(), "generator": generator or {"name": "gbauto-doc-template", "path": "resources/lib/gbauto_doc_template.py", "renderer": "gbauto_doc_template.py"}, "report": dict(report or {}), "used_for_this_report": used, "adjacent_ecosystem": {"scope": "bounded_one_hop_file_tree_context", "note": "Context only; not inferred recommendations.", "files": [safe_public_path(p) for p in (adjacent_files or [])]}, "sanitization": {"public_safe": True, "removed_fields": [], "redaction_count": 0, "rules": ["no_secrets", "no_env_contents", "no_oauth", "no_service_keys", "no_private_prompt_bodies", "no_unsafe_absolute_paths"]}}
    return sanitize_report_ai_library(data)


def render_ai_library_modal_html(ai_library_data: Optional[Dict[str, Any]]) -> str:
    if not ai_library_data:
        return '<div data-ai-library-root data-ai-library-disabled="true" hidden></div>'
    data = sanitize_report_ai_library(ai_library_data)
    payload = json.dumps(data, ensure_ascii=False, sort_keys=True).replace("</", "<\\/")
    return """
<div class="ai-library" data-ai-library-root data-ai-library-open="false" data-ai-library-view="rendered">
  <button type="button" class="ai-library-tab" aria-expanded="false" aria-controls="ai-library-modal">AI Library<span>Ctrl+;</span></button>
  <div class="ai-library-backdrop" data-ai-library-close></div>
  <aside id="ai-library-modal" class="ai-library-modal" role="dialog" aria-modal="true" aria-label="AI Library paper trail" aria-hidden="true">
    <div class="ai-library-head"><div><p class="ai-library-kicker">AI Library paper trail</p><h2>Used for this report</h2><p data-ai-library-meta></p></div><button type="button" data-ai-library-close aria-label="Close AI Library">&#215;</button></div>
    <div class="ai-library-toolbar"><input data-ai-library-search type="search" placeholder="Search labels, paths, metadata" aria-label="Search AI Library"><button type="button" data-ai-library-prev>Prev</button><button type="button" data-ai-library-next>Next</button><button type="button" data-ai-library-toggle>Raw</button><button type="button" data-ai-library-copy="all">Copy JSON</button></div>
    <div class="ai-library-status" data-ai-library-status></div>
    <div class="ai-library-rendered" data-ai-library-rendered></div>
    <pre class="ai-library-raw" data-ai-library-raw hidden></pre>
  </aside>
</div>
<script type="application/json" id="gbauto-ai-library-data" data-schema-version="%s">%s</script>""" % (REPORT_AI_LIBRARY_SCHEMA_VERSION, payload)

AI_LIBRARY_CSS = """
.ai-library{position:fixed;inset:0;z-index:2147482500;pointer-events:none;font-family:var(--font-sans,Inter,sans-serif)}
.ai-library-tab{position:fixed;left:0;top:58%;transform:translateY(-50%);pointer-events:auto;border:0;border-radius:0 9px 9px 0;background:var(--ink,#191919);color:#fff;font:inherit;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:14px 8px;writing-mode:vertical-rl;cursor:pointer;box-shadow:2px 2px 12px rgba(0,0,0,.18)}
.ai-library-tab span{margin-top:8px;font-size:9px;opacity:.75;letter-spacing:.02em}.ai-library-backdrop{display:none;position:fixed;inset:0;background:rgba(25,25,25,.42);pointer-events:auto}.ai-library-modal{position:fixed;left:5vw;top:5vh;width:90vw;height:90vh;max-width:90vw;max-height:90vh;display:flex;flex-direction:column;gap:12px;overflow:hidden;border:1px solid var(--stone,#D6D4C8);border-radius:12px;background:var(--cream-bg,#F3F1E7);box-shadow:0 20px 70px rgba(0,0,0,.28);padding:22px;transform:scale(.98);opacity:0;pointer-events:none;transition:opacity .15s ease,transform .15s ease}.ai-library[data-ai-library-open="true"] .ai-library-backdrop{display:block}.ai-library[data-ai-library-open="true"] .ai-library-modal{opacity:1;transform:scale(1);pointer-events:auto}.ai-library-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.ai-library-head h2{margin:2px 0 6px;font-family:var(--font-serif,serif);font-size:30px;font-weight:500}.ai-library-kicker{margin:0;color:var(--terracotta,#D97757);font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.ai-library-head [data-ai-library-close]{border:0;background:none;color:var(--ink,#191919);font-size:30px;cursor:pointer}.ai-library-toolbar{display:flex;flex-wrap:wrap;gap:8px}.ai-library-toolbar input{flex:1 1 280px;min-height:38px;border:1px solid var(--stone,#D6D4C8);border-radius:8px;background:rgba(255,255,255,.7);padding:8px 11px;font:inherit}.ai-library-toolbar button,.ai-library-entry button{border:1px solid var(--stone,#D6D4C8);border-radius:8px;background:rgba(255,255,255,.58);padding:8px 10px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}.ai-library-status{color:var(--text-mute,#8C8A84);font-size:12px;font-weight:700}.ai-library-rendered{overflow:auto;display:grid;gap:10px;padding-right:4px}.ai-library-category{border:1px solid var(--stone,#D6D4C8);border-radius:9px;background:rgba(255,255,255,.52);overflow:hidden}.ai-library-category>summary{cursor:pointer;list-style:none;padding:13px 15px;display:flex;justify-content:space-between;gap:12px;font-weight:800}.ai-library-category>summary::-webkit-details-marker{display:none}.ai-library-category-body{display:grid;gap:10px;border-top:1px solid rgba(214,212,200,.75);padding:13px}.ai-library-entry{border:1px solid rgba(214,212,200,.85);border-radius:8px;background:rgba(243,241,231,.72);padding:12px;display:grid;gap:7px}.ai-library-entry mark{background:rgba(217,119,87,.18);color:inherit}.ai-library-entry-meta{display:flex;flex-wrap:wrap;gap:8px;color:var(--text-mute,#8C8A84);font-size:11px}.ai-library-entry-path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;overflow-wrap:anywhere}.ai-library-raw{flex:1;overflow:auto;border:1px solid var(--stone,#D6D4C8);border-radius:8px;background:rgba(255,255,255,.7);padding:14px;font-size:12px;white-space:pre-wrap}.ai-library[data-ai-library-view="raw"] .ai-library-rendered{display:none}@media print{.ai-library{display:none!important}}
"""

AI_LIBRARY_SCRIPT = """
<script>
(function(){
  var root=document.querySelector('[data-ai-library-root]');
  var dataEl=document.getElementById('gbauto-ai-library-data');
  if(!root||!dataEl||root.hasAttribute('data-ai-library-disabled'))return;
  var data={};try{data=JSON.parse(dataEl.textContent||'{}');}catch(e){data={};}
  var tab=root.querySelector('.ai-library-tab'),modal=document.getElementById('ai-library-modal'),search=root.querySelector('[data-ai-library-search]'),rendered=root.querySelector('[data-ai-library-rendered]'),raw=root.querySelector('[data-ai-library-raw]'),status=root.querySelector('[data-ai-library-status]'),meta=root.querySelector('[data-ai-library-meta]');
  var lastFocus=null, matches=[], activeIndex=0;
  function esc(s){return String(s==null?'':s).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c];});}
  function md(s){return esc(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\\n/g,'<br>');}
  function searchable(e){return JSON.stringify(e).toLowerCase();}
  function render(){var q=(search&&search.value||'').toLowerCase().trim();var cats=data.used_for_this_report||{};matches=[];var out='';Object.keys(cats).forEach(function(cat){var rows=(cats[cat]||[]).filter(function(e){return !q||searchable(e).indexOf(q)>=0;});matches=matches.concat(rows);out+='<details class="ai-library-category" data-ai-library-category="'+esc(cat)+'" open><summary><span>'+esc(cat.replace(/_/g,' '))+'</span><span>'+rows.length+'</span></summary><div class="ai-library-category-body">';if(!rows.length)out+='<p>No directly recorded entries.</p>';rows.forEach(function(e){out+='<article class="ai-library-entry" data-ai-library-entry-id="'+esc(e.id)+'" data-ai-library-category="'+esc(cat)+'"><strong>'+md(e.label||e.id)+'</strong><div class="ai-library-entry-meta"><span>'+esc(e.source_kind||cat)+'</span><span>'+esc(e.recorded_by||'recorded')+'</span><span>recommendation: '+esc(String(!!e.recommendation))+'</span></div><div class="ai-library-entry-path">'+esc(e.source_path||'')+'</div><div>'+md((e.metadata&&(e.metadata.description||e.metadata.note))||'')+'</div><button type="button" data-ai-library-copy="entry">Copy path/hash</button></article>';});out+='</div></details>';});rendered.innerHTML=out;raw.textContent=JSON.stringify(data,null,2);status.textContent=matches.length+' matching entries';meta.textContent=[data.schema_version,data.generated_at,(data.report&&data.report.title)||'',(data.sanitization&&data.sanitization.public_safe?'public safe':'not marked safe')].filter(Boolean).join(' · ');}
  function setOpen(open){root.setAttribute('data-ai-library-open',open?'true':'false');tab.setAttribute('aria-expanded',open?'true':'false');modal.setAttribute('aria-hidden',open?'false':'true');if(open){lastFocus=document.activeElement;render();setTimeout(function(){(search||modal).focus();},0);}else if(lastFocus&&lastFocus.focus){lastFocus.focus();}}
  window.gbautoOpenAiLibraryEntry=function(query){setOpen(true);if(search){search.value=query||'';render();}setTimeout(function(){var id=matches[0]&&matches[0].id;var el=id&&root.querySelector('[data-ai-library-entry-id="'+(window.CSS&&CSS.escape?CSS.escape(id):String(id).replace(/"/g,''))+'"]');if(el){el.scrollIntoView({block:'center'});el.focus&&el.focus();}},0);};
  function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t);var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();return Promise.resolve();}
  tab.addEventListener('click',function(){setOpen(root.getAttribute('data-ai-library-open')!=='true');});root.querySelectorAll('[data-ai-library-close]').forEach(function(b){b.addEventListener('click',function(){setOpen(false);});});
  search&&search.addEventListener('input',render);root.querySelector('[data-ai-library-toggle]').addEventListener('click',function(){var rawView=root.getAttribute('data-ai-library-view')==='raw';root.setAttribute('data-ai-library-view',rawView?'rendered':'raw');raw.hidden=rawView;this.textContent=rawView?'Raw':'Rendered';});
  root.querySelector('[data-ai-library-copy="all"]').addEventListener('click',function(){copyText(JSON.stringify(data,null,2));});rendered.addEventListener('click',function(e){var btn=e.target.closest('[data-ai-library-copy="entry"]');if(!btn)return;var card=btn.closest('[data-ai-library-entry-id]');copyText((card.querySelector('.ai-library-entry-path')||{}).textContent||card.getAttribute('data-ai-library-entry-id'));});
  function jump(delta){if(!matches.length)render();if(!matches.length)return;activeIndex=(activeIndex+delta+matches.length)%matches.length;var sel='[data-ai-library-entry-id="'+(window.CSS&&CSS.escape?CSS.escape(matches[activeIndex].id):matches[activeIndex].id.replace(/"/g,''))+'"]';var el=root.querySelector(sel);if(el){el.scrollIntoView({block:'center'});}}
  root.querySelector('[data-ai-library-prev]').addEventListener('click',function(){jump(-1);});root.querySelector('[data-ai-library-next]').addEventListener('click',function(){jump(1);});
  document.addEventListener('keydown',function(e){var key=e.key||'';if((e.ctrlKey||e.metaKey)&&key===';'){e.preventDefault();setOpen(root.getAttribute('data-ai-library-open')!=='true');return;}if(key==='Escape'&&root.getAttribute('data-ai-library-open')==='true'){setOpen(false);}});
  render();
})();
</script>"""

# ---------------------------------------------------------------------------
# Feedback command drawer — comments + Agent Expert routing through Edge Functions
# ---------------------------------------------------------------------------
# The endpoint is public; the anon key is the PUBLIC publishable key (RLS keeps
# anon INSERT closed — writes happen inside the function via its own service
# role, which never appears in the page). NO other secret may enter the embed.
FEEDBACK_FN_URL_DEFAULT = "https://aejkzyjrlsfryfidwedm.supabase.co/functions/v1/feedback-capture"
WEBSITE_FEEDBACK_FN_URL_DEFAULT = "https://aejkzyjrlsfryfidwedm.supabase.co/functions/v1/website-feedback-submit"
EXPERT_DOMAIN_REGISTRY = REPO_ROOT / "second-brain" / "systems" / "expert-skill-canopy-target.yaml"

# Compact operator commands shown beside the full Agent Expert registry. The
# prompt text is intentionally human-readable: selecting a command prepares a
# request for the feedback intake queue, it does not execute the skill in the
# browser. ``skill`` is canonical catalog metadata consumed by the operator.
FLEET_COMMAND_GROUPS = (
    {
        "slug": "observability",
        "label": "Observability",
        "commands": (
            {
                "slug": "check-langfuse-logs",
                "label": "Check Langfuse logs",
                "skill": "check-langfuse-logs",
                "prompt": "Check Langfuse logs for",
            },
            {
                "slug": "telemetry-report",
                "label": "Telemetry report",
                "skill": "telemetry-report",
                "prompt": "Generate a telemetry report for",
            },
            {
                "slug": "trace-lookup",
                "label": "Trace lookup",
                "skill": "check-langfuse-logs",
                "prompt": "Look up this Langfuse trace:",
            },
        ),
    },
    {
        "slug": "search-memory",
        "label": "Search & memory",
        "commands": (
            {
                "slug": "session-search",
                "label": "Session search",
                "skill": "session-query",
                "prompt": "Search agent sessions for",
            },
            {
                "slug": "tac-knowledge-search",
                "label": "TAC knowledge",
                "skill": "tac-kb-query",
                "prompt": "Search the TAC knowledge base for",
            },
            {
                "slug": "work-intelligence",
                "label": "Work intelligence",
                "skill": "work-intelligence",
                "prompt": "Build a work-intelligence view for",
            },
        ),
    },
    {
        "slug": "git-delivery",
        "label": "Git & delivery",
        "commands": (
            {
                "slug": "git-search",
                "label": "Git search",
                "skill": "github-index",
                "prompt": "Search Git history for",
            },
            {
                "slug": "session-git-status",
                "label": "Session Git status",
                "skill": "session-git-status",
                "prompt": "Audit this session's Git status and push state for",
            },
            {
                "slug": "pr-checks",
                "label": "PR checks",
                "skill": "gha-running-jobs-monitor",
                "prompt": "Check pull request and CI status for",
            },
        ),
    },
    {
        "slug": "fleet-operations",
        "label": "Fleet operations",
        "commands": (
            {
                "slug": "worktree-audit",
                "label": "Worktree audit",
                "skill": "git-workspace-cleanup",
                "prompt": "Audit fleet worktrees and recoverable Git state for",
            },
            {
                "slug": "running-actions",
                "label": "Running Actions",
                "skill": "gha-running-jobs-monitor",
                "prompt": "Show running GitHub Actions jobs for",
            },
            {
                "slug": "kanban-fleet-status",
                "label": "Kanban / fleet status",
                "skill": "work-intelligence",
                "prompt": "Summarize Kanban and agent fleet status for",
            },
        ),
    },
)


def resolve_feedback_fn_url() -> str:
    return os.environ.get("FEEDBACK_FN_URL", FEEDBACK_FN_URL_DEFAULT)


def resolve_website_feedback_fn_url() -> str:
    return os.environ.get("WEBSITE_FEEDBACK_FN_URL", WEBSITE_FEEDBACK_FN_URL_DEFAULT)


def registered_expert_domains() -> List[str]:
    """Read expert slugs from the canonical registry without adding a YAML dependency."""
    try:
        text = EXPERT_DOMAIN_REGISTRY.read_text(encoding="utf-8")
    except OSError:
        return []
    return re.findall(r"(?m)^- expert:\s*([a-z0-9-]+)\s*$", text)


def _expert_domain_label(domain: str) -> str:
    special = {"aws": "AWS", "gbauto": "GBauto", "github": "GitHub"}
    return " ".join(special.get(part, part.capitalize()) for part in domain.split("-"))


def _fleet_command_groups_html() -> str:
    groups: List[str] = []
    for group in FLEET_COMMAND_GROUPS:
        group_slug = html_lib.escape(str(group["slug"]), quote=True)
        buttons = "".join(
            '<button type="button" class="fb-command-pill" data-fb-command="%s" '
            'data-fb-group="%s" data-fb-skill="%s" data-fb-prompt="%s" '
            'aria-pressed="false" title="Prefill request for %s">%s</button>'
            % (
                html_lib.escape(str(command["slug"]), quote=True),
                group_slug,
                html_lib.escape(str(command["skill"]), quote=True),
                html_lib.escape(str(command["prompt"]), quote=True),
                html_lib.escape(str(command["skill"]), quote=True),
                html_lib.escape(str(command["label"])),
            )
            for command in group["commands"]
        )
        groups.append(
            '<section class="fb-command-group" data-fb-command-group="%s">'
            '<div class="fb-command-group-title">%s</div>'
            '<div class="fb-command-pills" role="group" aria-label="%s commands">%s</div>'
            '</section>'
            % (
                group_slug,
                html_lib.escape(str(group["label"])),
                html_lib.escape(str(group["label"]), quote=True),
                buttons,
            )
        )
    return "".join(groups)


def resolve_feedback_anon_key() -> str:
    """Publishable anon key. Env var wins (SMOKE_SUPABASE_ANON_KEY /
    SUPABASE_ANON_KEY); else a best-effort read of AWS Secrets Manager
    (gbautomation/infrastructure/supabase/gbauto, anon_key field) where the aws
    CLI is authed (PC + Mini). Degrades to "" (widget renders a "not configured"
    notice) so a page never blocks on the key. The key is the PUBLIC publishable
    key — safe to embed in client HTML.
    """
    key = os.environ.get("SMOKE_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")
    if key.strip():
        return key.strip()
    # Escape hatch: skip the SM shell-out under pytest (determinism) or when a
    # caller needs a reproducible hash (e.g. the transcript report sets this).
    if os.environ.get("GBAUTO_FEEDBACK_NO_SM") or os.environ.get("PYTEST_CURRENT_TEST"):
        return ""
    # Best-effort AWS SM fallback so every report auto-arms without an env-set.
    try:
        import subprocess
        out = subprocess.run(
            ["aws", "secretsmanager", "get-secret-value",
             "--secret-id", "gbautomation/infrastructure/supabase/gbauto",
             "--query", "SecretString", "--output", "text"],
            capture_output=True, text=True, timeout=15,
        )
        if out.returncode == 0 and out.stdout.strip():
            raw = out.stdout.strip()
            try:
                data = json.loads(raw)
                cand = str(data.get("anon_key") or data.get("SUPABASE_ANON_KEY") or "").strip()
            except json.JSONDecodeError:
                cand = raw
            if cand:
                return cand
    except Exception:
        pass
    return ""


def feedback_anon_key_is_public(key: str) -> bool:
    """Reject known Supabase secret/service-role key formats.

    Empty keys are allowed so local previews can render an explicitly
    unconfigured drawer. Opaque test or legacy publishable values are accepted
    unless they carry a known secret prefix or a JWT role other than ``anon``.
    """
    value = str(key or "").strip()
    if not value:
        return True
    if value.lower().startswith(("sb_secret_", "service_role")):
        return False
    parts = value.split(".")
    if len(parts) == 3:
        try:
            payload = parts[1] + "=" * (-len(parts[1]) % 4)
            role = str(json.loads(base64.urlsafe_b64decode(payload).decode("utf-8")).get("role") or "")
        except (ValueError, UnicodeError, json.JSONDecodeError, AttributeError):
            role = ""
        if role and role != "anon":
            return False
    return True


def _js(value: str) -> str:
    """JSON-encode for inline <script>, escaping </ so markup can't break out."""
    return json.dumps(value).replace("</", "<\\/")


FEEDBACK_CSS = """
.feedback{position:fixed;inset:0;z-index:2147483000;font-size:13px;pointer-events:none}
.feedback .fb-tab,.feedback .fb-drawer{pointer-events:auto}
.fb-annotation-hover{outline:2px solid var(--terracotta,#D97757)!important;outline-offset:2px!important;cursor:crosshair!important}
.fb-annotating{cursor:crosshair}
.fb-tab{position:fixed;right:16px;bottom:16px;display:flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.18);border-radius:7px;background:var(--ink,#191919);color:#fff;font:inherit;font-size:12px;font-weight:750;letter-spacing:.09em;text-transform:uppercase;padding:9px 11px;cursor:pointer;box-shadow:0 12px 30px rgba(0,0,0,.2);transition:background .15s,transform .18s ease,opacity .18s}
.fb-tab:hover{background:var(--terracotta,#D97757);transform:translateY(-1px)}
.fb-tab-key{font-size:9px;font-weight:650;opacity:.72;letter-spacing:.03em;text-transform:none}
.fb-drawer{position:fixed;inset:auto 0 0;width:100vw;height:auto;min-height:0;max-width:none;max-height:min(76vh,620px);box-sizing:border-box;background:rgba(243,241,231,.98);border-top:1px solid var(--stone,#D6D4C8);box-shadow:0 -18px 48px rgba(0,0,0,.18);transform:translateY(105%);transition:transform .24s cubic-bezier(.4,0,.2,1);padding:0;overflow-y:auto;display:block;backdrop-filter:blur(12px)}
.feedback[data-fb-open="true"] .fb-drawer{transform:translateY(0)}
.feedback[data-fb-open="true"] .fb-tab{opacity:0;pointer-events:none;transform:translateY(8px)}
.fb-drawer-inner{width:100%;padding:10px 16px 13px}
.fb-drawer-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:7px}
.fb-head-copy{display:flex;align-items:baseline;gap:9px;min-width:0}
.feedback-label{color:var(--terracotta,#D97757);font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;line-height:1.4}
.fb-shortcuts{color:var(--text-mute,#8C8A84);font-size:11px;white-space:nowrap}
.fb-close{display:grid;place-items:center;width:28px;height:28px;border:1px solid var(--stone,#D6D4C8);border-radius:6px;background:rgba(255,255,255,.55);font-size:18px;line-height:1;color:var(--text-muted-2,#5C5C5C);cursor:pointer;padding:0}
.fb-close:hover{border-color:var(--terracotta,#D97757);color:var(--ink,#191919)}
.fb-auth-row{display:flex;align-items:center;gap:8px;margin:0 0 7px;padding:6px 8px;border:1px solid var(--stone,#D6D4C8);border-radius:6px;background:rgba(255,255,255,.4)}
.fb-auth-signin,.fb-auth-signout{border:1px solid var(--stone,#D6D4C8);border-radius:999px;background:rgba(255,255,255,.55);color:var(--ink,#191919);font:inherit;font-size:11px;font-weight:750;padding:4px 9px;cursor:pointer}
.fb-auth-signin:hover,.fb-auth-signout:hover{border-color:var(--terracotta,#D97757)}
.fb-auth-identity{color:var(--text-muted-2,#5C5C5C);font-size:11px;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fb-command-bar{display:flex;align-items:center;gap:8px;margin:0 0 7px}
.fb-command-tabs{display:flex;flex-wrap:wrap;gap:4px;margin:0}
.fb-mode{border:1px solid transparent;border-radius:999px;background:transparent;color:var(--text-muted-2,#5C5C5C);font:inherit;font-size:11px;font-weight:750;letter-spacing:.05em;text-transform:uppercase;padding:4px 8px;cursor:pointer}
.fb-mode[aria-selected="true"]{border-color:var(--terracotta,#D97757);background:rgba(217,119,87,.1);color:var(--ink,#191919)}
.fb-annotate-toggle{margin-left:auto;border:1px solid var(--stone,#D6D4C8);border-radius:999px;background:rgba(255,255,255,.48);color:var(--text-muted-2,#5C5C5C);font:inherit;font-size:10px;font-weight:750;letter-spacing:.05em;text-transform:uppercase;padding:4px 7px;cursor:pointer}
.fb-annotate-toggle[aria-pressed="true"]{border-color:var(--terracotta,#D97757);background:var(--terracotta,#D97757);color:var(--ink,#191919)}
#fb-form{display:grid;grid-template-columns:minmax(160px,220px) minmax(0,1fr) auto;gap:8px;align-items:end}
.feedback[data-fb-mode="settings"] #fb-form{display:none}
.feedback[data-fb-mode="settings"] .fb-annotate-toggle{display:none}
.fb-command-panel{grid-column:1/-1;min-width:0}
.fb-command-panel[hidden]{display:none}
.fb-route{display:grid;gap:5px;align-self:stretch}
.fb-row{display:flex;align-items:center;gap:6px;color:var(--text-muted-2,#5C5C5C);font-size:12px}
#fb-section,#fb-msg{width:100%;border:1px solid var(--stone,#D6D4C8);border-radius:6px;background:rgba(255,255,255,.62);padding:7px 8px;color:var(--ink,#191919);font:inherit;font-size:13px;box-sizing:border-box}
#fb-section{min-width:0;height:31px;flex:1;padding-block:4px}
#fb-msg{resize:vertical;line-height:1.4;min-height:70px;max-height:180px}
#fb-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.fb-expert-wrap,.fb-fleet-wrap{display:grid;gap:5px}
.fb-feedback-intro{margin:0;border:1px solid var(--stone,#D6D4C8);border-radius:7px;background:rgba(255,255,255,.42);padding:7px 9px;color:var(--text-muted-2,#5C5C5C);font-size:11px;line-height:1.4}
.fb-expert-head{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--text-mute,#8C8A84);font-size:10px;font-weight:750;letter-spacing:.1em;text-transform:uppercase}
.fb-expert-pills{display:flex;flex-wrap:wrap;gap:3px;max-height:54px;overflow:auto;padding:1px 1px 2px}
.fb-expert-pill{border:1px solid var(--stone,#D6D4C8);border-radius:999px;background:rgba(255,255,255,.48);color:var(--text-muted-2,#5C5C5C);font:inherit;font-size:10px;font-weight:700;line-height:1;padding:4px 6px;cursor:pointer;white-space:nowrap}
.fb-expert-pill:hover{border-color:var(--terracotta,#D97757);color:var(--ink,#191919)}
.fb-expert-pill[aria-pressed="true"]{border-color:var(--terracotta,#D97757);background:var(--terracotta,#D97757);color:var(--ink,#191919)}
.fb-fleet-groups{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.fb-command-group{--fb-group-accent:var(--terracotta,#D97757);--fb-group-on-accent:var(--ink,#191919);--fb-group-bg:rgba(217,119,87,.08);min-width:0;border:1px solid var(--stone,#D6D4C8);border-top:2px solid var(--fb-group-accent);border-radius:7px;background:var(--fb-group-bg);padding:6px}
.fb-command-group[data-fb-command-group="observability"]{--fb-group-accent:#3D6EA8;--fb-group-on-accent:#FFFFFF;--fb-group-bg:rgba(61,110,168,.08)}
.fb-command-group[data-fb-command-group="search-memory"]{--fb-group-accent:#7557A8;--fb-group-on-accent:#FFFFFF;--fb-group-bg:rgba(117,87,168,.08)}
.fb-command-group[data-fb-command-group="git-delivery"]{--fb-group-accent:#4F9D69;--fb-group-on-accent:var(--ink,#191919);--fb-group-bg:rgba(79,157,105,.08)}
.fb-command-group[data-fb-command-group="fleet-operations"]{--fb-group-accent:#D97757;--fb-group-on-accent:var(--ink,#191919);--fb-group-bg:rgba(217,119,87,.08)}
.fb-command-group-title{display:flex;align-items:center;gap:5px;margin:0 0 5px;color:var(--ink,#191919);font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.fb-command-group-title::before{content:"";width:7px;height:7px;flex:0 0 auto;border-radius:999px;background:var(--fb-group-accent)}
.fb-command-pills{display:flex;flex-wrap:wrap;gap:4px}
.fb-command-pill{border:1px solid color-mix(in srgb,var(--fb-group-accent) 48%,var(--stone,#D6D4C8));border-radius:999px;background:rgba(255,255,255,.58);color:var(--text-muted-2,#5C5C5C);font:inherit;font-size:10px;font-weight:700;line-height:1.1;padding:4px 6px;cursor:pointer;white-space:nowrap}
.fb-command-pill:hover{border-color:var(--fb-group-accent);color:var(--ink,#191919)}
.fb-command-pill[aria-pressed="true"]{border-color:var(--fb-group-accent);background:var(--fb-group-accent);color:var(--fb-group-on-accent,var(--ink,#191919))}
.fb-target-wrap{grid-column:1/-1;display:none;align-items:center;gap:6px;min-width:0;border:1px solid rgba(217,119,87,.34);border-radius:6px;background:rgba(217,119,87,.08);padding:5px 7px}
.feedback[data-fb-has-target="true"] .fb-target-wrap{display:flex}
.fb-target-label{color:var(--terracotta,#D97757);font-size:10px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;white-space:nowrap}
.fb-target-copy{min-width:0;overflow:hidden;color:var(--ink,#191919);font:650 11px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-overflow:ellipsis;white-space:nowrap}
.fb-target-clear{margin-left:auto;flex:0 0 auto;border:0;background:transparent;color:var(--text-muted-2,#5C5C5C);font:inherit;font-size:12px;line-height:1;cursor:pointer;padding:1px 3px}
.fb-actions{display:flex;flex-direction:column;align-items:stretch;gap:5px;min-width:112px}
#fb-submit{height:34px;border:0;border-radius:6px;background:var(--ink,#191919);padding:7px 12px;color:#fff;font:inherit;font-size:13px;font-weight:750;cursor:pointer;white-space:nowrap}
#fb-submit:hover{background:var(--terracotta,#D97757)}
#fb-submit:disabled{opacity:.6;cursor:default}
.fb-status{min-height:13px;color:var(--text-muted-2,#5C5C5C);font-size:12px;line-height:1.3}
.fb-hint{margin:0;color:var(--text-mute,#8C8A84);font-size:11px;line-height:1.3}
.fb-settings-panel{display:grid;gap:8px;min-width:0}
.fb-settings-panel[hidden]{display:none}
.fb-settings-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.fb-settings-head strong{display:block;color:var(--ink,#191919);font-size:13px;font-weight:800}
.fb-settings-head p{margin:2px 0 0;color:var(--text-muted-2,#5C5C5C);font-size:11px;line-height:1.35}
.fb-theme-reset{flex:0 0 auto;border:1px solid var(--stone,#D6D4C8);border-radius:7px;background:rgba(255,255,255,.58);color:var(--ink,#191919);font:inherit;font-size:11px;font-weight:750;padding:6px 9px;cursor:pointer}
.fb-theme-reset:hover{border-color:var(--terracotta,#D97757)}
.fb-theme-toolbar{display:flex;align-items:center;gap:5px}
.fb-theme-toolbar button{border:1px solid var(--stone,#D6D4C8);border-radius:999px;background:transparent;color:var(--text-muted-2,#5C5C5C);font:inherit;font-size:10px;font-weight:750;padding:4px 8px;cursor:pointer}
.fb-theme-toolbar button[aria-pressed="true"]{border-color:var(--terracotta,#D97757);background:rgba(217,119,87,.1);color:var(--ink,#191919)}
.fb-theme-toolbar span{margin-left:auto;color:var(--text-mute,#8C8A84);font-size:10px;font-weight:700}
.fb-theme-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;max-height:min(47vh,360px);overflow:auto;padding:1px 3px 3px 1px}
.fb-theme-card{min-width:0;display:grid;gap:5px;border:1px solid var(--stone,#D6D4C8);border-radius:8px;background:rgba(255,255,255,.48);color:var(--ink,#191919);padding:7px;text-align:left;font:inherit;cursor:pointer;box-shadow:none}
.fb-theme-card:hover{border-color:var(--terracotta,#D97757);transform:translateY(-1px)}
.fb-theme-card[aria-pressed="true"]{border-color:var(--terracotta,#D97757);box-shadow:inset 0 0 0 1px var(--terracotta,#D97757)}
.fb-theme-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:5px;min-width:0}
.fb-theme-card-head>span:first-child{min-width:0}
.fb-theme-card strong{display:block;overflow:hidden;color:inherit;font-size:11px;font-weight:800;line-height:1.2;text-overflow:ellipsis;white-space:nowrap}
.fb-theme-card small{display:block;margin-top:2px;color:var(--text-mute,#8C8A84);font-size:9px;font-weight:750;letter-spacing:.07em;text-transform:uppercase}
.fb-theme-check{flex:0 0 auto;color:var(--terracotta,#D97757);font-size:9px;font-weight:800;text-transform:uppercase}
.fb-theme-swatches{display:grid;grid-template-columns:repeat(8,1fr);height:12px;overflow:hidden;border:1px solid rgba(25,25,25,.12);border-radius:4px}
.fb-theme-swatch{background:var(--fb-theme-swatch)}
.fb-theme-note{overflow:hidden;color:var(--text-muted-2,#5C5C5C);font-size:9px;font-weight:600;line-height:1.25;text-overflow:ellipsis;white-space:nowrap}
.fb-theme-status{min-height:14px;margin:0;color:var(--text-muted-2,#5C5C5C);font-size:11px;font-weight:650;line-height:1.3}
@media (max-width:900px){.fb-fleet-groups{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:860px){.fb-theme-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:720px){.fb-drawer{max-height:88vh}.fb-drawer-inner{padding:10px 10px 12px}.fb-head-copy{align-items:flex-start;flex-direction:column;gap:1px}.fb-command-bar{align-items:flex-start}.fb-annotate-toggle{margin-top:1px}#fb-form{grid-template-columns:1fr}.fb-command-panel,.fb-target-wrap{grid-column:1}.fb-actions{display:grid;grid-template-columns:auto 1fr;align-items:center}.fb-hint{grid-column:1/-1}.fb-expert-pills{max-height:72px}.fb-theme-grid{grid-template-columns:repeat(2,minmax(0,1fr));max-height:52vh}.fb-settings-head{align-items:stretch;flex-direction:column}.fb-theme-reset{align-self:flex-start}}
@media (max-width:480px){.fb-fleet-groups{grid-template-columns:1fr}.fb-command-bar{display:grid}.fb-annotate-toggle{margin-left:0;justify-self:start}.fb-theme-toolbar span{display:none}}
@media print{.feedback{display:none !important}}
"""

FEEDBACK_CSS_START = "<!--gbauto-feedback-css:start-->"
FEEDBACK_CSS_END = "<!--gbauto-feedback-css:end-->"
FEEDBACK_WIDGET_START = "<!--gbauto-feedback-widget:start-->"
FEEDBACK_WIDGET_END = "<!--gbauto-feedback-widget:end-->"


def feedback_widget_html(
    plan_slug: str,
    section_titles: Sequence[str],
    fn_url: Optional[str] = None,
    anon_key: Optional[str] = None,
) -> str:
    """Full-width command drawer with legacy comment + Agent Expert routes.

    Plain comments retain the feedback-capture contract. Expert questions use
    website-feedback-submit and land once in public.ops_website_feedback.
    """
    options = "".join(
        '<option value="%s">%s</option>' % (html_lib.escape(str(t)), html_lib.escape(str(t)))
        for t in section_titles
    )
    url = fn_url if fn_url is not None else resolve_feedback_fn_url()
    website_url = resolve_website_feedback_fn_url()
    key = anon_key if anon_key is not None else resolve_feedback_anon_key()
    if not feedback_anon_key_is_public(key):
        raise ValueError("feedback drawer accepts only a public Supabase anon key")
    expert_pills = "".join(
        '<button type="button" class="fb-expert-pill" data-fb-expert="%s" '
        'aria-pressed="false" title="Prefill /experts:%s:question">%s</button>'
        % (html_lib.escape(domain), html_lib.escape(domain), html_lib.escape(_expert_domain_label(domain)))
        for domain in registered_expert_domains()
    )
    fleet_groups = _fleet_command_groups_html()
    settings_panel = theme_settings_html()
    form = """
  <div class="feedback" data-fb-version="6" data-fb-open="false" data-fb-mode="expert"
    data-fb-annotating="false" data-fb-has-target="false"
    data-fb-annotation-source="lavish-axi" data-lavish-ui="gbauto-command-layer">
    <button type="button" class="fb-tab" aria-expanded="false" aria-controls="fb-drawer"
      title="Open command layer (Ctrl+K, Space, or legacy Ctrl+J)">
      Command<span class="fb-tab-key">Ctrl+K &middot; Space</span>
    </button>
    <aside id="fb-drawer" class="fb-drawer" role="dialog"
      aria-label="Document command layer" aria-hidden="true">
      <div class="fb-drawer-inner">
        <div class="fb-drawer-head">
          <div class="fb-head-copy">
            <span class="feedback-label">Document command layer</span>
            <span class="fb-shortcuts">Ctrl+K / Space to open &middot; Ctrl+I annotate &middot; Esc to close</span>
          </div>
          <button type="button" class="fb-close" aria-label="Close command layer">&#215;</button>
        </div>
        <div class="fb-auth-row" data-fb-auth-state="signed-out">
          <button type="button" class="fb-auth-signin" data-fb-auth-action="signin">Sign in with Google</button>
          <span class="fb-auth-identity" hidden></span>
          <button type="button" class="fb-auth-signout" data-fb-auth-action="signout" hidden>Sign out</button>
        </div>
        <div class="fb-command-bar">
        <div class="fb-command-tabs" role="tablist" aria-label="Command type">
          <button id="fb-tab-expert" type="button" class="fb-mode" data-fb-mode-button="expert" role="tab" aria-selected="true" aria-controls="fb-panel-expert">Ask expert</button>
          <button id="fb-tab-fleet" type="button" class="fb-mode" data-fb-mode-button="fleet" role="tab" aria-selected="false" aria-controls="fb-panel-fleet">Fleet skills</button>
          <button id="fb-tab-feedback" type="button" class="fb-mode" data-fb-mode-button="feedback" role="tab" aria-selected="false" aria-controls="fb-panel-feedback">Feedback</button>
          <button id="fb-tab-settings" type="button" class="fb-mode" data-fb-mode-button="settings" role="tab" aria-selected="false" aria-controls="fb-panel-settings">Settings</button>
        </div>
          <button type="button" class="fb-annotate-toggle" aria-pressed="false">Annotate page</button>
        </div>
        <form id="fb-form" autocomplete="off">
          <section id="fb-panel-expert" class="fb-command-panel" data-fb-panel="expert" role="tabpanel" aria-labelledby="fb-tab-expert">
          <div class="fb-expert-wrap">
            <div class="fb-expert-head"><span>Agent expert domains</span><span>Select to prefill</span></div>
            <div class="fb-expert-pills" role="group" aria-label="Agent expert domains">%s</div>
          </div>
          </section>
          <section id="fb-panel-fleet" class="fb-command-panel" data-fb-panel="fleet" role="tabpanel" aria-labelledby="fb-tab-fleet" hidden>
          <div class="fb-fleet-wrap">
            <div class="fb-expert-head"><span>Common fleet skills</span><span>Color-coded by command group</span></div>
            <div class="fb-fleet-groups">%s</div>
          </div>
          </section>
          <section id="fb-panel-feedback" class="fb-command-panel" data-fb-panel="feedback" role="tabpanel" aria-labelledby="fb-tab-feedback" hidden>
            <p class="fb-feedback-intro">Leave a plain document comment or annotate a precise page target.</p>
          </section>
          <div class="fb-target-wrap" aria-live="polite">
            <span class="fb-target-label">Target</span>
            <span class="fb-target-copy"></span>
            <button type="button" class="fb-target-clear" aria-label="Clear annotation target">&#215;</button>
          </div>
          <div class="fb-route">
            <label class="fb-row">
              <span>On</span>
              <select id="fb-section">
                <option value="">Whole document</option>
                %s
              </select>
            </label>
            <span id="fb-status" class="fb-status" aria-live="polite"></span>
          </div>
          <textarea id="fb-msg" rows="3" maxlength="4000"
            placeholder="Ask an expert or leave document feedback&#8230;"></textarea>
          <!-- honeypot: real users never see or fill this -->
          <input type="text" id="fb-hp" name="website_url" tabindex="-1"
            autocomplete="off" aria-hidden="true">
          <!-- populated by the Google-sign-in module script below when a
               Supabase Auth session exists; empty keeps submission anonymous -->
          <input type="hidden" id="fb-auth-email" value="">
          <input type="hidden" id="fb-auth-name" value="">
          <div class="fb-actions">
            <button type="submit" id="fb-submit">Send message</button>
            <p class="fb-hint">Ctrl+Enter sends &middot; one Edge Function write</p>
          </div>
        </form>
        %s
      </div>
    </aside>
  </div>""" % (expert_pills, fleet_groups, options, settings_panel)
    script = """
  <script>
    (function () {
      var FN = %s;
      var EXPERT_FN = %s;
      var KEY = %s;
      var SLUG = %s;
      var THEME_PRESETS = %s;
      var THEME_TOKEN_MAP = %s;
      var THEME_STORAGE_KEY = %s;
      var form = document.getElementById('fb-form');
      if (!form) return;
      var root = document.querySelector('.feedback');
      var drawer = document.getElementById('fb-drawer');
      var tab = root.querySelector('.fb-tab');
      var closeBtn = root.querySelector('.fb-close');
      var section = document.getElementById('fb-section');
      var msg = document.getElementById('fb-msg');
      var status = document.getElementById('fb-status');
      var submit = document.getElementById('fb-submit');
      var modeButtons = root.querySelectorAll('[data-fb-mode-button]');
      var modePanels = root.querySelectorAll('[data-fb-panel]');
      var expertButtons = root.querySelectorAll('[data-fb-expert]');
      var fleetButtons = root.querySelectorAll('[data-fb-command]');
      var themeButtons = root.querySelectorAll('[data-fb-theme-id]');
      var themeFilterButtons = root.querySelectorAll('[data-fb-theme-filter]');
      var themeReset = root.querySelector('[data-fb-theme-reset]');
      var themeStatus = root.querySelector('[data-fb-theme-status]');
      var annotateButton = root.querySelector('.fb-annotate-toggle');
      var targetCopy = root.querySelector('.fb-target-copy');
      var targetClear = root.querySelector('.fb-target-clear');
      var selectedExpert = null;
      var selectedFleetCommand = null;
      var annotationTarget = null;
      var annotationHover = null;
      var lastFocus = null;

      function themeById(themeId) {
        return THEME_PRESETS.find(function (preset) { return preset.id === themeId; }) || THEME_PRESETS[0];
      }
      function storedThemeId() {
        try { return window.localStorage.getItem(THEME_STORAGE_KEY) || 'gbauto'; }
        catch (error) { return 'gbauto'; }
      }
      function persistThemeId(themeId) {
        try { window.localStorage.setItem(THEME_STORAGE_KEY, themeId); }
        catch (error) { /* Device storage can be unavailable in private/file contexts. */ }
      }
      function applyTheme(themeId, persist) {
        var locked = document.body.classList.contains('report-theme-locked');
        var preset = themeById(locked ? 'gbauto' : themeId);
        // House documents use the renderer's exact surfaces and token roles.
        // Even the GB Auto preview preset changes those roles and opacities.
        if (!locked) {
          Object.keys(THEME_TOKEN_MAP).forEach(function (token) {
            THEME_TOKEN_MAP[token].forEach(function (variable) {
              document.documentElement.style.setProperty(variable, preset.tokens[token]);
            });
          });
          document.documentElement.style.setProperty('color-scheme', preset.mode);
        }
        document.body.setAttribute('data-gbauto-color-preset', preset.id);
        document.body.setAttribute('data-gbauto-color-mode', preset.mode);
        themeButtons.forEach(function (button) {
          var selected = button.getAttribute('data-fb-theme-id') === preset.id;
          button.disabled = locked;
          button.setAttribute('aria-pressed', selected ? 'true' : 'false');
          var check = button.querySelector('.fb-theme-check');
          if (check) check.textContent = selected ? 'Selected' : 'Select';
        });
        if (themeReset) themeReset.disabled = locked;
        if (themeStatus) {
          themeStatus.textContent = locked
            ? 'Official GBAuto document colors are fixed. Your saved preview theme is unchanged.'
            : preset.name + ' selected' + (preset.id === 'gbauto' ? '. Internal default restored.' : '. Saved on this device.');
        }
        if (!locked && persist !== false) persistThemeId(preset.id);
        return preset;
      }
      function setThemeFilter(mode) {
        themeFilterButtons.forEach(function (button) {
          button.setAttribute('aria-pressed', button.getAttribute('data-fb-theme-filter') === mode ? 'true' : 'false');
        });
        themeButtons.forEach(function (button) {
          button.hidden = mode !== 'all' && button.getAttribute('data-fb-theme-mode') !== mode;
        });
      }

      function isInteractive(target) {
        return !!(target && target.closest && target.closest('input,textarea,select,button,a[href],[contenteditable="true"],[role="button"]'));
      }
      function isAnnotationExcluded(target) {
        return !target || !target.closest || !!target.closest('.feedback,[data-lavish-ui],[data-lavish-action],script,style,link,meta');
      }
      function cssEscape(value) {
        if (window.CSS && CSS.escape) return CSS.escape(value);
        return String(value || '').replace(/[^a-zA-Z0-9_-]/g, function (char) { return String.fromCharCode(92) + char; });
      }
      // Reimplements the bounded, stable selector strategy used by lavish-axi
      // (kunchenguid/lavish-axi, MIT): prefer an id, otherwise keep at most five
      // ancestor segments and disambiguate same-tag siblings with nth-of-type.
      function targetSelector(element) {
        if (!element || !element.tagName) return '';
        var parts = [];
        var node = element;
        while (node && node.nodeType === 1 && parts.length < 5) {
          var part = node.tagName.toLowerCase();
          if (node.id) {
            part += '#' + cssEscape(node.id);
            parts.unshift(part);
            break;
          }
          var parent = node.parentElement;
          if (parent) {
            var same = Array.prototype.filter.call(parent.children, function (item) { return item.tagName === node.tagName; });
            if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(node) + 1) + ')';
          }
          parts.unshift(part);
          node = parent;
        }
        return parts.join(' > ');
      }
      function normalizedText(value, limit) {
        return String(value || '').replace(/\\s+/g, ' ').trim().slice(0, limit || 240);
      }
      function nearestSection(element) {
        var scope = element && element.closest ? element.closest('details.section,section,[data-section]') : null;
        if (!scope) return section.value || null;
        var heading = scope.querySelector('.section-title,h1,h2,h3,h4');
        return normalizedText((heading && heading.textContent) || scope.id || section.value, 160) || null;
      }
      function elementTarget(element) {
        return {
          type: 'element',
          selector: targetSelector(element),
          tag: String(element.tagName || '').toLowerCase(),
          text: normalizedText(element.innerText || element.textContent, 240),
          section: nearestSection(element)
        };
      }
      function textTarget(selection) {
        if (!selection || !selection.rangeCount) return null;
        var range = selection.getRangeAt(0);
        var text = normalizedText(selection.toString(), 1000);
        if (range.collapsed || !text) return null;
        var ancestor = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
        if (!ancestor || isAnnotationExcluded(ancestor) || isInteractive(ancestor)) return null;
        return {
          type: 'text-range',
          selector: targetSelector(ancestor),
          tag: 'text',
          text: text,
          section: nearestSection(ancestor),
          start_offset: Number(range.startOffset) || 0,
          end_offset: Number(range.endOffset) || 0
        };
      }
      function targetSummary(target) {
        if (!target) return '';
        var quote = target.text ? ' — “' + target.text.slice(0, 120) + (target.text.length > 120 ? '…' : '') + '”' : '';
        return (target.selector || target.tag || 'document') + quote;
      }
      function setTarget(target) {
        annotationTarget = target || null;
        root.setAttribute('data-fb-has-target', annotationTarget ? 'true' : 'false');
        targetCopy.textContent = targetSummary(annotationTarget);
        if (annotationTarget && annotationTarget.section) section.value = annotationTarget.section;
      }
      function clearAnnotationHover() {
        if (annotationHover) annotationHover.classList.remove('fb-annotation-hover');
        annotationHover = null;
      }
      function setAnnotationMode(enabled) {
        clearAnnotationHover();
        root.setAttribute('data-fb-annotating', enabled ? 'true' : 'false');
        annotateButton.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        annotateButton.textContent = enabled ? 'Click a target' : 'Annotate page';
        document.body.classList.toggle('fb-annotating', !!enabled);
        if (enabled) {
          lastFocus = null;
          setOpen(false);
        }
      }
      function setMode(mode) {
        if (['expert', 'fleet', 'feedback', 'settings'].indexOf(mode) === -1) mode = 'expert';
        if (mode !== 'expert') {
          var currentExpert = selectedExpert || expertFromMessage(msg.value);
          if (currentExpert) {
            var prefix = '/experts:' + currentExpert + ':question ';
            if (msg.value.indexOf(prefix) === 0) msg.value = msg.value.slice(prefix.length);
            setExpert(null, false);
          }
        }
        if (mode !== 'fleet' && selectedFleetCommand) {
          var fleetPrefix = selectedFleetCommand.prompt;
          if (msg.value.indexOf(fleetPrefix) === 0) msg.value = msg.value.slice(fleetPrefix.length);
          setFleetCommand(null, false);
        }
        root.setAttribute('data-fb-mode', mode);
        modeButtons.forEach(function (button) {
          button.setAttribute('aria-selected', button.getAttribute('data-fb-mode-button') === mode ? 'true' : 'false');
        });
        modePanels.forEach(function (panel) {
          panel.hidden = panel.getAttribute('data-fb-panel') !== mode;
        });
      }
      function setExpert(domain, prefill) {
        selectedExpert = domain || null;
        expertButtons.forEach(function (button) {
          button.setAttribute('aria-pressed', button.getAttribute('data-fb-expert') === selectedExpert ? 'true' : 'false');
        });
        if (selectedExpert && prefill) {
          setMode('expert');
          msg.value = '/experts:' + selectedExpert + ':question ';
          msg.focus();
          msg.setSelectionRange(msg.value.length, msg.value.length);
        }
      }
      function setFleetCommand(button, prefill) {
        selectedFleetCommand = button ? {
          command: button.getAttribute('data-fb-command'),
          group: button.getAttribute('data-fb-group'),
          skill: button.getAttribute('data-fb-skill'),
          label: normalizedText(button.textContent, 120),
          prompt: String(button.getAttribute('data-fb-prompt') || '').replace(/\\s+$/, '') + ' '
        } : null;
        fleetButtons.forEach(function (item) {
          item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
        });
        if (selectedFleetCommand && prefill) {
          setMode('fleet');
          msg.value = selectedFleetCommand.prompt;
          msg.focus();
          msg.setSelectionRange(msg.value.length, msg.value.length);
        }
      }
      function expertFromMessage(text) {
        var match = String(text || '').match(/^\\/experts:([a-z0-9-]+):question(?:\\s|$)/i);
        return match ? match[1].toLowerCase() : null;
      }

      function setOpen(open) {
        root.setAttribute('data-fb-open', open ? 'true' : 'false');
        tab.setAttribute('aria-expanded', open ? 'true' : 'false');
        drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
        if (open) {
          lastFocus = document.activeElement;
          window.setTimeout(function () {
            var selectedTab = root.querySelector('[data-fb-mode-button][aria-selected="true"]') || modeButtons[0];
            if (selectedTab) selectedTab.focus();
          }, 0);
        } else if (lastFocus && lastFocus !== document.body && lastFocus !== document.documentElement && lastFocus.focus) {
          lastFocus.focus();
        } else { tab.focus(); }
      }
      function toggle() { setOpen(root.getAttribute('data-fb-open') !== 'true'); }

      tab.addEventListener('click', toggle);
      closeBtn.addEventListener('click', function () { setOpen(false); });
      modeButtons.forEach(function (button) {
        button.addEventListener('click', function () { setMode(button.getAttribute('data-fb-mode-button')); });
        button.addEventListener('keydown', function (event) {
          var key = event.key || '';
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(key) === -1) return;
          event.preventDefault();
          var tabs = Array.prototype.slice.call(modeButtons);
          var current = tabs.indexOf(button);
          var next = key === 'Home' ? 0 : (key === 'End' ? tabs.length - 1 : (current + (key === 'ArrowRight' ? 1 : -1) + tabs.length) %% tabs.length);
          tabs[next].focus();
          setMode(tabs[next].getAttribute('data-fb-mode-button'));
        });
      });
      expertButtons.forEach(function (button) {
        button.addEventListener('click', function () { setExpert(button.getAttribute('data-fb-expert'), true); });
      });
      fleetButtons.forEach(function (button) {
        button.addEventListener('click', function () { setFleetCommand(button, true); });
      });
      themeButtons.forEach(function (button) {
        button.addEventListener('click', function () { applyTheme(button.getAttribute('data-fb-theme-id'), true); });
      });
      themeFilterButtons.forEach(function (button) {
        button.addEventListener('click', function () { setThemeFilter(button.getAttribute('data-fb-theme-filter')); });
      });
      if (themeReset) themeReset.addEventListener('click', function () { applyTheme('gbauto', true); });
      // applyTheme enforces the lock on initialization and every later action.
      applyTheme(storedThemeId(), false);
      annotateButton.addEventListener('click', function () {
        setAnnotationMode(root.getAttribute('data-fb-annotating') !== 'true');
      });
      targetClear.addEventListener('click', function () { setTarget(null); });
      msg.addEventListener('input', function () {
        var parsed = expertFromMessage(msg.value);
        if (selectedExpert && parsed !== selectedExpert) setExpert(null, false);
        else if (!selectedExpert && parsed) setExpert(parsed, false);
        if (selectedFleetCommand && msg.value.indexOf(selectedFleetCommand.prompt) !== 0) setFleetCommand(null, false);
      });
      // Ctrl/Cmd+K is primary; Ctrl/Cmd+J remains backward compatible. A bare
      // Space opens from document content but never steals typing or controls.
      document.addEventListener('keydown', function (e) {
        var key = e.key || '';
        if ((e.ctrlKey || e.metaKey) && key.toLowerCase() === 'i') { e.preventDefault(); setAnnotationMode(root.getAttribute('data-fb-annotating') !== 'true'); }
        else if ((e.ctrlKey || e.metaKey) && (key.toLowerCase() === 'k' || key.toLowerCase() === 'j')) { e.preventDefault(); setAnnotationMode(false); toggle(); }
        else if (key === ' ' && root.getAttribute('data-fb-open') !== 'true' && root.getAttribute('data-fb-annotating') !== 'true' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && !isInteractive(e.target)) { e.preventDefault(); setOpen(true); }
        else if (e.key === 'Escape' && root.getAttribute('data-fb-annotating') === 'true') { setAnnotationMode(false); }
        else if (e.key === 'Escape' && root.getAttribute('data-fb-open') === 'true') { setOpen(false); }
      });
      // Ctrl+Enter from the comment box submits.
      msg.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          if (form.requestSubmit) form.requestSubmit();
          else form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      });
      // Click outside the drawer (and not on the tab) closes it.
      document.addEventListener('click', function (e) {
        if (root.getAttribute('data-fb-annotating') === 'true') return;
        if (root.getAttribute('data-fb-open') !== 'true') return;
        if (drawer.contains(e.target) || tab.contains(e.target)) return;
        setOpen(false);
      });
      document.addEventListener('mouseover', function (e) {
        if (root.getAttribute('data-fb-annotating') !== 'true' || isAnnotationExcluded(e.target) || isInteractive(e.target)) return;
        clearAnnotationHover();
        annotationHover = e.target;
        annotationHover.classList.add('fb-annotation-hover');
      }, true);
      document.addEventListener('mouseout', function () {
        if (root.getAttribute('data-fb-annotating') === 'true') clearAnnotationHover();
      }, true);
      document.addEventListener('mouseup', function (e) {
        if (root.getAttribute('data-fb-annotating') !== 'true' || isAnnotationExcluded(e.target) || isInteractive(e.target)) return;
        var selected = textTarget(window.getSelection());
        if (!selected) return;
        setTarget(selected);
        setMode('feedback');
        setAnnotationMode(false);
        setOpen(true);
      }, true);
      document.addEventListener('click', function (e) {
        if (root.getAttribute('data-fb-annotating') !== 'true' || isAnnotationExcluded(e.target) || isInteractive(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        setTarget(elementTarget(e.target));
        setMode('feedback');
        setAnnotationMode(false);
        setOpen(true);
      }, true);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = (msg.value || '').trim();
        if (text.length < 2) { status.textContent = 'Please add a message.'; return; }
        if (!KEY) { status.textContent = 'Feedback is not configured for this page.'; return; }
        var expert = selectedExpert || expertFromMessage(text);
        var fleet = selectedFleetCommand;
        var structured = !!(expert || annotationTarget || fleet);
        var endpoint = structured ? EXPERT_FN : FN;
        var route = location.pathname + location.search + location.hash;
        // Populated by the Google-sign-in module script when a Supabase Auth
        // session exists; both stay empty for an anonymous submission, which
        // remains fully supported.
        var authEmailField = document.getElementById('fb-auth-email');
        var authNameField = document.getElementById('fb-auth-name');
        var reporterEmail = (authEmailField && authEmailField.value) || null;
        var reporterName = (authNameField && authNameField.value) || null;
        var payload = structured ? {
          message: text,
          feedback_type: expert ? 'expert_question' : (fleet ? 'fleet_skill_request' : 'document_annotation'),
          skill_name: fleet ? fleet.skill : null,
          page_url: location.href,
          route: route,
          user_agent: navigator.userAgent,
          website_url: document.getElementById('fb-hp').value,
          reporter_email: reporterEmail,
          reporter_name: reporterName,
          metadata: {
            expert_domain: expert,
            expert_route: expert ? '/experts:' + expert + ':question' : null,
            fleet_command: fleet ? fleet.command : null,
            fleet_group: fleet ? fleet.group : null,
            skill_name: fleet ? fleet.skill : null,
            command_label: fleet ? fleet.label : null,
            plan_slug: SLUG,
            section: section.value || null,
            source: 'netlify_document_command_layer',
            annotation_source: annotationTarget ? 'lavish-axi-inspired' : null,
            target: annotationTarget,
            identity: { email: reporterEmail, name: reporterName, signed_in: !!reporterEmail },
            page_state: {
              route: route,
              url: location.href,
              component: 'netlify_document_command_layer',
              viewport: { width: window.innerWidth, height: window.innerHeight }
            },
            navigation_history: [{ route: route, url: location.href, at: new Date().toISOString() }]
          }
        } : {
          message: text,
          plan_slug: SLUG,
          section: section.value || null,
          page_url: location.href,
          website_url: document.getElementById('fb-hp').value,
          reporter_email: reporterEmail,
          reporter_name: reporterName
        };
        submit.disabled = true;
        status.textContent = 'Sending\\u2026';
        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + KEY,
            'apikey': KEY,
          },
          body: JSON.stringify(payload),
        }).then(function (r) {
          if (r.ok) {
            form.reset();
            setExpert(null, false);
            setFleetCommand(null, false);
            setTarget(null);
            status.textContent = 'Thanks \\u2014 feedback received.';
            // Drawer closes shortly after a successful send (preferred UX).
            setTimeout(function () { setOpen(false); status.textContent = ''; }, 1200);
          } else { status.textContent = 'Could not send. Please try again.'; }
        }).catch(function () {
          status.textContent = 'Network error. Please try again.';
        }).finally(function () { submit.disabled = false; });
      });
    })();
  </script>""" % (
        _js(url),
        _js(website_url),
        _js(key),
        _js(plan_slug),
        theme_presets_json(),
        theme_token_map_json(),
        _js(THEME_STORAGE_KEY),
    )
    # Google sign-in via Supabase Auth. A separate `type="module"` block (the
    # main drawer script above stays a plain IIFE for broad compatibility) so
    # it can `import()` supabase-js lazily. It writes the signed-in identity
    # into the two hidden #fb-auth-email/#fb-auth-name fields the submit
    # handler above already reads; leaving them empty keeps the existing
    # anonymous-submission path working unchanged when no one signs in, or
    # when the Supabase project has not enabled the Google provider yet.
    auth_script = """
  <script type="module">
    (function () {
      var KEY = %s;
      var FN = %s;
      if (!KEY || !FN) return;
      var origin;
      try { origin = new URL(FN).origin; } catch (error) { return; }
      var root = document.querySelector('.feedback');
      if (!root) return;
      var authRow = root.querySelector('.fb-auth-row');
      var signinBtn = root.querySelector('[data-fb-auth-action="signin"]');
      var signoutBtn = root.querySelector('[data-fb-auth-action="signout"]');
      var identityEl = root.querySelector('.fb-auth-identity');
      var emailField = document.getElementById('fb-auth-email');
      var nameField = document.getElementById('fb-auth-name');

      function applyIdentity(user) {
        var email = (user && user.email) || '';
        var name = (user && user.user_metadata && user.user_metadata.full_name) || '';
        if (emailField) emailField.value = email;
        if (nameField) nameField.value = name;
        if (authRow) authRow.setAttribute('data-fb-auth-state', email ? 'signed-in' : 'signed-out');
        if (identityEl) {
          identityEl.hidden = !email;
          identityEl.textContent = email ? ('Signed in as ' + email) : '';
        }
        if (signinBtn) signinBtn.hidden = !!email;
        if (signoutBtn) signoutBtn.hidden = !email;
      }

      // Optional by design: the drawer keeps working anonymously through the
      // existing public-anon-key POST path whether or not the Supabase
      // project has the Google provider enabled yet. If the Auth client or
      // the provider is unreachable, the sign-in button just stays inert.
      import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').then(function (module) {
        var supabase = module.createClient(origin, KEY);
        supabase.auth.getSession().then(function (result) {
          var session = result && result.data && result.data.session;
          applyIdentity(session ? session.user : null);
        });
        supabase.auth.onAuthStateChange(function (_event, session) {
          applyIdentity(session ? session.user : null);
        });
        if (signinBtn) {
          signinBtn.addEventListener('click', function () {
            supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href } });
          });
        }
        if (signoutBtn) {
          signoutBtn.addEventListener('click', function () {
            supabase.auth.signOut().then(function () { applyIdentity(null); });
          });
        }
      }).catch(function () {
        // Supabase Auth not configured for this project yet -- anonymous
        // submission (the pre-existing behavior) is unaffected.
      });
    })();
  </script>""" % (
        _js(key),
        _js(url),
    )
    return form + script + auth_script


def inject_feedback_drawer(
    document: str,
    page_slug: str,
    section_titles: Sequence[str] = (),
    *,
    fn_url: Optional[str] = None,
    anon_key: Optional[str] = None,
) -> str:
    """Install the canonical command drawer in an arbitrary complete HTML page.

    Marker-delimited legacy drawers are replaced in place. A page already
    carrying the unmarked V6 drawer emitted by :func:`render_document` is left
    untouched, which prevents duplicate IDs when a canonical report becomes a
    bundle member. Unknown unmarked drawers fail closed instead of producing a
    second competing feedback implementation.
    """
    if not isinstance(document, str) or not document.strip():
        raise ValueError("feedback drawer injection requires a non-empty HTML document")
    if not re.search(r"</head\s*>", document, re.IGNORECASE):
        if re.search(r"<html\b[^>]*>", document, re.IGNORECASE):
            document = re.sub(
                r"(<html\b[^>]*>)",
                lambda match: match.group(1) + "<head></head>",
                document,
                count=1,
                flags=re.IGNORECASE,
            )
        else:
            document = "<!doctype html><html><head></head>" + document + "</html>"
    if not re.search(r"</body\s*>", document, re.IGNORECASE):
        body_shell = "</body>" if re.search(r"<body\b", document, re.IGNORECASE) else "<body></body>"
        if re.search(r"</html\s*>", document, re.IGNORECASE):
            document = re.sub(
                r"</html\s*>",
                lambda _match: body_shell + "</html>",
                document,
                count=1,
                flags=re.IGNORECASE,
            )
        else:
            document += body_shell + "</html>"

    has_css_markers = FEEDBACK_CSS_START in document or FEEDBACK_CSS_END in document
    has_widget_markers = FEEDBACK_WIDGET_START in document or FEEDBACK_WIDGET_END in document
    canonical_unmarked = (
        not has_css_markers
        and not has_widget_markers
        and 'data-fb-version="6"' in document
        and "feedback-capture" in document
        and "website-feedback-submit" in document
    )
    if canonical_unmarked:
        return document
    if ("class=\"feedback\"" in document or 'id="fb-drawer"' in document) and not has_widget_markers:
        raise ValueError("cannot replace an unmarked legacy feedback drawer safely")

    def replace_marked(text: str, start: str, end: str, replacement: str) -> str:
        pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.DOTALL)
        if bool(start in text) != bool(end in text):
            raise ValueError(f"incomplete feedback marker pair: {start} / {end}")
        return pattern.sub(lambda _match: replacement, text, count=1) if start in text else text

    css_block = (
        FEEDBACK_CSS_START
        + '\n<style id="gbauto-feedback-css">\n'
        + FEEDBACK_CSS
        + "\n"
        + THEME_OVERRIDE_CSS
        + "\n</style>\n"
        + FEEDBACK_CSS_END
    )
    widget_block = (
        FEEDBACK_WIDGET_START
        + "\n"
        + feedback_widget_html(
            page_slug,
            list(section_titles),
            fn_url=fn_url,
            anon_key=anon_key,
        )
        + "\n"
        + FEEDBACK_WIDGET_END
    )
    document = replace_marked(document, FEEDBACK_CSS_START, FEEDBACK_CSS_END, css_block)
    document = replace_marked(document, FEEDBACK_WIDGET_START, FEEDBACK_WIDGET_END, widget_block)
    if FEEDBACK_CSS_START not in document:
        document = re.sub(
            r"</head\s*>",
            lambda _match: css_block + "\n</head>",
            document,
            count=1,
            flags=re.IGNORECASE,
        )
    if FEEDBACK_WIDGET_START not in document:
        document = re.sub(
            r"</body\s*>",
            lambda _match: widget_block + "\n</body>",
            document,
            count=1,
            flags=re.IGNORECASE,
        )
    return document


# ---------------------------------------------------------------------------
# Base CSS — the approved template stylesheet with the ruling deltas applied:
#   * .brand-dot rules deleted (delta a); .brand-logo kept
#   * .section-count bumped to 14px (delta b)
#   * duplicated taxonomy pill-* block deduped
# ---------------------------------------------------------------------------
CANONICAL_GBAUTO_THEME_LOCK_CSS = """
body.report-theme-locked{
  --cream:#F3F1E7 !important;--cream-bg:#F3F1E7 !important;
  --cream-2:#E6E4D9 !important;--panel:#E6E4D9 !important;
  --line:#D6D4C8 !important;--stone:#D6D4C8 !important;
  --ink:#191919 !important;--muted:#5C5C5C !important;
  --text-mute:#8C8A84 !important;--text-muted-2:#5C5C5C !important;
  --accent:#D97757 !important;--terracotta:#D97757 !important;
  --terracotta-hover:#B75F43 !important;color-scheme:light !important;
}
"""

BASE_CSS = """
  :root{
    --terracotta:#D97757;--terracotta-hover:#B75F43;--ink:#191919;--cream-bg:#F3F1E7;--cream-2:#E6E4D9;
    --stone:#D6D4C8;--text-mute:#8C8A84;--text-muted-2:#5C5C5C;
    --status-green:#4F9D69;--status-amber:#C08A3E;--status-blue:#3D6EA8;--status-red:#B94A48;
    --font-sans:'Inter',sans-serif;--font-serif:'Newsreader',serif;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:var(--font-sans);background:var(--cream-bg);color:var(--ink);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;font-weight:300}
  body::selection{background:rgba(217,119,87,.24)}
  h1,h2,h3,h4{font-family:var(--font-serif);letter-spacing:0}
  p{color:var(--text-muted-2);line-height:1.72}
  a{color:var(--terracotta-hover);text-decoration:none;font-weight:600}
  a:hover{text-decoration:underline}
  code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;font-size:.92em;border:1px solid rgba(214,212,200,.86);border-radius:5px;background:rgba(230,228,217,.72);padding:1px 5px;color:var(--ink)}
  ul{margin:10px 0 0 22px;color:var(--text-muted-2);line-height:1.7}
  li{margin:8px 0}
  table{width:100%;border-collapse:collapse;font-size:14px;border:1px solid var(--stone);border-radius:8px;overflow:hidden}
  th,td{border-bottom:1px solid rgba(214,212,200,.78);padding:12px;text-align:left;vertical-align:top}
  th{background:rgba(230,228,217,.8);color:var(--text-mute);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
  tr:last-child td{border-bottom:0}

  .topbar{position:sticky;top:0;z-index:20;border-bottom:1px solid rgba(214,212,200,.7);background:rgba(243,241,231,.93);backdrop-filter:blur(12px)}
  .topbar-inner{max-width:1360px;margin:0 auto;padding:13px 24px;display:flex;align-items:center;justify-content:space-between;gap:18px}
  .brand-lockup{display:inline-flex;align-items:center;gap:9px;min-height:28px}
  .brand-logo{width:24px;height:24px;object-fit:contain;display:block}
  .brand-text{font-family:var(--font-serif);font-weight:500;text-transform:uppercase;letter-spacing:.08em;font-size:12px}
  .source-name{color:var(--text-muted-2);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

  header{max-width:1360px;margin:0 auto;padding:34px 24px 26px;display:grid;grid-template-columns:minmax(0,1fr) 370px;gap:28px;align-items:center}
  header.no-visual{grid-template-columns:minmax(0,1fr)}
  .header-copy{min-width:0}
  .eyebrow{color:var(--terracotta);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
  h1{max-width:920px;margin:10px 0 18px;font-size:clamp(32px,4.6vw,58px);font-weight:500;line-height:1.02}
  .subtitle{max-width:860px;color:var(--text-muted-2);font-size:16px}
  .taxonomy-pills{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 0;max-width:980px}
  .pill{display:inline-flex;align-items:center;gap:5px;min-height:23px;padding:2px 8px;border:1px solid var(--stone);border-radius:999px;line-height:1;background:rgba(255,255,255,.45)}
  .pill-label{color:var(--text-mute);font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
  .pill-value{color:var(--ink);font-size:11px;font-weight:600}
  .pill-tenant{background:rgba(217,119,87,.14);border-color:rgba(217,119,87,.35)}
  .pill-domain{background:rgba(61,110,168,.12);border-color:rgba(61,110,168,.28)}
  .pill-surface{background:rgba(255,255,255,.62);border-color:rgba(214,212,200,.92)}
  .pill-artifact{background:rgba(25,25,25,.08);border-color:rgba(25,25,25,.18)}
  .pill-type{background:rgba(79,157,105,.12);border-color:rgba(79,157,105,.28)}
  .pill-audience{background:rgba(192,138,62,.13);border-color:rgba(192,138,62,.3)}
  .pill-visual{background:rgba(217,119,87,.1);border-color:rgba(217,119,87,.24)}
  .pill-status{background:rgba(61,110,168,.11);border-color:rgba(61,110,168,.24)}
  .pill-skill{background:rgba(79,157,105,.1);border-color:rgba(79,157,105,.24)}
  .pill-entity{background:rgba(140,138,132,.12);border-color:rgba(140,138,132,.25)}
  .pill-need{background:rgba(217,119,87,.12);border-color:rgba(217,119,87,.3)}

  .layout{max-width:1360px;margin:0 auto;padding:22px 24px 56px;display:grid;grid-template-columns:300px minmax(0,1fr);gap:28px;align-items:start}
  .section-menu{position:sticky;top:64px;border:1px solid var(--stone);border-radius:8px;background:rgba(230,228,217,.62);backdrop-filter:blur(12px);padding:12px}
  .menu-title{margin:0 0 10px;color:var(--text-mute);font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
  .menu-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px}
  .menu-actions button,.section-menu nav button{min-height:34px;border:1px solid var(--stone);border-radius:6px;background:rgba(255,255,255,.46);color:rgba(25,25,25,.72);cursor:pointer;transition:border-color .18s ease,color .18s ease,background .18s ease;font-family:inherit;font-size:12px}
  .section-menu nav{display:grid;gap:5px}
  .section-menu nav button{width:100%;display:grid;grid-template-columns:30px 1fr;align-items:center;gap:8px;padding:6px 8px;text-align:left;line-height:1.25}
  .section-menu nav button span{color:var(--terracotta);font-size:10px;font-weight:700;letter-spacing:.08em}
  .menu-actions button:hover,.section-menu nav button:hover,.section-menu nav button.active{border-color:var(--terracotta);background:rgba(255,255,255,.72);color:var(--ink)}

  .sections{display:grid;gap:10px}
  details.section{border:1px solid var(--stone);border-radius:8px;background:rgba(255,255,255,.5);overflow:hidden}
  details.section[open]{background:rgba(255,255,255,.68)}
  details.section > summary{min-height:56px;display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:12px;align-items:center;padding:13px 16px;cursor:pointer;list-style:none}
  details.section > summary::-webkit-details-marker{display:none}
  .section-index{color:var(--terracotta);font-size:11px;font-weight:700;letter-spacing:.1em}
  .section-title{font-family:var(--font-serif);font-size:21px;font-weight:500;line-height:1.18}
  .section-count{color:var(--text-mute);font-size:14px;font-weight:600;white-space:nowrap}
  .section-body{border-top:1px solid rgba(214,212,200,.75);padding:20px 28px 26px 42px;color:var(--text-muted-2);font-size:16px;line-height:1.72}
  .section-body p{margin:0 0 14px}
  .section-body strong{color:var(--ink);font-weight:600}
  .section-body h3{margin:22px 0 8px;color:var(--ink);font-size:24px;font-weight:500}
  .section-body h4{margin:18px 0 8px;color:var(--ink);font-family:var(--font-sans);font-size:15px;font-weight:700;letter-spacing:0;text-transform:none}

  .phase-card{margin:14px 0;border:1px solid rgba(214,212,200,.86);border-radius:8px;background:rgba(230,228,217,.42);overflow:hidden}
  .phase-card > summary{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:14px;min-height:48px;padding:12px 16px;cursor:pointer;list-style:none}
  .phase-card > summary::-webkit-details-marker{display:none}
  .phase-card > summary strong{font-family:var(--font-sans);font-size:15px;font-weight:700;color:var(--ink);line-height:1.3}
  .phase-card .phase-inner{border-top:1px solid rgba(214,212,200,.75);padding:16px 18px 18px}
  .checklist{list-style:none;margin-left:0}
  .status{font-weight:800;color:var(--terracotta-hover)}
  .loop{margin-top:12px;border-left:3px solid var(--terracotta);background:rgba(217,119,87,.12);padding:9px 11px;border-radius:0 8px 8px 0;color:var(--terracotta-hover)}
  .grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
  .metric{border:1px solid var(--stone);border-radius:8px;background:rgba(255,255,255,.45);padding:14px}
  .metric strong{display:block;color:var(--ink);font-family:var(--font-serif);font-size:30px;font-weight:500;line-height:1}
  .metric span{display:block;margin-top:7px;color:var(--text-mute);font-size:11px;font-weight:600}
  .tag{display:inline-flex;min-width:64px;justify-content:center;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
  .existing{background:rgba(79,157,105,.12);color:var(--status-green)}
  .new{background:rgba(217,119,87,.14);color:var(--terracotta-hover)}
  .chip{display:inline-flex;align-items:center;font-size:11px;font-weight:600;padding:2px 9px;border-radius:999px;border:1px solid transparent}
  .chip-green{color:var(--status-green);background:rgba(79,157,105,.12);border-color:rgba(79,157,105,.25)}
  .chip-amber{color:var(--status-amber);background:rgba(192,138,62,.12);border-color:rgba(192,138,62,.25)}
  .chip-blue{color:var(--status-blue);background:rgba(61,110,168,.12);border-color:rgba(61,110,168,.25)}
  .chip-red{color:var(--status-red);background:rgba(185,74,72,.12);border-color:rgba(185,74,72,.25)}
  .flow{width:100%;min-height:230px;margin-top:12px;border:1px solid var(--stone);border-radius:8px;background:linear-gradient(180deg,rgba(255,255,255,.34),rgba(230,228,217,.68))}
  .flow text{font:600 13px Inter,sans-serif;fill:var(--ink)}
  .flow .muted{fill:var(--text-muted-2);font-weight:500;font-size:11px}
  .flow .box{fill:#f8f5ea;stroke:var(--stone);stroke-width:1.2;rx:8}
  .flow .hot{fill:rgba(217,119,87,.16);stroke:var(--terracotta)}
  .flow .line{stroke:var(--terracotta-hover);stroke-width:2;fill:none;marker-end:url(#arrow)}
  .header-visual{margin-top:0;min-height:230px}
  .bottom-meta-row{max-width:1360px;margin:0 auto 24px;padding:0 24px;display:grid;gap:10px}
  .metadata-card,.trace-card{border:1px solid var(--stone);border-radius:8px;background:rgba(255,255,255,.55);overflow:hidden}
  .metadata-card > summary,.trace-card > summary{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:52px;padding:13px 18px;cursor:pointer;list-style:none}
  .metadata-card > summary::-webkit-details-marker,.trace-card > summary::-webkit-details-marker{display:none}
  .metadata-card-title,.trace-title{font-family:var(--font-serif);font-size:20px;font-weight:500;color:var(--ink)}
  .metadata-card-action,.trace-action{color:var(--terracotta);font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
  .metadata-card-body,.trace-body{border-top:1px solid rgba(214,212,200,.75);padding:16px 18px}
  .metadata-list{display:grid;gap:10px;margin:0}
  .metadata-list dt{color:var(--text-mute);font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:lowercase}
  .metadata-list dd{margin:3px 0 0;color:var(--ink);font-size:13px;font-weight:500;line-height:1.45;overflow-wrap:anywhere}
  .trace-list{margin:0;color:var(--text-muted-2);font-size:12px;line-height:1.5}
  .trace-list li{margin:5px 0}
  .metadata-footer{max-width:1360px;margin:0 auto;padding:24px;border-top:1px solid var(--stone)}
  .metadata-grid{display:flex;flex-wrap:wrap;gap:28px}
  .metadata-grid span{display:block;color:var(--text-mute);font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:700}
  .metadata-grid strong{font-family:var(--font-serif);font-weight:500;font-size:15px}
  @media(max-width:820px){header,.layout,.grid-2,.grid-3{grid-template-columns:1fr}.section-menu{position:static}.section-body{padding:14px 16px}}
"""

FONT_LINKS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com" />\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n'
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700'
    "&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap\" rel=\"stylesheet\" />"
)

SECTION_NAV_SCRIPT = """
  <script>
    const sections = [...document.querySelectorAll('details.section')];
    const nav = document.getElementById('sectionNav');
    sections.forEach((section, i) => {
      const idx = section.querySelector('.section-index')?.textContent ?? String(i + 1).padStart(2, '0');
      const title = section.querySelector('.section-title')?.textContent ?? 'Section';
      section.id = section.id || `section-${idx}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.innerHTML = `<span>${idx}</span>${title}`;
      button.addEventListener('click', () => {
        section.open = true;
        section.scrollIntoView({behavior:'smooth', block:'start'});
      });
      nav.appendChild(button);
    });
    document.getElementById('openAll').addEventListener('click', () => sections.forEach(s => s.open = true));
    document.getElementById('closeAll').addEventListener('click', () => sections.forEach((s, i) => s.open = i === 0));
    const navButtons = [...nav.querySelectorAll('button')];
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const idx = sections.indexOf(visible.target);
      navButtons.forEach((b, i) => b.classList.toggle('active', i === idx));
    }, {rootMargin:'-18% 0px -68% 0px', threshold:[0.1,0.25,0.5]});
    sections.forEach(s => observer.observe(s));
  </script>"""


# ---------------------------------------------------------------------------
# Document assembly
# ---------------------------------------------------------------------------
def render_section_html(
    label: str,
    body_html: str,
    index: str,
    section_id: str = "",
    count_label: str = "",
    open_section: bool = False,
) -> str:
    words = word_count(body_html)
    count = format_section_count(count_label or derive_count_label(label), words)
    open_attr = " open" if open_section else ""
    sid = section_id or ("section-%s" % index)
    return (
        '<details class="section" id="%s"%s>'
        '<summary><span class="section-index">%s</span>'
        '<span class="section-title">%s</span>'
        '<span class="section-count">%s</span></summary>'
        '<div class="section-body">%s</div></details>'
    ) % (html_lib.escape(sid), open_attr, html_lib.escape(index), html_lib.escape(label), html_lib.escape(count), body_html)


def _taxonomy_pills_html(pills: Sequence[Dict[str, str]]) -> str:
    if not pills:
        return ""
    spans = []
    for pill in pills:
        kind = str(pill.get("kind") or "surface").strip().lower()
        label = str(pill.get("label") or "").strip()
        value = str(pill.get("value") or "").strip()
        if not value:
            continue
        spans.append(
            '<span class="pill pill-%s"><span class="pill-label">%s</span>'
            '<span class="pill-value">%s</span></span>'
            % (html_lib.escape(kind), html_lib.escape(label or kind.title()), html_lib.escape(value))
        )
    if not spans:
        return ""
    return '    <div class="taxonomy-pills" data-taxonomy-source="second-brain">%s</div>' % "".join(spans)


def _metadata_card_html(meta: Dict[str, str]) -> str:
    skip = {"source_name", "eyebrow", "generated", "source", "theme", "author", "brand_text"}
    rows = []
    for key, value in meta.items():
        if key in skip or value in (None, ""):
            continue
        rows.append(
            "<div><dt>%s</dt><dd>%s</dd></div>"
            % (html_lib.escape(str(key).replace("_", " ")), html_lib.escape(str(value)))
        )
    if not rows:
        return ""
    return (
        '<div class="bottom-meta-row"><details class="metadata-card">'
        '<summary><span class="metadata-card-title">Metadata</span>'
        '<span class="metadata-card-action">[expand]</span></summary>'
        '<div class="metadata-card-body"><dl class="metadata-list">%s</dl></div>'
        "</details></div>" % "".join(rows)
    )


def render_trace_card_html(trace: Optional[Dict[str, Any]]) -> str:
    rows = []
    for key, value in dict(trace or {}).items():
        if value in (None, ""):
            continue
        if isinstance(value, (list, tuple)):
            value = "; ".join(str(item) for item in value)
        rows.append(
            "<div><dt>%s</dt><dd>%s</dd></div>"
            % (html_lib.escape(str(key).replace("_", " ")), html_lib.escape(str(value)))
        )
    if not rows:
        return ""
    return (
        '<div class="bottom-meta-row"><details class="trace-card">'
        '<summary><span class="trace-title">Trace</span>'
        '<span class="trace-action">[expand]</span></summary>'
        '<div class="trace-body"><dl class="metadata-list">%s</dl></div>'
        "</details></div>" % "".join(rows)
    )

def _footer_html(meta: Dict[str, str]) -> str:
    cells = [
        ("Generated", str(meta.get("generated") or "")),
        ("Source", str(meta.get("source") or "gbauto-doc-template")),
        ("Theme", str(meta.get("theme") or "GBauto collapsible report")),
        ("Author", str(meta.get("author") or "GBAutomation")),
    ]
    grid = "".join(
        "<div><span>%s</span><strong>%s</strong></div>" % (html_lib.escape(k), html_lib.escape(v))
        for k, v in cells
        if v
    )
    return '<footer class="metadata-footer"><div class="metadata-grid">%s</div></footer>' % grid


def render_document(
    title: str,
    sections: List[Dict[str, str]],
    hyperframes: Optional[Sequence[Union[str, Path]]] = None,
    meta: Optional[Dict[str, str]] = None,
    include_feedback_widget: bool = False,
    subtitle: str = "",
    eyebrow: str = "",
    taxonomy_pills: Optional[Sequence[Dict[str, str]]] = None,
    header_visual_svg: str = "",
    plan_slug: str = "",
    feedback_fn_url: Optional[str] = None,
    feedback_anon_key: Optional[str] = None,
    extra_css: str = "",
    ai_library_data: Optional[Dict[str, Any]] = None,
    trace: Optional[Dict[str, Any]] = None,
    renderer_id: str = DEFAULT_RENDERER_ID,
    renderer_version: str = DEFAULT_RENDERER_VERSION,
    theme_lock: bool = True,
    review_controls_html: str = "",
) -> str:
    """Render a complete canonical GBauto document.

    ``sections``: list of dicts with keys ``label`` (section title),
    ``count_label`` (short descriptor left of the word count; derived from the
    label when empty) and ``html`` (section body). Optional per-section keys:
    ``id``, ``open`` (first section defaults to open).

    ``hyperframes``: up to 3 inline-SVG strings or svg/raster paths rendered
    ABOVE the first section. ``include_feedback_widget`` appends the
    feedback-capture comment widget (public anon key only — no secrets).
    ``theme_lock`` preserves the official house CSS, including glass surfaces,
    regardless of viewer presets. Set False only for explicitly requested theme
    previews whose surfaces support the complete preset token system.
    ``review_controls_html`` is trusted renderer-owned response UI placed after
    the report body and immediately before Metadata. It stays visible when
    readers close all content sections; callers own its authorization contract.
    """
    meta = dict(meta or {})
    contract = renderer_contract(renderer_id, renderer_version)
    for key, value in contract.items():
        meta.setdefault(key, value)
    report_id = str(meta.get("report_id") or "")
    section_parts = []
    for idx, section in enumerate(sections):
        section_parts.append(
            render_section_html(
                label=str(section.get("label") or "Section %d" % (idx + 1)),
                body_html=str(section.get("html") or ""),
                index="%02d" % (idx + 1),
                section_id=str(section.get("id") or ""),
                count_label=str(section.get("count_label") or ""),
                open_section=bool(section.get("open", idx == 0)),
            )
        )
    strip = hyperframes_strip_html(hyperframes or [])
    ai_library_block = render_ai_library_modal_html(ai_library_data) if ai_library_data else ""
    contract_css = "@media print{.topbar,.section-menu,.menu-actions{display:none!important}body{background:#fff;color:#191919}}@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}"
    css = (
        BASE_CSS
        + HYPERFRAMES_CSS
        + contract_css
        + (AI_LIBRARY_CSS if ai_library_data else "")
        + (FEEDBACK_CSS if include_feedback_widget else "")
        + (extra_css or "")
        + (THEME_OVERRIDE_CSS if include_feedback_widget else "")
        + (CANONICAL_GBAUTO_THEME_LOCK_CSS if theme_lock else "")
    )
    header_classes = "" if header_visual_svg else ' class="no-visual"'
    header = (
        "<header%s>\n<div class=\"header-copy\">\n"
        '<div class="eyebrow">%s</div>\n<h1>%s</h1>\n'
        % (header_classes, html_lib.escape(eyebrow or "GBauto Document"), html_lib.escape(title))
    )
    if subtitle:
        header += '<p class="subtitle">%s</p>\n' % html_lib.escape(subtitle)
    pills = list(taxonomy_pills or []) or [{"kind": "shell", "label": "Shell", "value": SHELL_ID}]
    header += _taxonomy_pills_html(pills)
    header += "</div>\n"
    if header_visual_svg:
        header += header_visual_svg + "\n"
    header += "</header>"
    feedback = ""
    if include_feedback_widget:
        feedback = feedback_widget_html(
            plan_slug or re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-"),
            [str(s.get("label") or "") for s in sections],
            fn_url=feedback_fn_url,
            anon_key=feedback_anon_key,
        )
    return (
        "<!doctype html>\n"
        '<html lang="en">\n<head>\n'
        '<meta charset="utf-8" />\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
        "<title>%s</title>\n%s\n%s\n<style>%s</style>\n</head>\n<body %s>\n"
        "%s\n%s\n"
        '<main class="layout">\n'
        '<aside class="section-menu">\n<p class="menu-title">Sections</p>\n'
        '<div class="menu-actions">\n<button id="openAll" type="button">Open All</button>\n'
        '<button id="closeAll" type="button">Close All</button>\n</div>\n'
        '<nav id="sectionNav" aria-label="Document sections"></nav>\n</aside>\n'
        '<div class="sections">%s%s</div>\n</main>\n'
        "%s%s\n%s\n%s\n%s\n%s\n%s\n%s\n</body>\n</html>\n"
    ) % (
        html_lib.escape(title),
        contract_meta_tags(report_id, renderer_id, renderer_version),
        FONT_LINKS,
        css,
        contract_body_attrs(renderer_id, renderer_version) + (' class="report-theme-locked"' if theme_lock else ""),
        topbar_html(str(meta.get("source_name") or ""), str(meta.get("brand_text") or "GBauto")),
        header,
        strip,
        "\n".join(section_parts),
        ('<div class="bottom-meta-row document-review">%s</div>\n' % review_controls_html) if review_controls_html else "",
        _metadata_card_html(meta),
        render_trace_card_html(trace),
        feedback,
        ai_library_block,
        _footer_html(meta),
        SECTION_NAV_SCRIPT,
        AI_LIBRARY_SCRIPT if ai_library_data else "",
    )
