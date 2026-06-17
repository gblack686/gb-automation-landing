# Static artifact hosting reference for portal sprint

fetched_at: 2026-06-11T19:23:58Z
scope: P0/P1 static artifact, Vite public directory, GitHub Pages/Actions artifacts, and release-asset decisions for the five-day portal sprint.
repo context: PRD names static JSON registries under `public/artifacts`, `public/portfolio`, and `public/prds` as the v1 data lake.

## Sources fetched

- https://vite.dev/guide/build — production build behavior, static bundle output, `base`, `import.meta.env.BASE_URL`, chunk preload errors, `Cache-Control: no-cache` HTML guidance.
- https://vite.dev/guide/static-deploy — static deployment, default `dist`, local preview, GitHub Pages base-path notes and Actions workflow shape.
- https://vite.dev/config/build-options — `build.outDir`, `build.copyPublicDir`, `build.assetsDir`, `build.manifest`, and related build options.
- https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages — GitHub Pages hosts static HTML/CSS/JS from a repository and publishes a website.
- https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-what-your-workflow-does/storing-and-sharing-data-from-a-workflow — Actions workflow artifacts for build outputs, reports, retention, and job handoff.
- https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases — Releases package software and downloadable release assets; per-file asset limit under 2 GiB; up to 1000 assets per release.

## Current-doc facts that matter this week

- `vite build` uses `<root>/index.html` as the default entry and produces a static bundle suitable for static hosting.
- Vite's default build output is `dist` unless `build.outDir` changes it.
- Vite copies `publicDir` into the build output when `build.copyPublicDir` is true; current default is true.
- Vite only syntax-transforms by default and does not automatically add arbitrary browser polyfills.
- If the site is deployed under a nested path, configure `base`; for custom root domains, default `/` is appropriate.
- Use `import.meta.env.BASE_URL` exactly as written for runtime URLs that depend on the deploy base.
- Vite warns about deleted chunks after redeploys; set `Cache-Control: no-cache` on HTML to avoid stale HTML referencing removed assets.
- GitHub Pages is static hosting for HTML/CSS/JS from a repository, optionally with a build process.
- GitHub Actions artifacts are useful for preserving build output, coverage, screenshots, and release receipts after workflows finish.
- GitHub Releases are better for durable downloadable bundles; release assets must each be under 2 GiB and there can be up to 1000 assets per release.

## Minimal examples

### Static registry under `public/`

```text
public/
  artifacts/
    manifest.json
    gbautomation/
      portal-day-1-receipt.json
  portfolio/
    apps-registry.json
  prds/
    prds-manifest.json
```

Vite copies those files to:

```text
dist/artifacts/manifest.json
dist/portfolio/apps-registry.json
dist/prds/prds-manifest.json
```

### Reading static JSON from React

```js
const base = import.meta.env.BASE_URL;

export async function loadArtifactManifest() {
  const res = await fetch(`${base}artifacts/manifest.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`artifact manifest failed: ${res.status}`);
  return res.json();
}
```

### Vite base for nested GitHub Pages project site

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/gb-automation-landing/',
  plugins: [react()],
});
```

### Upload static proof artifacts in GitHub Actions

```yaml
- name: Build
  run: npm run build

- name: Archive portal proof
  uses: actions/upload-artifact@v4
  with:
    name: portal-proof
    path: |
      dist
      screenshots
      release-receipt.json
    retention-days: 14
```

### GitHub Pages deploy shape for Vite

```yaml
permissions:
  contents: read
  pages: write
  id-token: write

steps:
  - uses: actions/checkout@v6
  - uses: actions/setup-node@v6
    with:
      node-version: lts/*
      cache: npm
  - run: npm ci
  - run: npm run build
  - uses: actions/configure-pages@v6
  - uses: actions/upload-pages-artifact@v5
    with:
      path: ./dist
  - uses: actions/deploy-pages@v5
```

## V1 sprint recommendation

P0:
- Keep static portal data in `public/artifacts`, `public/portfolio`, and `public/prds` for Day 1-Day 5.
- Use static JSON registries as the source of truth for portal cards and artifact lists during the sprint.
- Fetch static assets with `import.meta.env.BASE_URL` so Netlify root deploys and any future nested deploys keep working.
- Put release receipts, screenshots, and build proof either in the repo `public/artifacts/...` for user-facing portal access or in GitHub Actions artifacts for CI-only proof.
- Prefer Netlify for the live portal; use GitHub Actions artifacts for internal proof bundles, not client-facing links.

P1:
- If a durable downloadable package is needed, attach it to a GitHub Release rather than relying on short-lived CI artifacts.
- If using GitHub Pages as a fallback host, configure `base` correctly for root vs project pages.
- Add cache headers for HTML (`no-cache`) and longer-lived hashed assets when deploy headers are introduced.

## Pitfalls

- Do not put secrets, tenant-private data, Cognito tokens, or unpublished client PII in `public/`; it is copied into `dist` and publicly fetchable.
- Do not treat GitHub Actions artifacts as permanent client delivery; retention can expire and access may require GitHub permissions.
- GitHub Pages project sites require a nested base path; forgetting `base: '/repo/'` breaks JS/CSS asset URLs.
- Vite static assets in `public/` are served at root-relative paths; do not import them as modules unless moved into `src`.
- Stale HTML can reference deleted Vite chunks after deploy; add no-cache HTML headers when Netlify headers are configured.
- Keep artifact manifests deterministic and small; large binary deliverables should be linked as release assets or hosted externally.
