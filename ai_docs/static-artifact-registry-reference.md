# Existing static artifact registry reference

- fetched_at: `2026-06-11T19:21:44Z`
- source: local repo inspection under `/Users/greg/repos/gb-automation-landing-worktrees/t_13735678/public`
- brand reference: `/Users/greg/repos/gbautomation/second-brain/systems/brand/gbauto-brand-tokens.md`

## Registry roots observed

- `public/artifacts/manifest.json` — artifact delivery manifest.
- `public/artifacts/<client>/<artifact-id>/<filename>` — generated artifact files.
- `public/portfolio/apps-registry.json` — app gallery registry.
- `public/portfolio/artifacts-feed.json` — portfolio artifact feed.
- `public/portfolio/portfolio.json`, `gbautomation-projects.json`, `revstar-projects.json`, `claude-code-projects.json` — portfolio/project indexes.
- `public/prds/prds-manifest.json` — PRD index.
- `public/prds/*.html` — static rendered PRDs.
- `public/tac/catalog.json` — TAC catalog output when generated.

## `public/artifacts/manifest.json` shape observed

```json
{
  "schema_version": 1,
  "updated_at": "2026-05-21T20:41:39Z",
  "artifacts": [
    {
      "artifact_id": "brief-bdfbfda44fbb",
      "client": "acme-co",
      "filename": "brief.html",
      "mime_type": "text/html; charset=utf-8",
      "asset_url": "/artifacts/acme-co/brief-bdfbfda44fbb/brief.html",
      "web_route": "/artifacts/acme-co/brief-bdfbfda44fbb",
      "sha256": "...",
      "size": 14,
      "created_at": "2026-05-21T20:41:39Z",
      "archived": false,
      "drive": { "enabled": false, "status": "dry-run" }
    }
  ]
}
```

## Portal data contract mapping

Map existing registry fields into the PRD's `PortalArtifact` contract:

- `id` <= `artifact_id`
- `tenant` <= `client`
- `kind` <= `artifact_kind` if present, else infer from `type`/`mime_type`
- `title` <= filename/title metadata from source artifact; avoid inventing named-client proof
- `href` <= `web_route` for app route, or `asset_url` for direct file download
- `createdAt` <= `created_at`
- `status` <= `delivered` for published artifact entries unless a future manifest field says otherwise

## Rules for sprint builders

- Treat static JSON as the v1 data lake; prefer fetch-by-URL over bundling generated registries.
- Keep files in `public` when filenames and URLs must remain stable.
- Include `sha256`, `size`, and `created_at` in UI detail pages when present.
- Do not surface placeholder clients like `acme-co` as real client proof on public marketing pages.
- Named-client or numeric claims need citations from second-brain or source manifests; otherwise rewrite as capability language.
- Preserve root-absolute URLs so Vite dev, Vite build, and Netlify deploys resolve consistently.
