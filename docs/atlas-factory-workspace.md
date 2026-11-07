# Atlas presentation with Factory Game workflows

Where: `/bench/:agentId` reuses `ForgeAtlas`, the private document renderer in
GBAutomation and the existing Cognito boundary. `/atlas/:agentId` remains valid.
Source branch: `codex/atlas-factory-milestones-20261105`. The private seven-milestone
plan is `second-brain/plans/2026-11-05-atlas-factory-workspace/` in GBAutomation.

Done means: all original windows remain available; exact expert/resource links
survive reload; expert-owned saved UIs open in Atlas windows using verified
private artifacts. Negative cases include foreign owner, mixed-owner catalog,
stale response after switching expert, malformed navigation, altered artifact,
sign-out and unavailable service. Run the workspace unit tests, existing backend
tests, Vite build and the real-document browser check. Source acceptance is
separate from deployment and real mobile/PC-off acceptance.

Out of scope: new runtime owners, schedules, paid services, arbitrary proxies,
public private data, unreviewed activation, automatic promotion or bypassing
protected checks. Existing cloud feature flags stay unchanged.

The document receives only owner-filtered catalog rows and verified artifact
HTML. The host keeps account tokens and signed URLs. Nested result frames use
`sandbox="allow-scripts"`, no host channel and an offline CSP. Fleet-wide resource
browsing stays in the existing explicit gallery; expert windows pin their owner.
Search is explicit and deterministic. These additions do not establish the later
task/trace/target joins, outcome scorecards or live cutover acceptance.

The resources window's **Entire workspace** filter combines the existing private
resource catalog with proposal, session, PR and code readers for the selected
expert. Each source reports available, empty, stale or unavailable. Fixed-source
queries avoid the optional all-source classifier; typing triggers no reads. The
bounded result list shows when more matches may exist. Resources open their exact
verified app window; work results open the corresponding existing window with
their source ID displayed in the search result. Exact work-record focus remains
future work. A source response for another expert or query is rejected.

Home can supply exact Bench resource links when its separate presentation setting
is enabled. Unknown experts do not fall back to another expert. No additional
search index, account capability or runtime owner is introduced by search.

The **Factory Goals & Results** window reads `forge-factory-workspace.v1` through
the separately disabled `FORGE_FACTORY_ENABLED` capability. After operator and
registered-expert authorization, `factorySnapshot` reads only
`gbautomation/<agent_id>/factory-workspace.json` in the existing private bucket.
Object version, size and SHA-256 metadata are checked before exact expert and
configuration binding, field bounds, coverage and target-state validation.
No browser-supplied storage key or remote URL is accepted.
The enabled deployment grants only `s3:GetObject` and `s3:GetObjectVersion` for
the fixed `gbautomation/*/factory-workspace.json` pattern. Disabled deployments
add no Factory storage grant. This is a prepared template change, not a live
permission change.

The GBAutomation producer is
`resources/skills/factory-game/scripts/build_workspace_snapshot.py`. It verifies
the canonical season ledger and the hashes of any supplied frozen game inputs;
it does not rescore or write live game state. Missing inputs stay unavailable.
Shared game-seat totals are labeled separately from owned goals and quests.
Goal progress requires scored acceptance receipts. Proposed targets remain
proposed, missing numeric measurements remain pending, and failed targets are
retained. XP is a game receipt total, not an effectiveness or release gate.

Refresh is manual and failure retains the original labeled capture. The
six-hour freshness label describes the saved capture, not an unattended
acceptance run. Exact output/trace/target joins remain separate work. Browser
validation checks clipping and viewport visibility in addition to text presence,
including the host's initially zero-size embedded frame and mobile deep links.

Before activation, publish configuration-bound snapshots and matching rendered
documents as private versioned objects, bind their digests and versions to the
reviewed paired sources, then review the exact `FORGE_FACTORY_ENABLED` change.
Rollback disables that capability and restores the previous paired document,
snapshot and website versions. Preserve all evidence and game state. No new
owner, schedule or scoring policy is part of this capability.

The canonical template is in GBAutomation. A website deployment alone does not
update versioned private documents. Release must bind both sources and preserve
the previous object versions for rollback.
