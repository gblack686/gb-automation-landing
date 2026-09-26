#!/usr/bin/env python
"""Stage 7: assemble the branded interactive index.html (+ per-agent pages).

Themes:
  neon-oiran (default) — dark neon skin derived from the operator's Neon Oiran
    template, MTG card art on the roster when fetch_mtg_art.py has run
    (deterministic SVG treatment otherwise), and a clickable agents/<id>.html
    profile page per agent with the full draft config and proposed skills.
  gbauto — the original cream/terracotta house-brand page, unchanged.

All prospect-derived text is HTML-escaped; every generated page is secret- and
fabrication-scanned before it is kept.
"""
from __future__ import annotations

import argparse
import datetime as dt
import sys
from pathlib import Path

import yaml

from _common import (
    ASSETS, TEMPLATES, dump_json, esc, fail_gate, load_artifact,
    load_structured, pick_accent, read_text, render_template,
    scan_fabrication, scan_secrets, workdir_arg, write_text,
)

TRIAL_DAYS = [
    ("Day 0", "You approve activation scope — which tools, which channels, what the team may touch."),
    ("Day 1", "Sanitized profile and workspace created; activation receipt logged; nothing else connects."),
    ("Days 2–6", "Daily guided morning briefs; every external action is approval-gated."),
    ("Day 7", "Mid-trial checkpoint: what worked, what was noisy, scope adjustments."),
    ("Days 8–13", "Bounded workflows continue under the updated approval rules."),
    ("Day 14", "Closeout report with a keep / kill / convert recommendation."),
    ("After", "No conversion approval → channels revoked, receipts archived, trial marked expired."),
]

SAFEGUARDS = [
    ("Public research only", "Every company fact cites a public page. No logins, no account access, no private surfaces."),
    ("Draft-only profile", "The agent team is a manifest, not a running system. No tools or channels are wired."),
    ("Human approval gates", "Preview publication, prospect contact, and activation are three separate human decisions."),
    ("Clean expiry", "Day 14 without conversion → channels revoked, temporary credentials rotated, receipts archived."),
]

DAILY = [
    ("07:00 — Morning brief", "One message: yesterday's wins, today's exceptions, approvals waiting on you."),
    ("Business hours — Exception reports", "Specialists surface anomalies with full context, never raw noise."),
    ("On demand — Approval requests", "Anything external arrives as a draft you approve, edit, or decline."),
    ("Friday — Weekly review", "What the team handled, what it escalated, and what to tune next week."),
]

THEME_TEMPLATES = {
    "gbauto": "prospect-index.html.j2",
    "neon-oiran": "prospect-index-neon.html.j2",
    "client-report": "prospect-index-client-report.html.j2",
}

# Themes that generate per-agent profile pages and MTG roster art.
ROSTER_THEMES = ("neon-oiran", "client-report")

# --- zero-touch narrative content (neon theme) --------------------------------
# Grounded in gbautomation.xyz/zero-touch-engineering: humans keep strategy,
# judgment, and review; agents carry research, drafting, packaging, execution.
ZERO_TOUCH_URL = "https://www.gbautomation.xyz/zero-touch-engineering"
REPORT_EXAMPLE_URL = "https://gbautomation-2026-07-07-fleet-rationalization-skil--gbautoxyz.netlify.app"
TRANSCRIPT_TEMPLATE_URL = "https://gbautomation-2026-06-25-transcript-sink-unificatio--gbautoxyz.netlify.app"

ZERO_TOUCH_CARDS = [
    ("You keep", "Strategy, planning, judgment, taste, and review. Every decision that matters stays a human decision."),
    ("Agents carry", "Research, drafting, scaffolding, packaging, status updates — the repeatable execution, grounded in your business context."),
    ("The outcome", "Your team reviews prepared work from an approval queue instead of shepherding every task through by hand."),
]

GATE_CARDS = [
    ("Gate 1 — PRD planning approval",
     "Work begins as a PRD: scope, acceptance criteria, risks, and the exact approval gates ahead. "
     "Nothing is built until you approve the plan."),
    ("Gate 2 — Report review",
     "Work ends as a collapsible report with receipts attached and a feedback widget. "
     "You review, react, or redirect — your feedback routes straight back into the backlog."),
]

PIPELINE_CARDS = [
    ("What lands automatically",
     "The Meet transcript is picked up from Drive, issues and action items are extracted, "
     "deduplicated against everything already seen, and staged as triage items."),
    ("What you approve",
     "Triage is human-gated: you approve an item and it becomes a sprint task on the board, "
     "where the sprint-manager runs the cadence. Decline and it disappears."),
]

