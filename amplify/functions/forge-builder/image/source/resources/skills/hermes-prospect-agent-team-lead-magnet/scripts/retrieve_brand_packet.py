#!/usr/bin/env python3
"""Retrieve a public official-site brand packet with hash-bound image assets.

The crawler is deliberately bounded: one HTML document, same-origin linked CSS,
same-origin JavaScript needed by SPA sites, one manifest, and a small diverse
image set. It never authenticates, executes JavaScript, or follows private hosts.
"""
from __future__ import annotations

import argparse
import hashlib
import ipaddress
import json
import os
import re
import socket
import sys
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urljoin, urlparse


UA = "gbauto-public-brand-retriever/1.0 (+https://gbautomation.xyz)"
HEX_RE = re.compile(r"(?i)#[0-9a-f]{3,8}\b")
ASSET_RE = re.compile(
    r"(?i)(?:(?:https?://[A-Za-z0-9._~:/?#@!&()*+,;=%-]+|/[A-Za-z0-9_./-]+)\."
    r"(?:svg|png|jpe?g|webp|avif|gif))"
)
FONT_ASSET_RE = re.compile(
    r"(?i)(?:(?:https?://[A-Za-z0-9._~:/?#@!&()*+,;=%-]+|/[A-Za-z0-9_./-]+)\."
    r"(?:woff2?|ttf|otf))"
)
ALLOWED_IMAGE_TYPES = {
    "image/svg+xml",
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/avif",
    "image/gif",
}


def stable_json(value: Any) -> str:
    return json.dumps(value, indent=2, sort_keys=True, ensure_ascii=True) + "\n"


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def utc_now() -> str:
    return os.environ.get("GBAUTO_BRAND_RETRIEVED_AT") or datetime.now(
        timezone.utc
    ).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def normalize_hex(value: str) -> str | None:
    value = value.upper()
    if len(value) == 4:
        value = "#" + "".join(char * 2 for char in value[1:])
    if len(value) == 5:
        value = "#" + "".join(char * 2 for char in value[1:4])
    if len(value) == 9:
        value = value[:7]
    return value if re.fullmatch(r"#[0-9A-F]{6}", value) else None


def validate_public_url(url: str, *, resolve_dns: bool = True) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError(f"not a public http(s) URL: {url}")
    host = parsed.hostname.lower().rstrip(".")
    if host in {"localhost", "localhost.localdomain"} or host.endswith(".local"):
        raise ValueError(f"private host is not allowed: {host}")
    try:
        literal = ipaddress.ip_address(host)
    except ValueError:
        literal = None
    if literal is not None and not literal.is_global:
        raise ValueError(f"private address is not allowed: {host}")
    if resolve_dns:
        addresses = {
            row[4][0] for row in socket.getaddrinfo(host, parsed.port or 443, type=socket.SOCK_STREAM)
        }
        blocked = [address for address in addresses if not ipaddress.ip_address(address).is_global]
        if blocked:
            raise ValueError(f"host resolves to a non-public address: {host}")
    return url


class SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[no-untyped-def]
        validate_public_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class DocumentParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[dict[str, str]] = []
        self.scripts: list[str] = []
        self.images: list[dict[str, str]] = []
        self.meta: dict[str, str] = {}
        self.inline_styles: list[str] = []
        self._inside_style = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        row = {key.lower(): value or "" for key, value in attrs}
        if row.get("style"):
            self.inline_styles.append(row["style"])
        if tag.lower() == "link" and row.get("href"):
            self.links.append(row)
        elif tag.lower() == "script" and row.get("src"):
            self.scripts.append(row["src"])
        elif tag.lower() in {"img", "source"} and row.get("src"):
            self.images.append(row)
        elif tag.lower() == "meta":
            key = (row.get("property") or row.get("name") or "").lower()
            if key and row.get("content"):
                self.meta[key] = row["content"]
        elif tag.lower() == "style":
            self._inside_style = True

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "style":
            self._inside_style = False

    def handle_data(self, data: str) -> None:
        if self._inside_style:
            self.inline_styles.append(data)


def same_origin(url: str, origin: str) -> bool:
    try:
        target = urlparse(url)
        base = urlparse(origin)
        return target.scheme == base.scheme and target.netloc == base.netloc
    except ValueError:
        return False


def absolute_url(base_url: str, candidate: str) -> str:
    """Resolve one scraped candidate, dropping malformed bundle literals."""
    try:
        return urljoin(base_url, candidate)
    except ValueError:
        return ""


