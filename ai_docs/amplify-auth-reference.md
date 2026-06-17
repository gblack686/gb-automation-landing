# Amplify Auth / Amplify UI reference for the client portal

Fetched at: 2026-06-11T19:24:55Z

## Source URLs fetched

- https://docs.amplify.aws/react/frontend/auth/ — AWS Amplify React Auth docs; redirected from the older `build-a-backend/auth/connect-your-frontend/` URL.
- https://ui.docs.amplify.aws/react/connected-components/authenticator — Amplify UI React Authenticator docs.

## Repo context

Current dependencies in `package.json`:

- `aws-amplify` `^6.15.7`
- `@aws-amplify/ui-react` `^6.15.3`
- `@aws-amplify/backend` `^1.17.0`
- `@aws-amplify/backend-cli` `^1.8.0`

Current boot path:

- `src/main.jsx` imports `Amplify` from `aws-amplify`.
- `src/main.jsx` imports `../amplify_outputs.json`.
- `Amplify.configure(outputs)` runs once before the React tree renders.
- `src/App.jsx` wraps the app with `<Authenticator.Provider>`.
- `src/pages/Login.jsx` should own the visible `<Authenticator>` sign-in UI.
- `src/components/RequireAuth.jsx` gates private routes with `getCurrentUser()` and optional `fetchAuthSession()` checks.

## Repo-relevant pattern

Use Amplify in three layers:

```jsx
// src/main.jsx
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

Amplify.configure(outputs);
```

```jsx
// src/App.jsx
import { Authenticator } from '@aws-amplify/ui-react';

export default function App() {
  return (
    <Authenticator.Provider>
      {/* BrowserRouter + Routes */}
    </Authenticator.Provider>
  );
}
```

```jsx
// route gate; mirrors current RequireAuth.jsx
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

async function assertTenantAccess({ allowedGroups = [], allowedEmails = [] }) {
  await getCurrentUser();

  if (!allowedGroups.length && !allowedEmails.length) return true;

  const session = await fetchAuthSession();
  const groups = session.tokens?.accessToken?.payload?.['cognito:groups'] || [];
  const email = String(session.tokens?.idToken?.payload?.email || '').toLowerCase();

  return allowedGroups.some((group) => groups.includes(group)) || allowedEmails.includes(email);
}
```

## Implementer guidance

- Keep `Amplify.configure(outputs)` in one boot location only.
- Keep public pages outside `RequireAuth`.
- Keep tenant pages behind `RequireAuth` with both group and email allowlists during sprint hardening.
- Prefer Cognito groups for tenant and admin access; email allowlists are a temporary operator override.
- Preserve redirect intent with `?next=` from protected routes to `/login`.
- Use `fetchAuthSession()` only after `getCurrentUser()` succeeds to avoid noisy token reads for anonymous visitors.
- Make the 403 state visually distinct from the unauthenticated redirect.

## Pitfalls

- `Authenticator.Provider` is context only; it does not render the hosted sign-in UI by itself.
- Missing or placeholder `amplify_outputs.json` can still let Vite build, but Authenticator/sign-in will fail at runtime.
- Group checks must read the access token claim `cognito:groups`; email is usually in the ID token.
- Client-side route guards improve UX but are not a security boundary for private data. Tenant data APIs and static artifact access must still enforce authorization or avoid publishing secrets.
- Do not put Cognito secrets or service credentials in Vite env vars. Vite exposes `VITE_*` variables to browser code.
- Keep `@aws-amplify/ui-react/styles.css` imported once; duplicate imports can make theme debugging noisy.

## Recommendation

Use the current `RequireAuth` approach for sprint P0, but treat it as UI gating only. Put every client artifact listed in the portal through a separate tenant manifest that contains no secrets, and reserve Cognito group checks for deciding which tenant route tree renders.
