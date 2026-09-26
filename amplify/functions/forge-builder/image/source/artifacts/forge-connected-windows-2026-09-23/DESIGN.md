# Forge connected window standard

The File Commands design and its visual direction were approved by Greg in the
follow-up to the 2026-09-23 study. Greg requested the same preview/full-screen
process for the remaining windows, adding adjacent foreign-key data, filters,
dropdowns, and connections to the schema/spine. This local collection implements
that design exploration for all 13 windows. It is not a runtime integration.

## Shared visual and interaction grammar

- Compact preview: recognizable visual, useful current state, one next action.
- Full screen: purpose-built working area plus Connected records. A linked record
  opens the exact item; Back restores the originating view, selection, and filters.
- Studio is the selected default. The inherited cream, terracotta, Inter, and
  Newsreader theme reuses local GB assets and fonts. Dark mode uses the existing
  measured palette from the September 18 Forge preview.
- Shared positions: category icon, concise title, status icon + label, compact
  metadata, primary action. Four-pixel spacing rhythm and 12px panel corners.
- Global workstream filtering uses explicit fixture memberships corresponding to
  PRD/workstream context. Shared skill/config/command catalogs remain visible.
  Local filters are specific to each window. Linked navigation clears only the
  destination filters and updates an incompatible workstream to preserve the target.
- Records have one identity and one value across the application. Simulation
  changes update every connected view, rather than independent screen copies.
- Selection, drafts, review notes, local sample state, filters, and style persist
  in browser storage. An unfinished simulation is marked stopped on page reload.
- Responsive layouts stack the work area and connected records; mobile catalogs
  use horizontal session/run lists. Native controls, visible focus, keyboard
  access, dialog focus containment, and reduced motion remain supported.

## Window treatments

| Window | Preview visual | Full-screen work | Filters / selectors | Adjacent data |
| --- | --- | --- | --- | --- |
| Skills Library | Input → skill → output flow | Capability gallery and binding detail | Category, state, search | Expert routes, configurations, runs, outputs |
| Justfile Commands | Quick commands and latest result | Recipe, input, execution flow, terminal | Recipe category, search | Shared run console and generated result |
| Agent Presence | Configured avatar, activity state, counts | Runtime identity and session cards | Session state and search | Expert, profile, skills, sessions, config |
| Conversation | Latest response and linked output | Session browser, context ribbon, messages, composer | Session state, search, session selection | Messages, sources, skills, outputs, tasks |
| Working Canvas | Actual miniature document | Document, version comparison, source lineage, notes | Document/version, type, search | Artifact family, producing run, sources, task |
| Proposals | Evidence-to-review progress | Scoped proposal cards, impact, evidence and blocker | State, workflow route, search | Source event, producer, task, gate, config/output |
| Setup & Quality Checks | Readiness ring and attention items | Grouped check evidence and simulated recheck | State, category, search | Profile, verification run, source, configuration |
| Expert Configuration | Model/limits/policy/binding tiles | Editable draft, source-preserving diff creation | Model and bounded limits | Typed configuration, skills, proposal, review gate |
| Second Brain | Sources/context/outputs connection map | Source gallery and local relationship map | Type, freshness, search | Sessions, source events, proposals, artifacts |
| Tasks & Workstream | Miniature work board | Board, dependency view, evidence and blocker | State, owner, search, Board/Dependencies | Proposal, prerequisite task, gate, artifact |
| Artifacts | Document/data thumbnails | Versioned gallery, lineage and file metadata | Format, review, version, search | Source, producing run, task, storage copy |
| Run Console | Duration bars and terminal | Run history, stdout/stderr, stop/rerun, downloads | State, skill category, stream, demo outcome | Parent run, skill, session, task, artifacts |
| Changes & Approvals | Exact before/after | Version-specific diff and local review timeline | State, change selector, search | Proposal, gate intent, event, artifact/config, task |

## Variations

| Treatment | Difference |
| --- | --- |
| Studio, selected | Calm cream surfaces, even spacing, Inter hierarchy |
| Editorial | Newsreader window titles and roomier cards |
| Precision | Crisp corners, uppercase titles and stronger rules |
| Glass | Translucent surfaces, softer depth and larger corners |
| Contrast | Strong header rule and selected-card accent rail |

Deep links carry `window`, `view`, `record`, `scope`, `design`, and `mode`.
For example: `index.html?window=artifacts&view=full&record=art_brief_v2`.
The sidebar opens full windows; All windows restores the visual collection.

## Data honesty

The inspector distinguishes committed FKs, conditionally installed FKs, soft
references, typed configuration references, and proposed UI associations.
The page reads local fixtures shaped from the committed contracts. It never
connects to Supabase or a runtime. Sample joins are validated, but live database
deployment/constraints are not claimed. See `CONTRACT.md` for the exact mapping.
Approving a demo review updates sample gate/proposal/task/artifact presentation;
it creates no authorization event or executable credential and applies no runtime
configuration. Live activation remains pending after a simulated check run.

Brand sources: `resources/skills/get-gbauto-theme/SKILL.md`,
`second-brain/systems/brand/gbauto-brand-tokens.md`, and the original preview's
`landing-dark-reference.json`. The avatar is the existing configured artwork,
credited in the original preview; no new artwork or identity was invented.