def url_path(url: str) -> str:
    try:
        return urlparse(url).path
    except ValueError:
        return ""


def fetch_bytes(url: str, max_bytes: int) -> tuple[bytes, str, str]:
    validate_public_url(url)
    opener = urllib.request.build_opener(SafeRedirectHandler())
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with opener.open(request, timeout=35) as response:
        final_url = response.geturl()
        validate_public_url(final_url)
        content_type = response.headers.get_content_type().lower()
        data = response.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise ValueError(f"resource exceeded {max_bytes} bytes: {final_url}")
    return data, final_url, content_type


def color_observations(sources: dict[str, str]) -> list[dict[str, Any]]:
    weights = {"html": 10, "inline_css": 8, "css": 5, "js": 1, "brand_context": 30}
    score: Counter[str] = Counter()
    occurrences: Counter[str] = Counter()
    seen_in: dict[str, set[str]] = defaultdict(set)
    expanded = dict(sources)
    js = sources.get("js", "")
    contexts = re.findall(r"(?is)colors\s*:\s*\{\s*brand\s*:\s*\{.{0,1400}?\}\s*[,}]", js)
    contexts += re.findall(r"(?is).{0,180}(?:landing|logo|hero).{0,420}", js)
    expanded["brand_context"] = "\n".join(contexts)
    for source, text in expanded.items():
        for match in HEX_RE.findall(text):
            color = normalize_hex(match)
            if not color:
                continue
            occurrences[color] += 1
            score[color] += weights.get(source, 1)
            seen_in[color].add(source)
    return [
        {
            "hex": color,
            "score": score[color],
            "occurrences": occurrences[color],
            "sources": sorted(seen_in[color]),
        }
        for color in sorted(score, key=lambda value: (-score[value], -occurrences[value], value))[:64]
    ]


def typography_observations(css: str, js: str, base_url: str) -> dict[str, list[str]]:
    raw_stacks = set(
        value.strip()
        for value in re.findall(
            r"(?is)(?:font-family\s*:|fontFamily\s*[:=]|[A-Za-z_$][\w$]*\s*=)\s*"
            r"([\"'][^\n;]{2,150}?(?:sans-serif|serif)[\"'])",
            css + "\n" + js,
        )
    )
    raw_stacks.update(
        value.strip() for value in re.findall(r"(?i)font-family\s*:\s*([^;}]+)", css) if value.strip()
    )
    stacks: set[str] = set()
    for value in raw_stacks:
        cleaned = value.replace("\\'", "'").replace('\\"', '"').strip()
        if len(cleaned) >= 2 and cleaned[0] == cleaned[-1] and cleaned[0] in "\"'":
            cleaned = cleaned[1:-1].strip()
        stacks.add(cleaned)
    families = {
        stack.split(",", 1)[0].strip(" \"'") for stack in stacks if stack.strip(" \"'")
    }
    families.update(re.findall(r"(?i)/fonts/([A-Za-z][A-Za-z0-9_-]+?)(?:-Light|-Regular)?\.", js))
    if "Teodor" in js:
        families.add("Teodor")
        stacks.add("'Teodor', Georgia, Garamond, serif")
    if "Inter" in css or "Inter" in js:
        families.add("Inter")
    font_urls = sorted(
        {
            absolute_url(base_url, match)
            for match in FONT_ASSET_RE.findall(css + "\n" + js)
            if absolute_url(base_url, match)
            and same_origin(absolute_url(base_url, match), base_url)
        }
    )
    return {
        "families": sorted(families),
        "stacks": sorted(stacks),
        "font_asset_urls": font_urls,
    }


def asset_kind(url: str) -> str:
    name = urlparse(url).path.lower()
    if "logo" in name and "privy" not in name:
        return "logo"
    if "screenshot" in name or "iphone" in name:
        return "screenshot"
    if any(term in name for term in ("hero", "background", "blob", "wave", "vertical")):
        return "hero"
    if any(term in name for term in ("favicon", "apple-touch", "android-chrome", "icon")):
        return "icon"
    return "other"


def asset_score(url: str, source: str) -> int:
    path = urlparse(url).path.lower()
    score = {"meta": 110, "html": 80, "manifest": 55, "css": 45, "js": 40}.get(source, 20)
    score += {"logo": 80, "screenshot": 65, "hero": 55, "icon": 5, "other": 10}[asset_kind(url)]
    if "large" in path and "logo" in path:
        score += 35
    if "mobile" in path:
        score -= 10
    if path.endswith(".svg"):
        score += 12
    if "landing_video_background" in path:
        score += 50
    if path.endswith(".gif"):
        score -= 25
    return score


