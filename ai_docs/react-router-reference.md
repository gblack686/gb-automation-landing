# React Router reference for GBAuto portal

- fetched_at: `2026-06-11T19:21:44Z`
- sources:
  - https://reactrouter.com/start/library/routing
  - https://reactrouter.com/api/declarative-routers/BrowserRouter
- version observed in docs: React Router latest `7.17.0`
- repo package observed: `react-router-dom@^7.9.5`

## Current repo mode

This repo uses declarative routing:

```jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
```

That matches the React Router docs for Declarative mode: render `<BrowserRouter>`, then `<Routes>` and `<Route>` elements.

## Sprint-relevant route patterns

- Public website routes should stay ungated: `/`, `/login`, `/prds`, `/prds/:slug`.
- Client routes should remain nested behind a tenant-aware guard: `/clients/gbautomation/*`, `/clients/jid5274/*`.
- Ops/admin routes should remain behind stricter groups/emails: `/ops/*`.
- Dynamic segments use `:param`, e.g. `/artifacts/:client/:artifactId`.
- Layout routes without a `path` are useful for shared chrome without changing URLs.
- Nested tenant apps should render child pages through route modules and, if nested within a layout component, use `<Outlet />`.

## Minimal route inventory target

```jsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/apps" element={<RequireAuth><Apps /></RequireAuth>} />
  <Route path="/artifacts" element={<RequireAuth><Artifacts /></RequireAuth>} />
  <Route path="/artifacts/:client/:artifactId" element={<RequireAuth><ArtifactView /></RequireAuth>} />
  <Route path="/prds" element={<PRDIndex />} />
  <Route path="/prds/:slug" element={<PRDView />} />
  <Route path="/clients/:tenant/*" element={<RequireAuth><TenantPortal /></RequireAuth>} />
  <Route path="/ops/*" element={<RequireAuth><OpsRoutes /></RequireAuth>} />
</Routes>
```

## Pitfalls

- Index routes cannot have children; use a layout route when a default child needs descendants.
- Duplicate dynamic segment names are overwritten in `params`; keep names unique.
- React Router declarative docs import from `react-router`; this repo imports from `react-router-dom`, which is expected for DOM apps.
- If deploying as static files to Netlify, ensure SPA fallback rewrites all app routes to `/index.html`.
