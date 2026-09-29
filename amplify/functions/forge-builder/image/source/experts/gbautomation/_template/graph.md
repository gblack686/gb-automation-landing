---
description: Query the second-brain knowledge graph for {{EXPERT_TITLE}} — neighbors, similarity, hot entities, orphans, and graph freshness — without mutating graph state.
allowed-tools: Read, Glob, Grep, Bash
argument-hint: "[entity | --orphans | --hottest | --freshness]"
type: expert-file
parent: "[[{{EXPERT}}/_{{EXPERT}}]]"
file-type: command
command-name: "graph"
date: 2026-07-27
human_reviewed: false
tags: [expert-file, command, graph, graphify, read-only, {{EXPERT}}-expert]
related:
  - "[[{{EXPERT}}/expertise]]"
  - "[[graphify-sync]]"
---

# {{EXPERT_TITLE}} Expert — Graph

> Routes this expert's domain questions at the **graphify knowledge graph** over the
> second brain. Read-only against graph state: it queries, it does not re-graphify.

## Usage

```
/experts:{{EXPERT}}:graph <entity>        # 1-hop neighbors + similar entities
/experts:{{EXPERT}}:graph --orphans       # domain entities nothing references
/experts:{{EXPERT}}:graph --hottest       # most edge activity in the last 7 days
/experts:{{EXPERT}}:graph --freshness     # is the graph stale?
```

## Variables

QUERY: $ARGUMENTS
EXPERT: {{EXPERT}}
GRAPH_CLIENT: gbautomation
EXPERTISE_PATH: experts/{{TREE}}/{{EXPERT}}/expertise.md
SKILL: resources/skills/graphify-sync/SKILL.md
QUERY_API: resources/skills/graphify-sync/scripts/graphify_query.py
SYNC: resources/skills/graphify-sync/scripts/graphify_sync.py
REGISTRY: resources/skills/graphify-sync/config/repos.json

## The two graph surfaces

| Surface | What it is | How to reach it |
|---|---|---|
| **Local graphify artifacts** | `graphify-out/{graph.json, graph.html, GRAPH_REPORT.md, wiki/}` per repo — the rendered graph and its executive summary | Read the files directly |
| **Supabase graph lake** | The edge/entity tables behind `graph_freshness` and the similarity/neighbor queries | `graphify_query.py` (needs `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`) |

`gbautomation` in `REGISTRY` is the **second-brain graph** (`~/repos/gbautomation/second-brain`,
`graphify_mode: code-update`, `auto_update: true`) — it is the graph this route means by
default. Other registry keys are client repos; pass `--client` to reach them.

## Instructions

- **Read-only.** Querying the graph is safe. Re-running graphify is **not** a query — it
  regenerates `graphify-out/` and is a mutation; it belongs to
  `/experts:{{EXPERT}}:plan_build_improve`, never here.
- The graph is scoped by **repo/client**, not by expert. This route narrows a
  repo-wide graph to this expert's domain — say which entities you treated as in-domain
  and why, so the reader can judge the slice.
- Check freshness before trusting a result. A stale graph answers confidently about a
  world that has moved; report the staleness alongside the finding.
- If `graphify_query.py` fails on connectivity (missing `SUPABASE_URL` /
  `SUPABASE_SERVICE_KEY`), say so plainly and **fall back to the local artifacts** —
  do not report an empty result as "nothing found".
- Graph absence is weak evidence. An entity missing from the graph may be un-indexed
  rather than non-existent; verify against the filesystem before asserting it.
- Orphans are a **finding, not a verdict** — an orphan may be legitimately standalone.
  Route real orphan clean-up through `plan`, and note that `knowledge/graph-cache/` is
  machine-owned and exempt from orphan lint.
- Never print secrets, tokens, or connection strings — not even in an error message.

## Workflow

1. Read `EXPERTISE_PATH` to establish what counts as in-domain for this expert.
2. Check freshness first:
   ```bash
   python resources/skills/graphify-sync/scripts/graphify_query.py --freshness --json
   ```
3. Run the query the request calls for:
   ```bash
   # neighbors + similarity for a named entity
   python .../graphify_query.py --neighbors "<entity>" --client gbautomation --top-k 10
   python .../graphify_query.py --similar  "<entity>" --client gbautomation --top-k 10
   # domain health
   python .../graphify_query.py --orphans gbautomation
   python .../graphify_query.py --hottest gbautomation --top-k 10
   ```
4. On connectivity failure, fall back: read `graphify-out/GRAPH_REPORT.md` for the
   executive summary and grep `graph.json` for the entity.
5. Filter the result to this expert's domain; discard out-of-domain noise explicitly
   rather than silently.
6. Cross-check the graph against `expertise.md`: entities the graph knows that the
   model does not are `self-improve` gaps — name them as such.

## Report

| Section | Contents |
|---|---|
| Query | What was asked, and the exact command run. |
| Freshness | Last graphify time and staleness; whether results are trustworthy. |
| Findings | Entities/edges, with weights where the API gives them. |
| Domain slice | What was treated as in-domain, and what was filtered out. |
| Model gaps | Graph knowledge absent from `expertise.md` → feeds `self-improve`. |
| Degraded? | If the query API was unreachable, say so and name the fallback used. |
