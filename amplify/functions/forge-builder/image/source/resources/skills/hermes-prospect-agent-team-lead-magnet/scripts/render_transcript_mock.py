#!/usr/bin/env python
"""Stage 6c: render the mock meeting→sprint example -> transcript-mock.html.

A clearly-labeled MOCK of the live GBAutomation transcript pipeline (modeled on
the jason-diaz b2-sprint transcript report): a short fictional standup snippet,
the action items the pipeline would extract, and the client-branded sprint
board those items land on. Deterministic and offline — content is keyed to the
prospect's stated outcome; nothing pretends to be a real meeting.
"""
from __future__ import annotations

import argparse
import datetime as dt
import sys
from pathlib import Path

from _common import (
    TEMPLATES, esc, load_artifact, pick_accent, read_text, render_template,
    scan_fabrication, scan_secrets, fail_gate, workdir_arg, write_text,
)

TRANSCRIPT = [
    ("You", False, "The follow-ups are the thing — stuff slips for a week and nobody notices until it's awkward."),
    ("GBAuto", True, "So the scout watches the surfaces daily and anything aging past your threshold gets flagged before it's awkward."),
    ("You", False, "And I don't want another dashboard. If it's not in my pocket I won't look at it."),
    ("GBAuto", True, "Everything lands in your chat — the brief, the exceptions, the approvals. The board exists, but you never have to open it."),
    ("You", False, "Okay. Start with follow-ups and the daily exceptions. Nothing touches accounts without me."),
    ("GBAuto", True, "That's the default. Every external action waits in your approval queue — let's draft it that way."),
]

ACTIONS = [
    ("Stand up the follow-up watch: flag anything aging past the agreed threshold", "approved"),
    ("Daily exception brief at 07:00 in chat, approvals inline", "approved"),
    ("Draft the account-action boundary: nothing external without explicit approval", "approved"),
    ("Scope which surfaces the scout may watch (public first)", "pending"),
]

BOARD = [
    ("Triage", [("Scope watchable surfaces", "awaiting your approval")]),
    ("Approved", [("Follow-up watch — thresholds", "sprint cadence"), ("Account-action boundary", "sprint cadence")]),
    ("In progress", [("07:00 exception brief wiring", "reporting agent")]),
    ("Done", [("Team drafted from public research", "receipt filed")]),
]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    parser.add_argument("--generated-on", default=None)
    args = parser.parse_args()

    workdir = Path(args.workdir)
    intake = load_artifact(workdir, "intake.json")
    logo = load_artifact(workdir, "logo-verification.json")
    company = esc(intake["company_name"])

    if logo["mode"] == "verified_logo" and logo.get("logo_local") and \
            (workdir / logo["logo_local"]).exists():
        brandrow = (f'<img src="{esc(logo["logo_local"])}" alt="{company} logo">'
                    f'<span class="x">meeting → sprint · mock example by GBAutomation</span>')
        board_brand = f'<img src="{esc(logo["logo_local"])}" alt="">'
    else:
        brandrow = (f'<span style="font-family:\'Bebas Neue\',sans-serif;font-size:20px">{company}</span>'
                    f'<span class="x">meeting → sprint · mock example by GBAutomation</span>')
        board_brand = ""

    transcript_rows = "".join(
        f'<div class="utter{" gb" if gb else ""}"><span class="who">{esc(who)}</span>'
        f'<p>{esc(line)}</p></div>'
        for who, gb, line in TRANSCRIPT
    )
    action_rows = "".join(
        f'<div class="action"><p>{esc(text)}</p><span class="st {status}">{status}</span></div>'
        for text, status in ACTIONS
    )
    board_columns = "".join(
        f'<div class="col"><h3>{esc(col)} <span>{len(cards)}</span></h3>'
        + "".join(f'<div class="card"><p>{esc(t)}</p><span class="tag">{esc(tag)}</span></div>'
                  for t, tag in cards)
        + '</div>'
        for col, cards in BOARD
    )

    html = render_template(read_text(TEMPLATES / "transcript-mock.html.j2"), {
        "company_name": company,
        "accent_hex": esc(pick_accent(logo.get("brand_colors") or [])),
        "brandrow": brandrow,
        "board_brand": board_brand,
        "transcript_rows": transcript_rows,
        "action_rows": action_rows,
        "board_columns": board_columns,
        "generated_on": esc(args.generated_on or dt.date.today().isoformat()),
    })
    problems = [f"secret pattern: {p}" for p in scan_secrets(html)]
    problems += [f"fabrication pattern: {p}" for p in scan_fabrication(html)]
    if problems:
        fail_gate(problems, "transcript-mock-content")
    write_text(workdir / "transcript-mock.html", html)
    print("OK mock meeting->sprint example -> transcript-mock.html")
    return 0


if __name__ == "__main__":
    sys.exit(main())