def diverse_assets(candidates: list[dict[str, str]], maximum: int) -> list[dict[str, str]]:
    unique: dict[str, dict[str, str]] = {}
    for row in candidates:
        if row["url"] not in unique or asset_score(row["url"], row["source"]) > asset_score(
            unique[row["url"]]["url"], unique[row["url"]]["source"]
        ):
            unique[row["url"]] = row
    ordered = sorted(unique.values(), key=lambda row: -asset_score(row["url"], row["source"]))
    chosen: list[dict[str, str]] = []
    for kind in ("logo", "hero", "screenshot", "other", "icon"):
        match = next((row for row in ordered if asset_kind(row["url"]) == kind), None)
        if match and match not in chosen:
            chosen.append(match)
        if len(chosen) >= maximum:
            break
    return chosen[:maximum]


def safe_asset_suffix(url: str, content_type: str) -> str:
    suffix = Path(urlparse(url).path).suffix.lower()
    if suffix in {".svg", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"}:
        return suffix
    return {"image/svg+xml": ".svg", "image/png": ".png", "image/jpeg": ".jpg"}.get(
        content_type, ".bin"
    )


def validate_svg(data: bytes) -> None:
    text = data.decode("utf-8", errors="ignore").lower()
    forbidden = ("<script", "<foreignobject", "javascript:", " onload=", " onerror=")
    if any(marker in text for marker in forbidden):
        raise ValueError("SVG contains active content and was rejected")


def build_packet(
    *,
    official_url: str,
    company_name: str,
    output_path: Path,
    max_images: int = 3,
    fetch: Callable[[str, int], tuple[bytes, str, str]] = fetch_bytes,
) -> dict[str, Any]:
    html_bytes, resolved_url, html_type = fetch(official_url, 1_500_000)
    if html_type not in {"text/html", "application/xhtml+xml"}:
        raise ValueError(f"official URL did not return HTML: {html_type}")
    html_text = html_bytes.decode("utf-8", errors="replace")
    parser = DocumentParser()
    parser.feed(html_text)
    stylesheets = sorted(
        {
            absolute_url(resolved_url, row["href"])
            for row in parser.links
            if "stylesheet" in row.get("rel", "").lower()
            and absolute_url(resolved_url, row["href"])
            and same_origin(absolute_url(resolved_url, row["href"]), resolved_url)
        }
    )[:8]
    scripts = sorted(
        {
            absolute_url(resolved_url, src)
            for src in parser.scripts
            if absolute_url(resolved_url, src)
            and same_origin(absolute_url(resolved_url, src), resolved_url)
        }
    )[:4]
    failures: list[str] = []
    css_parts = list(parser.inline_styles)
    for url in stylesheets:
        try:
            data, _, _ = fetch(url, 1_500_000)
            css_parts.append(data.decode("utf-8", errors="replace"))
        except Exception as exc:  # bounded partial evidence is still useful
            failures.append(f"stylesheet:{urlparse(url).path}:{type(exc).__name__}")
    js_parts: list[str] = []
    for url in scripts:
        try:
            data, _, _ = fetch(url, 4_500_000)
            js_parts.append(data.decode("utf-8", errors="replace"))
        except Exception as exc:
            failures.append(f"script:{urlparse(url).path}:{type(exc).__name__}")
    css = "\n".join(css_parts)
    js = "\n".join(js_parts)

    candidates: list[dict[str, str]] = []
    for key in ("og:image", "twitter:image", "twitter:image:src"):
        if parser.meta.get(key):
            candidates.append({"url": absolute_url(resolved_url, parser.meta[key]), "source": "meta"})
    candidates.extend(
        {"url": absolute_url(resolved_url, row["src"]), "source": "html"} for row in parser.images
    )
    for source, text in (("css", css), ("js", js)):
        candidates.extend(
            {"url": absolute_url(resolved_url, match), "source": source}
            for match in ASSET_RE.findall(text)
            if absolute_url(resolved_url, match)
        )
    manifest_links = [
        absolute_url(resolved_url, row["href"])
        for row in parser.links
        if "manifest" in row.get("rel", "").lower()
    ][:1]
    for manifest_url in manifest_links:
        if not same_origin(manifest_url, resolved_url):
            continue
        try:
            manifest_bytes, _, _ = fetch(manifest_url, 250_000)
            manifest = json.loads(manifest_bytes)
            candidates.extend(
                {
                    "url": absolute_url(resolved_url, str(icon.get("src") or "")),
                    "source": "manifest",
                }
                for icon in manifest.get("icons", [])
                if icon.get("src")
            )
        except Exception as exc:
            failures.append(f"manifest:{urlparse(manifest_url).path}:{type(exc).__name__}")
    candidates = [
        row
        for row in candidates
        if row.get("url") and same_origin(row["url"], resolved_url) and url_path(row["url"])
    ]

    output_path = output_path.resolve()
    asset_dir = output_path.parent / "assets" / "official"
    asset_dir.mkdir(parents=True, exist_ok=True)
    assets: list[dict[str, Any]] = []
    company_slug = re.sub(r"[^a-z0-9]+", "-", company_name.lower()).strip("-") or "company"
    for row in diverse_assets(candidates, max_images):
        kind = asset_kind(row["url"])
        try:
            data, final_url, content_type = fetch(row["url"], 2_500_000)
            if content_type not in ALLOWED_IMAGE_TYPES:
                raise ValueError(f"unsupported image content type: {content_type}")
            if content_type == "image/svg+xml":
                validate_svg(data)
            suffix = safe_asset_suffix(final_url, content_type)
            filename = f"{company_slug}-{kind}{suffix}"
            target = asset_dir / filename
            target.write_bytes(data)
            assets.append(
                {
                    "asset_id": f"{company_slug}-{kind}",
                    "kind": kind,
                    "source_url": final_url,
                    "discovered_via": row["source"],
                    "local_path": target.relative_to(output_path.parent).as_posix(),
                    "content_type": content_type,
                    "bytes": len(data),
                    "sha256": sha256_bytes(data),
                    "rights_posture": "official_site_identification_reference_only",
                    "usage_note": (
                        "Company-owned mark or imagery used for identification in an unaffiliated "
                        "draft preview; verify permission before prospect-facing distribution."
                    ),
                }
            )
        except Exception as exc:
            failures.append(f"asset:{urlparse(row['url']).path}:{type(exc).__name__}")

    palette = color_observations(
        {
            "html": html_text,
            "inline_css": "\n".join(parser.inline_styles),
            "css": css,
            "js": js,
        }
    )
    packet = {
        "schema_version": "prospect-brand-packet.v1",
        "company_name": company_name,
        "requested_url": official_url,
        "resolved_url": resolved_url,
        "retrieved_at_utc": utc_now(),
        "source_scope": "public_official_site_only",
        "typography": typography_observations(css, js, resolved_url),
        "palette": {"observations": palette},
        "assets": assets,
        "evidence": {
            "document_sha256": sha256_bytes(html_bytes),
            "document_content_type": html_type,
            "stylesheet_urls": stylesheets,
            "script_urls": scripts,
            "manifest_urls": manifest_links,
            "asset_candidates": len({row["url"] for row in candidates}),
            "robots_policy": "bounded public assets only; no authentication or browser execution",
        },
        "validation": {
            "status": "ok" if assets and palette and not failures else "partial" if assets or palette else "failed",
            "failures": failures,
        },
        "tags": [
            "data/schema-contract",
            "data/lineage-manifest",
            "data/validation-rule",
            "storage/local-filesystem",
            "format/manifest",
            "output/export",
        ],
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(stable_json(packet), encoding="utf-8", newline="\n")
    return packet


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--official-url", required=True)
    parser.add_argument("--company", required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--max-images", type=int, default=3, choices=range(1, 7))
    args = parser.parse_args()
    try:
        packet = build_packet(
            official_url=args.official_url,
            company_name=args.company,
            output_path=args.out,
            max_images=args.max_images,
        )
    except (OSError, ValueError, urllib.error.URLError, json.JSONDecodeError) as exc:
        print(stable_json({"ok": False, "error": str(exc)}), end="")
        return 2
    print(
        stable_json(
            {
                "ok": packet["validation"]["status"] != "failed",
                "status": packet["validation"]["status"],
                "out": str(args.out.resolve()),
                "colors": len(packet["palette"]["observations"]),
                "fonts": packet["typography"]["families"],
                "assets": [asset["local_path"] for asset in packet["assets"]],
            }
        ),
        end="",
    )
    return 0 if packet["validation"]["status"] != "failed" else 1


if __name__ == "__main__":
    sys.exit(main())
