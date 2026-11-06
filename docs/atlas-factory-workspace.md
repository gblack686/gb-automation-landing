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
search index, account capability, live feature flag or runtime owner is introduced.

The canonical template is in GBAutomation. A website deployment alone does not
update versioned private documents. Release must bind both sources and preserve
the previous object versions for rollback.
