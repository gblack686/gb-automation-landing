"""Approved compact plan email (sample C): a styled preview of the live plan.

Brand values and the compact official logo come from gbauto_doc_template.
Interactive review and approval controls remain on the published plan page.
"""
from __future__ import annotations

import re
from email.message import EmailMessage
from html import escape, unescape
from typing import Any, Mapping, Sequence
from urllib.parse import urlsplit

from resources.lib import gbauto_doc_template as brand

STYLE_ID = "gbauto.plan-email.compact-c.v1"
LOGO_CID = "gb-logo@gbautomation.xyz"
PUBLIC_LOGO_URL = "https://gbautomation.xyz/gb-logo.png"
FONT = "font-family:'Inter',sans-serif;"
SERIF = "font-family:'Newsreader',serif;"


def _text(value: Any, limit: int = 500) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()[:limit]


def plan_email_fields(metadata: Mapping[str, Any], *, body_html: str = "") -> dict[str, Any]:
    """Use declared metadata; never infer an agent or approval from the prose."""
    summary = _text(metadata.get("description") or metadata.get("summary"))
    if not summary and body_html:
        clean = re.sub(r"<(script|style)\b[^>]*>.*?</\1>", "", body_html, flags=re.S | re.I)
        summary = _text(unescape(re.sub(r"<[^>]+>", " ", clean)), 350)
    points = metadata.get("email_summary_points", [])
    return {
        "summary": summary,
        "agent": _text(metadata.get("agent_name") or metadata.get("agent") or metadata.get("writer_agent"), 80),
        "status": _text(metadata.get("email_status") or metadata.get("status") or "Needs Review", 60),
        "category": _text(metadata.get("plan_category") or metadata.get("category"), 60),
        "points": [_text(p, 160) for p in points[:3] if isinstance(p, str)] if isinstance(points, list) else [],
    }