CORE_PROFILES = [
    ("sprint-manager", "Runs the sprint cadence: pulls approved tasks, tracks the board, reports progress. Core — the cadence is never an afterthought."),
    ("report-manager", "Owns the review surface: renders every closeout as the branded collapsible report."),
    ("artifact-manager", "Files every deliverable durably — nothing lives only in a chat scrollback."),
    ("git-manager", "Repo discipline: worktrees, scoped commits, PR-only landings, never a force-push."),
    ("knowledge-manager", "Keeps the second brain current so agents start informed, not blank."),
    ("observability-manager", "Watches the watchers: traces, receipts, and run health for every agent."),
]

REPORT_CARDS = [
    ("Collapsible by design",
     "Executive summary on top; every section folds open to the receipts underneath. "
     "Decision-makers skim, reviewers dig — same document."),
    ("Feedback becomes work",
     "The embedded widget files your comment as a structured event the team triages — "
     "reaction to backlog without a meeting."),
]

# --- client-report theme content (simplified flow) ----------------------------
WHY_CARDS = [
    ("Always on, always yours",
     "The team runs on dedicated infrastructure with your business context loaded — "
     "it knows your workflows, not just your prompt."),
    ("Everything leaves a receipt",
     "Runs are traced, deliverables are filed, schedules are records. "
     "You can audit any claim the team makes."),
    ("Humans stay in charge",
     "Anything external — a message, a change, a connection — waits in your "
     "approval queue until you say go."),
]

TTFW_CARDS = [
    ("The first-win yardstick",
     "Onboarding targets a first measurable win within the first day: workspace live, "
     "your channel active, the morning brief arriving, and the first workflow running."),
    ("Your workflow catalog",
     "Intake typically maps 20–30 automatable workflows for a business like yours. "
     "The drafted team starts with the highest-leverage handful — the catalog is the roadmap."),
]

PHILOSOPHY_CARDS = [
    ("You keep", "Strategy, planning, judgment, taste, and review. Every decision that matters stays a human decision."),
    ("Agents carry", "Research, drafting, packaging, status updates — repeatable execution grounded in your business context."),
    ("Mobile-first review", "Approvals, the morning brief, and exception alerts arrive in your chat channel — review and approve from your phone, not a dashboard chained to a desk."),
    ("Reports that respect your time", "Every closeout is a collapsible report: skim the summary, fold open the receipts only where you care."),
]


def snapshot_cards(research: dict) -> str:
    cards = []
    for fact in research["facts"]:
        cites = "".join(
            f'<p class="cite">Source: <a href="{esc(s["url"])}" rel="noopener" target="_blank">{esc(s["title"])}</a></p>'
            for s in fact.get("sources", [])
        )
        cards.append(
            f'<div class="panel"><span class="chip {esc(fact["confidence"])}">{esc(fact["confidence"].replace("_", " "))}</span>'
            f'<p>{esc(fact["text"])}</p>{cites}</div>'
        )
    return "".join(cards)


def opportunity_cards(intake: dict, manifest: dict) -> str:
    outcome = esc(intake["desired_business_outcome"])
    cards = [
        f'<div class="panel"><span class="chip inferred">hypothesis</span>'
        f'<h3>Your stated goal</h3><p>{outcome}</p></div>'
    ]
    for agent in manifest["team"]["specialist_agents"][:4]:
        cards.append(
            f'<div class="panel"><span class="chip inferred">hypothesis</span>'
            f'<h3>{esc(agent["display_name"])}</h3><p>{esc(agent["purpose"])}</p></div>'
        )
    return "".join(cards)


def agent_art_html(workdir: Path, agent_id: str, mtg: dict | None, fallback_svg: str) -> tuple[str, str]:
    """Return (art html, credit html) for one agent roster card.
    Precedence: GBAutomation-generated portrait (gpt-image-2, rights-clean)
    > MTG card art (non-commercial demo) > deterministic SVG.
    When capture_card_images.py has run (assets/cards/<id>.png), the panel
    also carries the forged card image — shown only on the ACTIVE carousel
    panel; the portrait stays the collapsed-slat artwork (operator-directed)."""
    generated = workdir / "assets" / "generated" / f"{agent_id}.png"
    if generated.exists():
        rel = f"assets/generated/{agent_id}.png"
        credit = ('<span class="art-credit">Art: GBAutomation original · gpt-image-2</span>')
        art = f'<img class="card-portrait" src="{rel}" alt="" loading="lazy">'
        card_png = workdir / "assets" / "cards" / f"{agent_id}.png"
        if card_png.exists():
            art += (f'<img class="card-full" src="assets/cards/{agent_id}.png" '
                    f'alt="" loading="lazy">')
        return art, credit
    record = (mtg or {}).get("agents", {}).get(agent_id)
    if record and (workdir / record["image_local"]).exists():
        rel = record["image_local"]
        alt = esc(f"{record['card_name']} — art by {record['artist']}")
        credit = (f'<span class="art-credit">Art: {esc(record["artist"])} · '
                  f'{esc(record["card_name"])} © Wizards of the Coast</span>')
        return f'<img src="{esc(rel)}" alt="{alt}" loading="lazy">', credit
    return fallback_svg, ""


