# React Router route boundary reference for the client portal

Fetched at: 2026-06-11T19:24:55Z

## Source URLs fetched

- https://reactrouter.com/start/declarative/routing.md — declarative routing docs for `<BrowserRouter>`, `<Routes>`, and `<Route>`.
- https://reactrouter.com/api/components/Routes.md — `Routes` component API reference.
- https://reactrouter.com/api/components/Route.md — `Route` component API reference.
- https://reactrouter.com/start/data/routing.md — route-object and nested route docs, useful if the repo later migrates to `createBrowserRouter`.
- https://reactrouter.com/how-to/security.md — security guidance; useful context, but not a full auth recipe for this app shape.

## Repo context

Current dependency in `package.json`:

- `react-router-dom` `^7.9.5`

Current route shape:

- `src/App.jsx` uses declarative routes: `<BrowserRouter>`, `<Routes>`, `<Route>`.
- Public routes: `/`, `/login`, `/prds`, `/prds/:slug`.
- Gated routes: `/plan`, `/apps`, `/artifacts`, `/blockers`, `/ops/*`, `/clients/:tenant/*` variants.
- Tenant route modules already exist under `src/clients/gbautomation/routes.jsx` and `src/clients/jid5274/routes.jsx`.
- `RequireAuth` wraps route elements rather than nesting under a layout route.

## Repo-relevant pattern

Current-compatible declarative route boundary:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/clients/gbautomation/*"
          element={
            <RequireAuth
              allowedGroups={['tenant-gbautomation']}
              allowedEmails={['gblack686@gmail.com']}
            >
              <GbautomationPortal />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

Recommended tenant module shape:

```jsx
// src/clients/gbautomation/routes.jsx
import { Routes, Route, Navigate } from 'react-router-dom';

export default function GbautomationPortal() {
  return (
    <Routes>
      <Route index element={<DashboardPage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="reports/:reportId" element={<ReportDetailPage />} />
      <Route path="artifacts" element={<ArtifactsPage />} />
      <Route path="artifacts/:artifactId" element={<ArtifactDetailPage />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
```

Optional nested layout route if the portal route tree gets larger:

```jsx
<Route
  path="/clients/gbautomation/*"
  element={
    <RequireAuth allowedGroups={['tenant-gbautomation']}>
      <ClientPortalLayout tenant="gbautomation" />
    </RequireAuth>
  }
>
  {/* only use this form if the repo moves to a shared Outlet-based layout */}
</Route>
```

## Implementer guidance

- Keep public and private routes visibly separated in `src/App.jsx`.
- Use `/*` at the app-level boundary for route modules that render their own nested `<Routes>`.
- Use `index` routes for tenant dashboards instead of duplicating `/clients/tenant` and `/clients/tenant/dashboard` unless product needs both.
- Use `:param` route params for artifact/report detail pages; validate IDs against the tenant manifest before rendering.
- Keep tenant route modules tenant-specific during this sprint. Shared page components are fine, but route ownership should stay explicit.
- Preserve `location.pathname + location.search` when redirecting to login.

## Pitfalls

- Do not mix declarative `<Routes>` and data-router loaders/actions in the same route boundary unless the app is intentionally migrated to `createBrowserRouter`.
- Client-side protected routes do not protect static files in `public/`. They only decide what React renders after the JS loads.
- A missing trailing `/*` on parent paths will break nested route modules.
- A catch-all route inside a tenant module should not navigate outside the tenant boundary.
- `Navigate replace` is preferred for auth redirects and catch-alls to avoid confusing back-button loops.
- If using Vite + BrowserRouter on Netlify, add SPA fallback redirects so deep links like `/clients/gbautomation/reports/foo` serve `index.html`.

## Recommendation

Keep the current declarative router for the five-day sprint. Add or preserve a single tenant boundary per client under `/clients/<tenant>/*`, wrap that boundary in `RequireAuth`, and keep nested routes inside each tenant module so auth, navigation, and data manifests stay tenant-scoped.