def _live_url(value: str) -> str:
    parsed = urlsplit(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or re.search(r"[\s<>\x00-\x1f]", value):
        raise ValueError("Plan email requires a published HTTPS plan URL")
    return value


def render_plan_email(
    title: str,
    live_url: str,
    *,
    summary: str = "",
    agent: str = "",
    status: str = "Needs Review",
    category: str = "",
    points: Sequence[str] = (),
    logo_src: str = PUBLIC_LOGO_URL,
    companion_build_report_url: str = "",
) -> str:
    """Render email-compatible tables and inline CSS, without the plan's scripts."""
    url = escape(_live_url(live_url), quote=True)
    title = escape(_text(title, 240) or "Plan ready for review")
    summary = escape(_text(summary) or "A new plan is ready for your review.")
    agent = _text(agent, 80)
    ink, cream, panel = brand.INK, brand.CREAM_BG, brand.CREAM_2
    stone, accent, muted, light = brand.STONE, brand.TERRACOTTA, brand.TEXT_MUTED_2, brand.TEXT_MUTE
    logo = escape(logo_src, quote=True)

    def mark(width: int) -> str:
        height = round(width * 89 / 96)
        return f'<img src="{logo}" width="{width}" height="{height}" alt="GB logo" style="display:block;width:{width}px;height:{height}px;border:0;outline:none;">'

    pills = []
    for label, bg, fg, border in ((agent, panel, ink, stone), (_text(status, 60), accent, cream, accent), (_text(category, 60), cream, muted, stone)):
        if label:
            pills.append(f'<span style="display:inline-block;margin:0 5px 6px 0;padding:5px 10px;border:1px solid {border};border-radius:20px;background:{bg};color:{fg};{FONT}font-size:11px;font-weight:600;line-height:16px;overflow-wrap:anywhere">{escape(label)}</span>')
    rows = "".join(
        f'<tr><td width="32" style="padding:8px 0;vertical-align:top;{FONT}font-size:11px;color:{accent}">{i:02d}</td><td style="padding:8px 0;border-bottom:1px solid {stone};{FONT}font-size:13px;line-height:1.6;color:{ink}">{escape(_text(point, 160))}</td></tr>'
        for i, point in enumerate(points[:3], 1) if point
    )
    points_html = f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px">{rows}</table>' if rows else ""
    signature = escape(agent or "GBAutomation Plans")
    companion = ""
    if companion_build_report_url:
        report_url = escape(_live_url(companion_build_report_url), quote=True)
        companion = f'<p style="margin:12px 0 0;{FONT}font-size:12px;color:{ink}">Companion build report: <a href="{report_url}" style="color:{accent}">open build report</a></p>'
    return f'''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="gbauto-email-style" content="{STYLE_ID}"><title>{title}</title>
<style>@media only screen and (max-width:620px){{.outer{{padding:16px 8px!important}}.pad{{padding-left:22px!important;padding-right:22px!important}}.title{{font-size:31px!important;line-height:1.13!important}}}}@media(prefers-reduced-motion:reduce){{*{{animation:none!important;transition:none!important}}}}</style></head>
<body style="margin:0;padding:0;background:{cream};color:{ink};{FONT}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="{cream}" style="background:{cream}"><tr><td class="outer" align="center" style="padding:26px 16px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:{cream}">
<tr><td class="pad" style="padding:22px 32px;border-bottom:1px solid {stone}"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding-right:10px;vertical-align:middle">{mark(30)}</td><td style="vertical-align:middle;{SERIF}font-size:22px;font-weight:500;color:{ink}">GBAutomation</td></tr></table></td></tr>
<tr><td class="pad" style="padding:28px 32px 22px"><p style="margin:0 0 13px;{FONT}font-size:10px;font-weight:600;letter-spacing:1.7px;color:{accent}">PLAN READY FOR REVIEW</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-left:3px solid {accent};padding-left:17px"><h1 class="title" style="margin:0 0 16px;{SERIF}font-size:34px;font-weight:400;line-height:1.1;letter-spacing:-.6px;color:{ink};overflow-wrap:anywhere">{title}</h1></td></tr></table><p style="margin:0 0 20px;{FONT}font-size:15px;line-height:1.7;color:{muted}">{summary}</p>{''.join(pills)}{points_html}</td></tr>
<tr><td class="pad" style="padding:0 32px 26px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="{accent}" style="background:{accent};border-radius:6px"><a href="{url}" style="display:inline-block;padding:13px 23px;{FONT}font-size:13px;font-weight:600;color:{cream};text-decoration:none;line-height:20px">Open full plan &rarr;</a></td></tr></table><p style="margin:12px 0 0;{FONT}font-size:11px;line-height:1.7;color:{light}">Read the complete plan and use its review controls on the plan page.</p>{companion}</td></tr>
<tr><td class="pad" style="padding:25px 32px 28px;border-top:1px solid {stone}"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding-right:15px;vertical-align:middle">{mark(44)}</td><td style="vertical-align:middle;{FONT}"><p style="margin:0 0 4px;font-size:13px;font-weight:600;color:{ink}">{signature}</p><p style="margin:0;font-size:12px;color:{muted};line-height:1.65">GBAutomation<br><a href="https://gbautomation.xyz" style="color:{accent};text-decoration:none">gbautomation.xyz</a></p></td></tr></table></td></tr>
</table></td></tr></table></body></html>'''


def build_plan_message(*, to_addr: str, from_addr: str, subject: str, title: str, live_url: str, **fields: Any) -> EmailMessage:
    """Build plain/HTML alternatives with one official PNG shared by both logos."""
    html = render_plan_email(title, live_url, logo_src=f"cid:{LOGO_CID}", **fields)
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = from_addr, to_addr, subject
    summary = _text(fields.get("summary"))
    metadata = " | ".join(_text(fields.get(k), 80) for k in ("agent", "status", "category") if fields.get(k))
    companion = f"\nCompanion build report: {_live_url(fields['companion_build_report_url'])}\n" if fields.get("companion_build_report_url") else ""
    msg.set_content(f"{_text(title, 240)}\n{metadata}\n\n{summary}\n\nOpen full plan: {_live_url(live_url)}\n{companion}\nGBAutomation\nhttps://gbautomation.xyz\n")
    msg.add_alternative(html, subtype="html")
    msg.get_payload()[1].add_related(brand.REPORT_LOGO_MARK.read_bytes(), maintype="image", subtype="png", cid=f"<{LOGO_CID}>", disposition="inline", filename="gb-logo.png")
    return msg