def lead_agent_card(manifest: dict, theme: str) -> str:
    lead = manifest["team"]["lead_agent"]
    boundaries = "".join(f"<li>{esc(b.replace('_', ' '))}</li>" for b in lead["approval_boundaries"])
    link = (f'<a class="open" href="agents/{esc(lead["id"])}.html">Open full draft profile</a>'
            if theme in ROSTER_THEMES else "")
    star = "★ " if lead.get("acts_as_planning_leader") else ""
    role = lead.get("role_tier", "team_leader").replace("_", " ")
    # the panel sits beside the (tall) forged-card iframe — fill it with the
    # substance already in the manifest instead of leaving dead space
    brief_shape = (manifest.get("workflow") or {}).get("daily_report_shape", "")
    brief_line = (f'<p>Its one daily deliverable: {esc(brief_shape)}.</p>'
                  if brief_shape else "")
    skills = "".join(
        f'<li><strong>{esc(s["name"].replace("-", " "))}</strong> — {esc(s["description"])}</li>'
        for s in lead.get("proposed_skills") or [])
    skills_block = (f'<p class="cite">Day-one skills (proposed, nothing wired):</p>'
                    f'<ul class="cite">{skills}</ul>' if skills else "")
    return (
        f'<span class="tier">model tier: {esc(lead["model_tier"])} · {esc(role)}</span>'
        f'<h3>{star}{esc(lead["display_name"])}</h3><p>{esc(lead["purpose"])}</p>'
        f'{brief_line}{skills_block}'
        f'<p class="cite">Approval boundaries:</p><ul class="cite">{boundaries}</ul>{link}'
    )


def specialist_cards_gbauto(manifest: dict) -> str:
    return "".join(
        f'<div class="panel"><span class="tier">model tier: {esc(a["model_tier"])}</span>'
        f'<h3>{esc(a["display_name"])}</h3><p>{esc(a["purpose"])}</p></div>'
        for a in manifest["team"]["specialist_agents"]
    )


def specialist_cards_neon(workdir: Path, manifest: dict, mtg: dict | None,
                          fallback_svg: str, vlabel: bool = False) -> str:
    """Roster cards. vlabel=True adds the vertical collapsed-panel label the
    client-report carousel shows on inactive panels (hidden elsewhere by CSS)."""
    cards = []
    for agent in manifest["team"]["specialist_agents"]:
        art, credit = agent_art_html(workdir, agent["id"], mtg, fallback_svg)
        label = f'<span class="vlabel">{esc(agent["display_name"])}</span>' if vlabel else ""
        cards.append(
            f'<a class="agent-card" href="agents/{esc(agent["id"])}.html">'
            f'<div class="art">{art}</div>{label}'
            f'<div class="meta"><span class="tier">tier: {esc(agent["model_tier"])}'
            f'{" · " + esc(agent["role_tier"]) if agent.get("role_tier") else ""}</span>'
            f'<h3>{esc(agent["display_name"])}</h3><p>{esc(agent["purpose"])}</p>'
            f'<span class="open">Open draft profile</span>{credit}</div></a>'
        )
    return "".join(cards)


def core_rack_items(manifest: dict, friendly: bool = False) -> str:
    """Shared skill rack. friendly=True renders the client-facing display
    names (internal skill id shown as a small code line)."""
    items = []
    for s in manifest["team"].get("core_skill_rack", []):
        if friendly and s.get("display_name"):
            # GB signature badge marks the proprietary GBAuto-core features
            items.append(
                f'<div class="rack-item"><strong>{esc(s["display_name"])}'
                f'<img class="rack-gb" src="assets/brand/gb-signature-white.png" '
                f'alt="GBAutomation proprietary" title="GBAutomation proprietary"></strong>'
                f'<span>{esc(s["description"])}</span>'
                f'<span class="code">{esc(s["name"])}</span></div>'
            )
        else:
            items.append(
                f'<div class="rack-item"><strong>{esc(s["name"])}</strong>'
                f'<span>{esc(s["description"])}</span></div>'
            )
    return "".join(items)


def canopy_items(manifest: dict) -> str:
    return "".join(
        f'<span class="canopy-item"><strong>{esc(c["snippet"])}</strong>{esc(c["behavior"])}</span>'
        for c in manifest["team"].get("canopy_inheritance", [])
    )


