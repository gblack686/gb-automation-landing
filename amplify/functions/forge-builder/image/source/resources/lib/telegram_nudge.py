"""
resources/lib/telegram_nudge.py — Shared Telegram notification helper.

USAGE (any hook area)
---------------------
    from resources.lib.telegram_nudge import send_nudge

    send_nudge(
        area="wiki",
        subject="New ADR added: secrets-via-boto3",
        lines=["3 candidates queued", "No entity notes reference this ADR"],
        commit="abc1234",
        severity="high",   # "high" | "medium" | "low"
    )

DESIGN NOTES (for R3 sister specs)
------------------------------------
- send_nudge() is a fire-and-forget helper — it never raises. Failures are
  logged to stderr so the caller (hook / cron) is never blocked.
- Secrets are read via resources.lib.secrets.get_secret("telegram/bot").
  The secret must be a JSON object: {"bot_token": "...", "chat_id": "..."}
- By default only "high" severity nudges fire from hook context. The cron
  may call with any severity.
- Nudge format is plain-text Markdown compatible with Telegram's parse_mode=Markdown.
- This module is INTENTIONALLY import-light: stdlib + boto3 (lazy). No httpx/requests
  dependency — uses urllib.request so it works in minimal environments.

SISTER SPEC INTEGRATION GUIDE
------------------------------
Each hook area calls send_nudge() with its own area slug. The area name
appears in the Telegram message header so Greg can triage at a glance.
Threshold filtering (when to fire) is the caller's responsibility — this
module always sends when called.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Literal

# Severity type alias — used by callers to self-describe urgency
Severity = Literal["high", "medium", "low"]

_TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"


def _get_credentials() -> tuple[str, str] | None:
    """Return (bot_token, chat_id) or None if secrets are unavailable."""
    try:
        from resources.lib.secrets import get_secret  # type: ignore[import]
        bot_token = get_secret("telegram/bot", "bot_token")
        chat_id = get_secret("telegram/bot", "chat_id")
        return bot_token, chat_id
    except Exception as exc:
        print(f"[telegram_nudge] credentials unavailable: {exc}", file=sys.stderr)
        return None


def _build_message(
    area: str,
    subject: str,
    lines: list[str],
    commit: str,
    severity: Severity,
) -> str:
    """Build the Telegram message text."""
    icon = {"high": "🔴", "medium": "🟡", "low": "🔵"}.get(severity, "⚪")
    sha = commit[:7] if commit else "manual"

    parts = [
        f"{icon} *[{area}]* {subject}",
        f"`commit {sha}`",
    ]
    if lines:
        parts.append("")
        for line in lines:
            parts.append(f"• {line}")

    # Footer hint
    parts.append("")
    parts.append("_Next cron run picks up the queue._")

    return "\n".join(parts)


def send_nudge(
    area: str,
    subject: str,
    lines: list[str] | None = None,
    commit: str = "",
    severity: Severity = "high",
    dry_run: bool = False,
) -> bool:
    """Send a Telegram nudge.

    Args:
        area:     Hook area slug ("wiki", "skill-registry", "linear-sync", …).
        subject:  One-line summary shown in the message header.
        lines:    Additional bullet-point lines (optional).
        commit:   Git SHA for attribution (first 7 chars shown).
        severity: "high" | "medium" | "low" — shown as coloured dot.
        dry_run:  If True, print the message to stdout instead of sending.

    Returns:
        True if the message was sent (or dry_run=True), False on error.

    Notes:
        - Never raises. All errors are printed to stderr.
        - Uses urllib (stdlib) — no requests/httpx dependency.
    """
    if lines is None:
        lines = []

    text = _build_message(area, subject, lines, commit, severity)

    if dry_run:
        print(f"[telegram_nudge DRY RUN]\n{text}")
        return True

    creds = _get_credentials()
    if creds is None:
        return False

    bot_token, chat_id = creds
    url = _TELEGRAM_API.format(token=bot_token)

    # Telegram's Markdown parser is fragile: underscores in identifiers like
    # `automation/tac-build`, parens inside URLs, and `*` in error tracebacks
    # all return HTTP 400 ("can't parse entities"). Cron lifecycle nudges
    # carry plenty of these (issue IDs, PR URLs, GitHub error messages), so
    # we send them as plain text by default. Callers that want formatting
    # can wrap their own message with explicit MarkdownV2 escaping.
    payload = {
        "chat_id": chat_id,
        "text": text,
        "disable_web_page_preview": True,
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read()
            result = json.loads(body)
            if not result.get("ok"):
                print(f"[telegram_nudge] API returned not-ok: {result}", file=sys.stderr)
                return False
        return True
    except urllib.error.URLError as exc:
        print(f"[telegram_nudge] network error: {exc}", file=sys.stderr)
        return False
    except Exception as exc:
        print(f"[telegram_nudge] unexpected error: {exc}", file=sys.stderr)
        return False
