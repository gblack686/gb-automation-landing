# Tenant Portals

This site supports private client portal routes under `/clients/<slug>/*`.

## Current Tenant

- `gbautomation` is the internal validation tenant.
- Route: `/clients/gbautomation`
- Source: local app code at `src/clients/gbautomation/`
- Auth: existing `RequireAuth` sign-in gate.

## External Tenant Pattern

External client portals should use a two-repository model:

1. Create a private tenant source repo, for example `gbauto/jid5274-portal`.
2. Add the tenant source repo as a submodule at `src/clients/<slug>`.
3. Add `.github/workflows/tenant-sync.yml` in this parent repo.
4. Copy `docs/tenant-source-notify-parent.yml` into the tenant source repo as `.github/workflows/notify-parent.yml`.
5. Create a fine-grained GitHub PAT with access only to `gbauto/gb-automation-landing`, permissions `Contents: Read and write`, `Metadata: Read`, and `Actions: Read and write`.
6. Store that PAT in the tenant source repo as `PARENT_REPO_PAT`.
7. Push to the tenant source repo. The parent workflow bumps only that tenant submodule and refuses changes outside `src/clients/<slug>`.

## Tenant Auth

`RequireAuth` accepts an optional `allowedGroups` prop for Cognito group checks:

```jsx
<RequireAuth allowedGroups={['tenant-jid5274']}>
  <Jid5274Portal />
</RequireAuth>
```

Use the plain sign-in gate for internal validation routes until Cognito groups are configured.

## Local Validation

```bash
npm run test:tenant
npm run build
```

The tenant validation script checks the internal route files, parent workflow, source workflow template, and app registry entry.
