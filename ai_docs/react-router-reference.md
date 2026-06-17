# React Router reference for portal sprint

fetched_at: 2026-06-11T19:23:58Z
scope: P0/P1 route and route-protection decisions for the five-day GBAutomation portal sprint.
repo context: package.json uses `react-router-dom@^7.9.5`; current app uses declarative `<BrowserRouter>`, `<Routes>`, `<Route>`, `<Navigate>`, and `useLocation`.

## Sources fetched

- https://reactrouter.com/home — latest docs header shows React Router `7.17.0`, explains Framework/Data/Declarative modes and v6-to-v7 upgrade path.
- https://reactrouter.com/start/data/routing — Data mode route objects with `createBrowserRouter`, nested routes, layouts, loaders, params.
- https://reactrouter.com/start/data/route-object — route object APIs, loaders, actions, middleware, `handle`, error boundaries.
- https://reactrouter.com/api/utils/redirect — `redirect()` Response utility for loaders/actions; warns to validate user-supplied external redirects.
- https://reactrouter.com/api/declarative-routers/BrowserRouter — Declarative mode `BrowserRouter` using browser History API.

## Current-doc facts that matter this week

- React Router v7 supports three modes: Declarative, Data, and Framework.
- The existing repo is in Declarative mode via `<BrowserRouter>` and `<Routes>`.
- `BrowserRouter` is a declarative router backed by the browser History API.
- Data mode route objects use `createBrowserRouter` and support route-level `loader`, `action`, middleware, and `redirect` responses.
- `redirect()` is for loaders/actions, defaults to 302, and should validate user-controlled destination URLs.
- Nested routes render child routes through `<Outlet />`; route groups can represent public, client, teammate, and ops surfaces.
- Dynamic segments provide route params such as `/clients/:tenant` or `/artifacts/:client/:artifactId`.

## Minimal examples

### Current sprint-safe declarative routes

```jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

function RequireAuth({ children }) {
  const location = useLocation();
  const isAuthed = Boolean(window.__PORTAL_USER__);
  if (!isAuthed) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/prds" element={<PRDIndex />} />
        <Route path="/clients/:tenant/*" element={<RequireAuth><ClientPortal /></RequireAuth>} />
        <Route path="/ops/*" element={<RequireAuth><OpsRoutes /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Nested client portal routes

```jsx
import { Routes, Route, Outlet } from 'react-router-dom';

function ClientLayout() {
  return (
    <ClientPortalLayout>
      <Outlet />
    </ClientPortalLayout>
  );
}

export default function ClientRoutes() {
  return (
    <Routes>
      <Route element={<ClientLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/:reportId" element={<ReportDetailPage />} />
        <Route path="artifacts/:artifactId" element={<ArtifactDetailPage />} />
      </Route>
    </Routes>
  );
}
```

### Future Data mode auth redirect

```jsx
import { createBrowserRouter, redirect } from 'react-router-dom';

async function requireUser() {
  const user = await getUserFromSession();
  if (!user) throw redirect('/login');
  return user;
}

export const router = createBrowserRouter([
  { path: '/', Component: Home },
  {
    path: '/clients/:tenant',
    loader: requireUser,
    Component: ClientPortal,
  },
]);
```

## V1 sprint recommendation

P0:
- Keep Declarative mode for the five-day sprint; the app already uses it and the goal is route inventory plus auth gating, not a router migration.
- Preserve current top-level route classes: public, gated app gallery/artifacts, tenant client portals, and ops/build surfaces.
- Keep `RequireAuth` as the single route-boundary component and pass role/tenant requirements into it from routes.
- Keep client and ops subroutes isolated in `src/clients/*/routes.jsx` and `src/ops/routes.jsx`.
- Add a catch-all / 404 route if route QA needs proof that unknown private paths do not leak content.

P1:
- Consider Data mode only after the sprint if loaders/middleware become necessary for tenant data preloading.
- If Data mode is adopted later, move auth redirects to loaders and validate all `next`/return URL inputs.
- Maintain a generated route inventory for validators instead of relying on manual screenshots.

## Pitfalls

- Do not mix a half-migrated Data router with the existing `BrowserRouter` tree during the sprint; duplicated router roots cause confusing navigation bugs.
- `Navigate` is fine for current declarative route gates, but it executes after render; keep protected page content behind a loading state while auth is checked.
- Validate `next` params before redirecting after login; React Router docs note `redirect` accepts absolute URLs, so user-controlled redirects can become open redirects.
- Nested routes need `<Outlet />`; missing outlets make child routes match but render nothing.
- Static hosts must rewrite deep links to `index.html`; otherwise `/clients/gbautomation/reports` will 404 on hard refresh before React Router runs.
