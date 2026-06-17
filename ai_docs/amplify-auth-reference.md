# Amplify Auth + Amplify UI reference for portal sprint

fetched_at: 2026-06-11T19:23:58Z
scope: P0/P1 decisions for the five-day GBAutomation website app + client portal sprint.
repo context: package.json uses `aws-amplify@^6.15.7`, `@aws-amplify/ui-react@^6.15.3`, and the app already wraps routes in `<Authenticator.Provider>`.

## Sources fetched

- https://ui.docs.amplify.aws/react/connected-components/authenticator — Authenticator connected component, Amplify UI React v6.
- https://ui.docs.amplify.aws/react/connected-components/authenticator/advanced — `Authenticator.Provider`, `useAuthenticator`, `authStatus`, `route`, selector usage.
- https://docs.amplify.aws/react/build-a-backend/auth/connect-your-frontend/ — Amplify Gen 2 React auth hub; notes Gen 1 maintenance / May 1, 2027 EOL.

## Current-doc facts that matter this week

- Amplify UI React `Authenticator` provides sign-in, sign-up, password reset, sign-out, and authenticated user rendering with low boilerplate.
- For app-wide auth state, render `<Authenticator.Provider>` above route components before using `useAuthenticator`.
- `useAuthenticator` should be used with a selector, e.g. `context => [context.authStatus]`, to prevent unrelated auth state from re-rendering the whole app.
- `authStatus` values are `configuring`, `authenticated`, and `unauthenticated`; it is the simplest UI-level check.
- `route` exposes the current Authenticator flow state; use it for auth-flow UI, not tenant authorization.
- `aws-amplify/auth` APIs such as `getCurrentUser` and `fetchAuthSession` are appropriate for route gates that need Cognito tokens/groups.
- Amplify Gen 1 is in maintenance mode and reaches end of life May 1, 2027; new backend work should avoid deep Gen 1 coupling.

## Minimal examples

### App provider

```jsx
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

export default function Root() {
  return (
    <Authenticator.Provider>
      <App />
    </Authenticator.Provider>
  );
}
```

### Login page using Authenticator

```jsx
import { Authenticator } from '@aws-amplify/ui-react';

export default function Login() {
  return <Authenticator />;
}
```

### Auth status check for route shell

```jsx
import { useAuthenticator } from '@aws-amplify/ui-react';

function AuthStatusGate({ children }) {
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);

  if (authStatus === 'configuring') return <p>Loading...</p>;
  if (authStatus !== 'authenticated') return <Login />;
  return children;
}
```

### Cognito group/email route guard

```jsx
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

export function RequireAuth({ children, allowedGroups = [], allowedEmails = [] }) {
  const [state, setState] = useState('checking');
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then(async () => {
        const session = await fetchAuthSession();
        const groups = session.tokens?.accessToken?.payload?.['cognito:groups'] || [];
        const email = String(session.tokens?.idToken?.payload?.email || '').toLowerCase();
        const ok =
          (!allowedGroups.length && !allowedEmails.length) ||
          allowedGroups.some((group) => groups.includes(group)) ||
          allowedEmails.map((v) => v.toLowerCase()).includes(email);
        if (!cancelled) setState(ok ? 'authed' : 'forbidden');
      })
      .catch(() => { if (!cancelled) setState('unauthed'); });
    return () => { cancelled = true; };
  }, [allowedGroups.join('|'), allowedEmails.join('|'), location.pathname]);

  if (state === 'checking') return <p>Authenticating...</p>;
  if (state === 'unauthed') return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (state === 'forbidden') return <p>Tenant access required.</p>;
  return children;
}
```

## V1 sprint recommendation

P0:
- Keep the existing `Authenticator.Provider` at the app root.
- Keep `/login` public and use `Authenticator` there.
- Gate `/clients/*`, `/ops/*`, `/apps`, and `/artifacts` with `RequireAuth`.
- Authorize tenants with Cognito group claims first: `tenant-gbautomation`, `tenant-jid5274`, plus a short admin/email fallback for Greg during sprint QA.
- Preserve `?next=` redirects so client links can deep-link into deliverables after login.

P1:
- Add a small auth smoke test around anonymous access, signed-in/no-tenant, and tenant group access.
- Add a single tenant-to-group mapping near `tenantConfig.js`; do not scatter group strings across page components.
- Use static portal fixtures until Day 5; avoid write APIs and admin mutations unless a proof receipt demands them.

## Pitfalls

- Do not call `useAuthenticator` outside `<Authenticator.Provider>`; current docs explicitly require the UI component/provider to be rendered first.
- Do not use `route === 'authenticated'` as the only tenant authorization check; it proves sign-in, not tenant membership.
- Avoid root-level `useAuthenticator()` without a selector because it can re-render on every Authenticator context value change.
- Cognito group claims may be absent from tokens; always treat missing groups as no access unless an explicit email fallback is configured.
- Redirect loops are easy: keep `/login` outside `RequireAuth` and ensure the login page honors `next` only after auth succeeds.
- Gen 1 Amplify auth setup is a sunset path; do not invest sprint time in new Gen 1-only conventions.
