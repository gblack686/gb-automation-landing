# Portal route and source matrix

This matrix defines the route/source boundary for the public website, client portal, teammate cockpit, and ops dashboard in `gblack686/gb-automation-landing`.

## Boundary rule

- React routes live under `src/`.
- Static public read models live under `public/`.
- Generated public JSON is never the source of truth.
- Generated portal manifests must carry `generated` or `source` metadata.
- `dist/` is deploy output only and must not be hand-edited.

## Route/source matrix

| Surface | Routes | React owner | Public data | Source of truth | Generator / validator |
| --- | --- | --- | --- | --- | --- |
| Public website | `/`, `/login`, `/prds`, `/prds/:slug`, `/apps`, `/artifacts` | `src/App.jsx`, `src/pages/`, `src/components/` | `public/prds/`, `public/portfolio/`, `public/artifacts/manifest.json` | GBAutomation PRDs, portfolio source records, artifact registry records | `npm run build`, `scripts/validate-generated-manifests.mjs` |
| Client portal | `/clients/:clientSlug/*`, `/clients/gbautomation/*`, `/clients/jid5274/*` | `src/clients/`, `src/clients/registry/`, `src/clients/shared/` | `public/clients/<slug>/*.json` | `src/portal/portalManifestRecords.json`, tenant repos, tenant registry | `npm run portal:manifests`, `npm run test:generated-manifests`, `npm run test:tenant` |
| Teammate build cockpit | `/team`, `/team/builds`, `/team/builds/:taskId`, `/team/prds`, `/team/artifacts`, `/team/dispatch` | `src/team/`, `src/routes/routeManifest.js` | `public/team/cockpit.json` | GBAutomation build receipts, TAC plans, release artifacts | `src/routes/routeManifest.js` route group check in `test:generated-manifests` |
| Ops dashboard | `/ops`, `/ops/systems`, `/ops/runs`, `/ops/kanban`, `/ops/data` | `src/ops/`, `src/ops/routes.jsx` | `public/ops/hermes-kanban.json` | Hermes Kanban DB, safe Supabase views, Langfuse trace receipts | `npm run ops:kanban:export`, `npm run test:observability`, `npm run test:generated-manifests` |

## Generated-file contract

Client portal manifests are generated from `src/portal/portalManifestRecords.json` by `scripts/generate-portal-manifests.mjs`. The generator writes only `public/clients/...` JSON and adds this metadata block:

```json
{
  "generated": {
    "generator": "scripts/generate-portal-manifests.mjs",
    "source": "src/portal/portalManifestRecords.json",
    "generated_at": "<ISO timestamp>",
    "mode": "generated-read-only"
  }
}
```

Ops manifests use the existing `source` block from `scripts/export-hermes-kanban.mjs` with `mode: sanitized-read-only`.

Artifact manifests must retain source or registry path metadata per artifact. The public manifest is a read model; artifact source records stay in the registry/client source trees.

## Local validation

```bash
npm run portal:manifests
npm run build
npm run test:tenant
npm run test:observability
```

`npm run test:tenant` invokes the generated-manifest validator so route/source drift fails the standard tenant portal gate.
