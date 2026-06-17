# Amplify Auth reference for GBAuto portal

- fetched_at: `2026-06-11T19:21:44Z`
- sources:
  - https://docs.amplify.aws/react/build-a-backend/auth/set-up-auth/
  - https://docs.amplify.aws/react/build-a-backend/auth/connect-your-frontend/
  - https://docs.amplify.aws/react/build-a-backend/auth/concepts/tokens-and-credentials/
  - https://docs.amplify.aws/react/build-a-backend/data/customize-authz/user-group-based-data-access/
  - https://ui.docs.amplify.aws/react/connected-components/authenticator
- repo packages observed: `aws-amplify@^6.15.7`, `@aws-amplify/ui-react@^6.15.3`, `@aws-amplify/backend@^1.17.0`, `@aws-amplify/backend-cli@^1.8.0`
- brand reference: `/Users/greg/repos/gbautomation/second-brain/systems/brand/gbauto-brand-tokens.md`

## Sprint-relevant decisions

- Use Amplify Gen 2 concepts as the current target; Gen 1 is in maintenance and reaches end-of-life on 2027-05-01.
- Amplify Auth is backed by Amazon Cognito.
- The generated frontend connection file in Gen 2 is `amplify_outputs.json`; this repo currently has `src/amplifyconfiguration.json`, so treat existing config as legacy-compatible until scaffold/auth workers confirm the active backend shape.
- The repo already wraps routes in `Authenticator.Provider` and uses route-level `RequireAuth` guards.
- Use Cognito groups for tenant/ops gating where possible; group claims appear under `cognito:groups` in both access and ID tokens.
- Use access tokens for authorization decisions against APIs/resources; ID tokens may contain PII and should be treated as frontend identity data, not backend authorization proof.

## Minimal route guard pattern

```jsx
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

async function readPortalIdentity() {
  const [session, user] = await Promise.all([
    fetchAuthSession(),
    getCurrentUser(),
  ]);

  const groups = session.tokens?.accessToken?.payload?.['cognito:groups'] ?? [];
  return { user, groups };
}
```

For the current repo, preserve the existing declarative wrapper style:

```jsx
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
```

## Authenticator notes

- `Authenticator` from `@aws-amplify/ui-react` provides sign-in, sign-up, forgot-password, `user`, and `signOut` UI flows.
- The UI docs show migration guidance for older UI versions; this repo is already on v6-era packages.
- Import `@aws-amplify/ui-react/styles.css` wherever Authenticator UI is rendered if default Amplify UI styling is needed.
- For GB-branded pages, wrap or style auth surfaces using canonical cream/ink/terracotta tokens instead of copying Amplify defaults into app-level brand tokens.

## Known pitfalls

- Do not assume a group-management backend exists just because route guards read groups.
- Do not use ID-token PII in static artifacts or logs.
- Dynamic group authorization has subscription limits in Amplify Data: single-group records support users in up to 5 groups; array group auth supports users/records with up to 20 groups.
- `localStorage` is the default token storage; if portal security requirements change, explicitly choose `sessionStorage`, `CookieStorage`, or custom storage.
- Keep tenant slugs stable (`gbautomation`, `jid5274`) and map groups/emails in one config layer, not scattered through pages.