def visual_figures(workdir: Path, provenance: dict) -> str:
    figures = []
    for asset in provenance["assets"]:
        if asset["asset_id"] == "hero_world":
            continue  # hero visual is inlined in the hero section
        body = ""
        if asset["output_path"]:
            body = read_text(workdir / asset["output_path"])
        caption = (f'{esc(asset["asset_id"].replace("_", " "))} · provider: {esc(asset["provider"])} · '
                   f'fingerprint {esc(asset["prompt_fingerprint"][:12])}…')
        figures.append(f'<figure class="viz">{body}<figcaption>{caption}</figcaption></figure>')
    return "".join(figures)


def simple_cards(items: list[tuple[str, str]]) -> str:
    return "".join(f'<div class="panel"><h3>{esc(t)}</h3><p>{esc(b)}</p></div>' for t, b in items)


def scan_or_die(html: str, label: str) -> None:
    problems = [f"secret pattern in {label}: {p}" for p in scan_secrets(html)]
    problems += [f"fabrication pattern in {label}: {p}" for p in scan_fabrication(html)]
    if problems:
        fail_gate(problems, "page-content")


def write_agent_pages(workdir: Path, manifest: dict, mtg: dict | None,
                      lockup: str, company: str, generated_on: str, hero_svg: str) -> int:
    template = read_text(TEMPLATES / "agent-profile.html.j2")
    team = manifest["team"]
    agents = [team["lead_agent"], *team["specialist_agents"]]
    team_boundaries = team["lead_agent"]["approval_boundaries"]

    seeded_path = workdir / "seeded-art-manifest.json"
    seeded = load_structured(seeded_path) if seeded_path.exists() else {}
    seed_credit = ""
    if seeded.get("mode") != "prompt_seeded" and seeded.get("seed_card"):
        seed_credit = (f' · style-seeded on {seeded["seed_card"]} by '
                       f'{seeded.get("seed_artist", "?")} (seed art not shown)')

    for agent in agents:
        generated_rel = f"assets/generated/{agent['id']}.png"
        record = (mtg or {}).get("agents", {}).get(agent["id"])
        if (workdir / generated_rel).exists():
            # the agent's own generated portrait beats the MTG stand-in
            banner = (f'<img src="../{generated_rel}" '
                      f'alt="{esc(agent["display_name"])} — original generated portrait">')
            card_chip = ('<span class="chip">original gpt-image-2 portrait'
                         f'{esc(seed_credit)}</span>')
            footer = (f'Portrait: GBAutomation-original generation{esc(seed_credit)} · '
                      f'Drafted by GBAutomation · {esc(generated_on)}')
        elif record and (workdir / record["image_local"]).exists():
            banner = (f'<img src="../{esc(record["image_local"])}" '
                      f'alt="{esc(record["card_name"])} — art by {esc(record["artist"])}">')
            card_chip = (f'<span class="chip">card: {esc(record["card_name"])} · '
                         f'art: {esc(record["artist"])}</span>')
            footer = (f'Card art © Wizards of the Coast · {esc(record["card_name"])} by '
                      f'{esc(record["artist"])} · Non-commercial internal demo · '
                      f'Drafted by GBAutomation · {esc(generated_on)}')
        else:
            banner, card_chip = hero_svg, ""
            footer = f'Drafted for a Hermes-based guided walkthrough by GBAutomation · {esc(generated_on)}'

        skills = agent.get("proposed_skills") or []
        skill_cards = "".join(
            f'<div class="panel"><h3>{esc(s["name"])}</h3><p>{esc(s["description"])}</p></div>'
            for s in skills
        ) or ('<div class="panel"><h3>To be drafted</h3>'
              '<p>Skills for this role are scoped during activation planning.</p></div>')

        boundaries = agent.get("approval_boundaries", team_boundaries)
        io_pairs = [f"in: {v}" for v in agent.get("inputs", [])] + \
                   [f"out: {v}" for v in agent.get("outputs", [])]
        io_pairs += [f"memory scope: {agent.get('memory_scope', 'draft_only_no_private_memory')}",
                     "tools wired: none until activation"]

        config_view = {k: agent.get(k) for k in
                       ("id", "display_name", "purpose", "model_tier", "role_tier",
                        "acts_as_planning_leader", "tools", "skills",
                        "proposed_skills", "inputs", "outputs", "memory_scope",
                        "approval_boundaries") if k in agent}
        star = "★ " if agent.get("acts_as_planning_leader") else ""
        rack_cards = "".join(
            f'<div class="panel"><h3>{esc(s["name"])}</h3><p>{esc(s["description"])}</p></div>'
            for s in team.get("core_skill_rack", [])
        ) or ('<div class="panel"><h3>Defined at activation</h3>'
              '<p>The shared operations rack is scoped with the trial.</p></div>')
        page = render_template(template, {
            "agent_name": star + esc(agent["display_name"]),
            "company_name": company,
            "lockup_text": lockup,
            "model_tier": esc(agent["model_tier"]),
            "role_tier": esc(agent.get("role_tier", "specialist").replace("_", " ")),
            "core_rack_cards": rack_cards,
            "card_chip": card_chip,
            "banner_art": banner,
            "purpose": esc(agent["purpose"]),
            "config_yaml": esc(yaml.safe_dump(config_view, sort_keys=False, allow_unicode=True)),
            "skill_cards": skill_cards,
            "boundary_items": "".join(f"<li>{esc(b.replace('_', ' '))}</li>" for b in boundaries),
            "io_items": "".join(f"<li>{esc(p)}</li>" for p in io_pairs),
            "footer_line": footer,
        })
        scan_or_die(page, f"agents/{agent['id']}.html")
        write_text(workdir / "agents" / f"{agent['id']}.html", page)
    return len(agents)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    parser.add_argument("--forge-workspace", "--expert-profile", dest="expert_profile", type=Path,
                        help="Render one expert-profile-page.v1 input inside the Agent Forge UI")
    parser.add_argument("--theme", choices=sorted(THEME_TEMPLATES), default="client-report")
    parser.add_argument("--generated-on", default=None,
                        help="Date stamp for the footer (default: today UTC)")
    parser.add_argument("--zero-touch-url", default=ZERO_TOUCH_URL,
                        help="Zero-touch engineering philosophy link")
    parser.add_argument("--report-example-url", default=REPORT_EXAMPLE_URL,
                        help="Live collapsible-report-with-feedback-widget example")
    parser.add_argument("--transcript-template-url", default=TRANSCRIPT_TEMPLATE_URL,
                        help="Transcript report template example link")
    args = parser.parse_args()

    workdir = Path(args.workdir)
    if args.expert_profile:
        from render_expert_profile import write_profile
        try:
            receipt = write_profile(args.expert_profile, workdir, args.generated_on)
        except (ValueError, OSError) as error:
            print(f"Expert profile rejected: {error}" if isinstance(error, ValueError)
                  else "Expert profile file could not be read or written", file=sys.stderr)
            return 1
        print(f"OK single expert Forge workspace, YAML sha256={receipt['yaml_sha256']}")
        return 0
    intake = load_artifact(workdir, "intake.json")
    research = load_artifact(workdir, "research-citations.json")
    logo = load_artifact(workdir, "logo-verification.json")
    manifest = load_artifact(workdir, "sanitized-hermes-team.yaml")
    provenance = load_artifact(workdir, "image-provenance.json")
    claim_map = load_artifact(workdir, "claim-map.json")
    mtg = None
    if (workdir / "mtg-art-manifest.json").exists():
        mtg = load_structured(workdir / "mtg-art-manifest.json")

    company = esc(intake["company_name"])
    person = (intake.get("prospect") or {}).get("name")
    hero_asset = next(a for a in provenance["assets"] if a["asset_id"] == "hero_world")
    team_asset = next(a for a in provenance["assets"] if a["asset_id"] == "team_collaboration")
    workflow_asset = next(a for a in provenance["assets"] if a["asset_id"] == "industry_workflow")
    limitation = next(c["text"] for c in claim_map["claims"] if c["claim_type"] == "limitation")
    generated_on = args.generated_on or dt.date.today().isoformat()

    lockup = f"GBAutomation × {company}"
    if logo["mode"] != "verified_logo":
        lockup += " (text lockup)"

    hero_svg = read_text(workdir / hero_asset["output_path"]) if hero_asset["output_path"] else ""
    team_svg = read_text(workdir / team_asset["output_path"]) if team_asset["output_path"] else ""

    context = {
        "company_name": company,
        "lockup_text": lockup,
        "safety_line": esc(limitation),
        "hero_headline": f"A custom Hermes agent team, drafted for {company}.",
        "thesis": esc(
            f"Built from public signals and one goal you shared: "
            f"{intake['desired_business_outcome']} It is not active — it is drafted, "
            f"and activating it is entirely your decision."
        ),
        "hero_visual": hero_svg,
        "snapshot_cards": snapshot_cards(research),
        "opportunity_cards": opportunity_cards(intake, manifest),
        "lead_agent_card": lead_agent_card(manifest, args.theme),
        "workflow_visual": read_text(workdir / workflow_asset["output_path"]) if workflow_asset["output_path"] else "",
        "workflow_caption": "intake → specialist analysis → lead synthesis → approval gate → daily brief",
        "safeguard_cards": simple_cards(SAFEGUARDS),
        "daily_cards": simple_cards(DAILY),
        "visual_figures": visual_figures(workdir, provenance),
        "trial_days": "".join(f"<li><strong>{esc(d)}</strong> — {esc(t)}</li>" for d, t in TRIAL_DAYS),
        "cta_name": esc(person) if person else company,
        "cta_href": "https://gbautomation.xyz/#contact",
        "revise_href": "mailto:greg@gbautomation.xyz?subject=Lead%20magnet%20revision%20request",
        "generated_on": esc(generated_on),
    }
    if args.theme == "neon-oiran":
        specialists = manifest["team"]["specialist_agents"]
        specialist_method = [
            ("Derived from your goal",
             f"Your stated outcome selected {len(specialists)} specialist roles — "
             f"keyword-matched to the work, not copied from a template."),
            ("One agent, one purpose",
             "Each specialist does exactly one job with a bounded model tier — "
             "senior tiers for judgment-heavy roles, junior tiers for deterministic ones."),
            ("Skills are proposals",
             "Every role lists the skills it would learn — labeled proposed, wired only "
             "after you approve activation."),
            ("Inspect the drafts",
             "Every card in the roster above opens the agent's full draft profile: "
             "config, skills, boundaries, and wiring."),
        ]
        context["specialist_cards"] = specialist_cards_neon(workdir, manifest, mtg, team_svg)
        context["core_rack_items"] = core_rack_items(manifest)
        context["canopy_items"] = canopy_items(manifest)
        context["zero_touch_cards"] = simple_cards(ZERO_TOUCH_CARDS)
        context["zero_touch_url"] = esc(args.zero_touch_url)
        context["gate_cards"] = simple_cards(GATE_CARDS)
        context["pipeline_cards"] = simple_cards(PIPELINE_CARDS)
        context["pipeline_visual"] = context["workflow_visual"]
        if (workdir / "transcript-mock.html").exists():
            context["transcript_preview"] = (
                '<div class="report-embed"><div class="embed-bar">'
                f'<span>live preview — meeting → sprint, {company} mock</span><span>scroll inside ▾</span></div>'
                '<iframe src="transcript-mock.html" title="Meeting to sprint mock example" '
                'loading="lazy"></iframe></div>'
            )
            context["transcript_template_url"] = "transcript-mock.html"
            context["transcript_link_label"] = "Open the full meeting → sprint example"
        else:
            context["transcript_preview"] = (
                f'<figure class="viz">{context["workflow_visual"]}'
                '<figcaption>transcript → extraction → your approval → sprint tasks → sprint cadence</figcaption></figure>'
            )
            context["transcript_template_url"] = esc(args.transcript_template_url)
            context["transcript_link_label"] = "See the transcript report template"
        context["core_profile_cards"] = simple_cards(CORE_PROFILES)
        context["specialist_method_cards"] = simple_cards(specialist_method)
        context["report_cards"] = simple_cards(REPORT_CARDS)
        context["report_example_url"] = esc(args.report_example_url)
        context["footer_art_credit"] = (
            " · Card art © Wizards of the Coast, artists credited per card — "
            "non-commercial internal demo" if mtg else ""
        )
    elif args.theme == "client-report":
        specialists = manifest["team"]["specialist_agents"]
        # Logo-first branding: accent comes off the client's mark
        accent = pick_accent(logo.get("brand_colors") or [])
        logo_verified = (logo["mode"] == "verified_logo" and logo.get("logo_local")
                         and (workdir / logo["logo_local"]).exists())
        # GB signature image replaces the GBAutomation text in the nav lockup
        # (operator-directed); falls back to text when the asset is absent
        gb_mark = "GBAutomation"
        gb_lockup_src = ASSETS / "gb-signature-white.png"
        if gb_lockup_src.exists():
            gb_lockup_rel = "assets/brand/gb-signature-white.png"
            gb_lockup_dest = workdir / gb_lockup_rel
            gb_lockup_dest.parent.mkdir(parents=True, exist_ok=True)
            gb_lockup_dest.write_bytes(gb_lockup_src.read_bytes())
            gb_mark = f'<img class="gb-mark" src="{gb_lockup_rel}" alt="GBAutomation">'
        if logo_verified:
            logo_img = (f'<img src="{esc(logo["logo_local"])}" '
                        f'alt="{company} logo" loading="eager">')
            context["lockup_html"] = f'{logo_img}<span class="x">×</span>{gb_mark}'
            context["hero_brandmark"] = logo_img
        else:
            context["lockup_html"] = f'{company} <span class="x">×</span>{gb_mark}<span class="x">(text lockup)</span>'
            context["hero_brandmark"] = ""
        context["accent_hex"] = esc(accent)
        # Hermes mark as the fixed page backdrop (operator-directed; copy
        # attribution stays text-only). Prefers the hermes-agent.org white
        # logo; falls back to the WebUI caduceus glyph. Copied into the run
        # so the page stays self-contained.
        context["hermes_backdrop"] = ""
        for asset_name in ("hermes-agent-white.svg", "hermes-caduceus.png"):
            backdrop_src = ASSETS / asset_name
            if backdrop_src.exists():
                backdrop_rel = f"assets/brand/{asset_name}"
                dest = workdir / backdrop_rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(backdrop_src.read_bytes())
                # GB signature is emitted first so it paints behind the
                # hermes stencil (both sit at z-index 0; DOM order stacks them)
                gb_src = ASSETS / "gb-signature-white.png"
                if gb_src.exists():
                    gb_rel = "assets/brand/gb-signature-white.png"
                    gb_dest = workdir / gb_rel
                    gb_dest.parent.mkdir(parents=True, exist_ok=True)
                    gb_dest.write_bytes(gb_src.read_bytes())
                    context["hermes_backdrop"] = (
                        f'<img class="gb-backdrop-overlay" src="{gb_rel}" alt="" aria-hidden="true">'
                    )
                context["hermes_backdrop"] += (
                    f'<img class="hermes-backdrop" src="{backdrop_rel}" alt="" aria-hidden="true">'
                )
                break
        # hero layers: the client logo as the banner image (logo-first),
        # orchestrator card art bleeding in dimly behind it
        # hero banner: the client logo watermark only (operator: no card art here)
        hero_layers = ""
        if logo_verified:
            hero_layers += (f'<img class="hero-banner-logo" src="{esc(logo["logo_local"])}" '
                            f'alt="" aria-hidden="true">')
        context["hero_art"] = hero_layers
        # orchestrator section: the lead agent's card. Prefers the FORGED
        # GBAutomation-original card (forge_agent_cards.py — rights-clean);
        # falls back to the logo-color-chosen MTG face (demo-only, WotC IP).
        lead_record = (mtg or {}).get("agents", {}).get(manifest["team"]["lead_agent"]["id"])
        card_face = (lead_record or {}).get("card_image_local")
        if (workdir / "lead-card.html").exists():
            context["lead_card_image"] = (
                '<figure class="lead-card-image lead-card-forged">'
                '<iframe src="lead-card.html" title="Ops lead agent card" loading="lazy" '
                'scrolling="no"></iframe>'
                '<figcaption>your ops lead — a GBAutomation original card, tinted to your brand'
                '</figcaption></figure>'
            )
        elif card_face and (workdir / card_face).exists():
            context["lead_card_image"] = (
                f'<figure class="lead-card-image"><img src="{esc(card_face)}" '
                f'alt="{esc(lead_record["card_name"])} card">'
                f'<figcaption>{esc(lead_record["card_name"])} · chosen from your brand colors · '
                f'© Wizards of the Coast (demo)</figcaption></figure>'
            )
        else:
            context["lead_card_image"] = ""
        # specialists section: the whole drafted team as the forged card sheet
        if (workdir / "agent-cards.html").exists():
            context["agent_cards_embed"] = (
                '<details class="fold"><summary>View the drafted team as a card set</summary>'
                '<div class="fold-body"><figure class="report-embed cards-embed">'
                '<iframe src="agent-cards.html" title="Agent team card set" loading="lazy">'
                '</iframe></figure>'
                '<p class="cite">GBAutomation original cards — frame, text, and art are ours; '
                'mana cost = the model tier each role runs on. '
                '<a href="agent-cards.html" target="_blank" rel="noopener">Open the full sheet</a>.'
                '</p></div></details>'
            )
        else:
            context["agent_cards_embed"] = ""
        # kanban section: the sprint board visualization, mirroring the mock
        # board in transcript-mock.html (same columns, client-branded head)
        board_head = ""
        if logo_verified:
            board_head = (f'<div class="kb-head"><img src="{esc(logo["logo_local"])}" alt="">'
                          f'<span>{company} — sprint board · Hermes dashboard view</span></div>')
        else:
            board_head = (f'<div class="kb-head"><span>{company} — sprint board · '
                          f'Hermes dashboard view</span></div>')
        board_cols = [
            ("Triage", [("Scope which surfaces the scout may watch", "awaiting your approval"),
                        ("Weekly digest — choose the sources", "awaiting your approval"),
                        ("Outbound-draft boundaries", "awaiting your approval")]),
            ("Approved", [("Follow-up watch — thresholds", "sprint cadence"),
                          ("Account-action boundary", "sprint cadence"),
                          ("Meeting notes → action items pipeline", "sprint cadence")]),
            ("In progress", [("07:00 exception brief wiring", "reporting agent"),
                             ("Report format sign-off round", "orchestrator"),
                             ("Specialist draft-profile tuning", "orchestrator")]),
            ("Done", [("Team drafted from public research", "receipt filed"),
                      ("Brand accent extracted from your logo", "receipt filed"),
                      ("25 workflow presets loaded", "receipt filed")]),
        ]
        context["kanban_board"] = board_head + '<div class="kb-board">' + "".join(
            f'<div class="kb-col"><h3>{esc(col)} <span>{len(items)}</span></h3>'
            + "".join(f'<div class="kb-card"><p>{esc(t)}</p>'
                      f'<span class="tag">{esc(tag)}</span></div>' for t, tag in items)
            + '</div>' for col, items in board_cols) + '</div>'
        context["why_cards"] = simple_cards(WHY_CARDS)
        context["ttfw_cards"] = simple_cards(TTFW_CARDS)
        context["orchestrator_card"] = lead_agent_card(manifest, args.theme)
        context["specialists_sub"] = esc(
            f"Your stated outcome selected {len(specialists)} specialist roles — each with one "
            f"purpose and a bounded capability tier (senior for judgment, junior for the "
            f"deterministic work). Click any card for the full draft profile."
        )
        context["specialist_cards"] = specialist_cards_neon(workdir, manifest, mtg, team_svg, vlabel=True)
        context["core_rack_items"] = core_rack_items(manifest, friendly=True)
        context["philosophy_cards"] = simple_cards(PHILOSOPHY_CARDS)
        context["zero_touch_url"] = esc(args.zero_touch_url)
        context["gate_cards"] = simple_cards(GATE_CARDS)
        # The generated research report IS the review-surface example: embed a
        # live preview and link the full document. External example only as
        # fallback when the report stage hasn't run.
        if (workdir / "research-report.html").exists():
            context["report_preview"] = (
                '<div class="report-embed"><div class="embed-bar">'
                f'<span>live preview — {company} research report</span><span>scroll inside ▾</span></div>'
                '<iframe src="research-report.html" title="Company research report preview" '
                'loading="lazy"></iframe></div>'
            )
            context["report_example_url"] = "research-report.html"
            context["report_example_label"] = "Open the full research report"
        else:
            context["report_preview"] = ""
            context["report_example_url"] = esc(args.report_example_url)
            context["report_example_label"] = "Open a live example report"
        context["pipeline_cards"] = simple_cards(PIPELINE_CARDS)
        context["pipeline_visual"] = context["workflow_visual"]
        if (workdir / "transcript-mock.html").exists():
            context["transcript_preview"] = (
                '<div class="report-embed"><div class="embed-bar">'
                f'<span>live preview — meeting → sprint, {company} mock</span><span>scroll inside ▾</span></div>'
                '<iframe src="transcript-mock.html" title="Meeting to sprint mock example" '
                'loading="lazy"></iframe></div>'
            )
            context["transcript_template_url"] = "transcript-mock.html"
            context["transcript_link_label"] = "Open the full meeting → sprint example"
        else:
            context["transcript_preview"] = (
                f'<figure class="viz">{context["workflow_visual"]}'
                '<figcaption>transcript → extraction → your approval → sprint tasks → sprint cadence</figcaption></figure>'
            )
            context["transcript_template_url"] = esc(args.transcript_template_url)
            context["transcript_link_label"] = "See the transcript report template"
        context["footer_art_credit"] = (
            " · Card art © Wizards of the Coast, artists credited per card — "
            "non-commercial internal demo" if mtg else ""
        )
        # Standalone pricing page (operator-directed 2026-07-13): tiers live
        # BEHIND a button, never on the team page itself. Same neon skin,
        # theme-palette hexes only.
        pricing = render_template(
            read_text(TEMPLATES / "pricing-client-report.html.j2"), context
        )
        scan_or_die(pricing, "pricing.html")
        write_text(workdir / "pricing.html", pricing)
    else:
        context["specialist_cards"] = specialist_cards_gbauto(manifest)

    html = render_template(read_text(TEMPLATES / THEME_TEMPLATES[args.theme]), context)
    scan_or_die(html, "index.html")
    write_text(workdir / "index.html", html)
    dump_json(workdir / "theme.json", {"theme": args.theme, "mtg_art": bool(mtg)})

    pages = 0
    if args.theme in ROSTER_THEMES:
        pages = write_agent_pages(workdir, manifest, mtg, lockup, company, generated_on, hero_svg)

    print(f"OK page assembled theme={args.theme} ({len(html)} bytes), "
          f"{pages} agent profile pages -> index.html")
    return 0


if __name__ == "__main__":
    sys.exit(main())
