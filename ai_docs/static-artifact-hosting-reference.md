# Static artifact hosting note for portal data and deliverables

Fetched at: 2026-06-11T19:24:55Z

## Source URLs fetched

- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages — GitHub Pages overview for static HTML/CSS/JS hosting from a repository.
- https://vite.dev/guide/static-deploy.md — Vite static deployment model; `dist` can be deployed to static hosts.
- https://docs.netlify.com/deploy/deploy-overview.md — Netlify static deploy and URL model.

## Repo context

Current static surfaces:

- `public/artifacts/manifest.json`
- `public/artifacts/<client>/...`
- `public/portfolio/apps-registry.json`
- `public/prds/...`
- `src/clients/*/data/portalData.js`

These are useful for deterministic client portal demos, but everything under `public/` becomes a static public asset in Vite's `dist` output.

## Repo-relevant pattern

Use static manifests for public or redacted proof:

```json
{
  "client": "gbautomation",
  "generated_at": "2026-06-11T19:24:55Z",
  "artifacts": [
    {
      "id": "portal-sprint-plan",
      "title": "Five-day portal sprint plan",
      "href": "/prds/five-day-website-client-portal-sprint.html",
      "visibility": "public-proof"
    }
  ]
}
```

Use tenant route gating for UX, not secrecy:

```jsx
<Route
  path="/clients/gbautomation/*"
  element={
    <RequireAuth allowedGroups={['tenant-gbautomation']}>
      <GbautomationPortal />
    </RequireAuth>
  }
/>
```

If a deliverable is private, do not publish the raw file under `public/`. Use one of these instead:

- an authenticated API that checks Cognito identity and returns a signed URL,
- a private object store with short-lived signed URLs,
- a redacted/static summary in `public/` plus private delivery elsewhere.

## GitHub/static hosting relevance

GitHub Pages is good for public static proof pages or open documentation because it serves HTML, CSS, and JavaScript directly from a repository. It is not a fit for private client deliverables unless the content is safe to be public or the repository/hosting plan and access model explicitly satisfy the client's privacy requirements.

Netlify is the better primary host for this app because it already supports:

- deploy previews,
- branch deploys,
- custom domains,
- SPA fallback redirects,
- production promotion workflow.

GitHub remains useful for:

- source-controlled public artifacts,
- immutable release tags,
- GitHub Actions build receipts,
- backing repository history for static proof.

## Implementer guidance

- Classify each artifact before adding it to `public/`: `public-proof`, `client-private`, `internal-only`, or `demo-redacted`.
- Keep manifests deterministic and small; the React portal can render from static JSON without inventing live proof.
- Store only redacted summaries in public manifests.
- Put raw private deliverables behind a server/API/storage layer, not Vite public assets.
- Include `generated_at`, `source_path`, and `visibility` in each manifest record.
- Prefer relative paths for static files inside the site, e.g. `/artifacts/manifest.json`.

## Pitfalls

- React auth does not hide files already emitted to `dist`.
- Netlify and GitHub Pages can both expose static files to anyone with the URL.
- Obscure URLs are not access control.
- Client names in filenames can leak relationship metadata even when document contents are redacted.
- Search engines and social link unfurlers can cache public artifact pages.
- Vite env vars with `VITE_` prefixes are browser-visible; do not use them for private storage credentials.

## Recommendation

Use static hosting only for public proof, redacted demos, and deterministic portal scaffolding. For the production client portal, keep `public/` artifact records sanitized and plan a signed-URL or authenticated API layer before adding private deliverables.
