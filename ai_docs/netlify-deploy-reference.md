# Netlify + Vite deploy reference for the client portal

Fetched at: 2026-06-11T19:24:55Z

## Source URLs fetched

- https://vite.dev/guide/static-deploy.md — Vite static deployment guide, including Netlify.
- https://vite.dev/guide/build.md — Vite production build guide.
- https://docs.netlify.com/deploy/deploy-overview.md — Netlify deploy overview, deploy types, branch deploy URLs, aliases.
- https://docs.netlify.com/deploy/deploy-types/deploy-previews.md — Netlify Deploy Previews.
- https://docs.netlify.com/deploy/deploy-overview/#deploy-urls-and-aliases — deploy URL and alias section.

## Repo context

Current scripts in `package.json`:

```json
{
  "build": "vite build",
  "preview": "vite preview"
}
```

Current Vite config:

```js
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false
  }
});
```

Expected Netlify settings for this repo:

- Build command: `npm run build`
- Publish directory: `dist`
- Production branch: the branch connected to `gbautomation.xyz`
- Pull request previews: Netlify Deploy Previews
- Branch previews/aliases: `branch-name--site-name.netlify.app`

## Repo-relevant `netlify.toml` pattern

Add only if the project does not already configure equivalent settings in the Netlify UI:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

The redirect is needed for BrowserRouter deep links such as:

- `/clients/gbautomation`
- `/clients/gbautomation/reports/<reportId>`
- `/ops/runs`
- `/artifacts/<client>/<artifactId>`

Without it, direct loads and refreshes on nested routes can return 404 even when in-app navigation works.

## Deploy URL model

Netlify deploys generally expose these URL shapes:

- Production URL: custom domain or `site-name.netlify.app`.
- Unique deploy permalink: immutable deploy-specific URL.
- Deploy Preview: generated for pull/merge requests and agent runs that change the site/app.
- Branch deploy: `branch-name--site-name.netlify.app` for non-production branch deploys when enabled.
- Alias URLs: stable deploy aliases useful for sharing QA links.

For sprint proof, capture both:

- the production/custom-domain URL after promotion, and
- the Deploy Preview or branch deploy URL used for QA.

## Vite production build guidance

- `vite build` emits production static assets to `dist` by default.
- `vite preview` serves the built `dist` output locally for smoke testing.
- If deploying under a subpath, configure Vite `base`; for `gbautomation.xyz` root hosting, leave `base` as the default `/`.
- Vite's public assets are copied as static files and are not route-protected by React.
- New deploys can invalidate old dynamic import chunks; Vite documents a `vite:preloadError` event for failed dynamic imports if chunk skew becomes user-visible.

## Implementer guidance

- Before a Netlify preview, run `npm run build` locally.
- Add the SPA fallback redirect before testing deep links.
- Treat `public/artifacts`, `public/prds`, and `public/portfolio` as public static assets.
- Do not put private client deliverables in `public/` unless public-by-design.
- If deploy previews use placeholder Amplify outputs, document that auth runtime proof is blocked until real Cognito outputs are present.
- Capture deploy proof in a release receipt: build command, publish directory, preview URL, tested routes, and timestamp.

## Pitfalls

- Netlify will serve static files in `dist` regardless of React auth gates.
- BrowserRouter needs Netlify redirects; HashRouter would avoid server fallback but is not recommended for this production portal URL shape.
- Branch names with slashes or uppercase characters can produce awkward deploy URLs; prefer clean branch names for shareable aliases.
- Deploy Previews are not production. Cognito callback/sign-out URLs may need the preview URL allowlisted if the login flow is exercised there.
- Vite `base` misconfiguration can break assets on deploy while local dev still works.
- `vite preview` is a local static preview server, not a production server.

## Recommendation

Use Netlify Deploy Previews for every portal PR, add a `netlify.toml` SPA fallback if missing, and only promote after testing `/`, `/login`, `/clients/gbautomation`, and at least one nested client detail URL directly from the preview address.
