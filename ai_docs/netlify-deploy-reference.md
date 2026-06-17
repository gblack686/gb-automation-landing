# Netlify deploy reference for GBAuto portal

- fetched_at: `2026-06-11T19:21:44Z`
- sources:
  - https://docs.netlify.com/site-deploys/create-deploys/
  - https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/
  - https://docs.netlify.com/manage/domains/manage-domains/automatic-deploy-subdomains/
  - https://docs.netlify.com/build/configure-builds/file-based-configuration/
  - https://docs.netlify.com/manage/routing/redirects/redirect-options/#domain-level-redirects

## Sprint-relevant deploy facts

- Netlify can create deploys through Git continuous deployment, CLI/manual deploys, drag/drop, API, build hooks, and Agent Runners.
- Git-based continuous deployment creates Deploy Previews for PRs/merge requests and branch deploys when enabled.
- Manual CLI deploys can run with `netlify deploy`; production deploys use `netlify deploy --prod`.
- `netlify.toml` belongs at the repository root for file-based build/routing configuration.
- Context-aware settings include `[build]`, `[context.production]`, `[context.deploy-preview]`, and `[context.branch-deploy]`.
- `[[redirects]]` and `[[headers]]` are global, not scoped to deploy contexts.

## Deploy aliases and branch URLs

- Netlify CLI `--alias` is for draft deploy URLs only.
- Netlify docs explicitly warn that `--alias` does not create a branch deploy and does not support branch subdomains.
- Avoid using `--alias` with branch names; configure automatic deploy subdomains for branch deploys instead.
- Automatic deploy subdomains can map Deploy Previews and branch deploys to branded domains such as `deploy-preview-42.company.com` or `staging.company.com`.
- Automatic deploy subdomains require domains managed by Netlify DNS and may take up to 24 hours for HTTPS when first configured.

## SPA rewrite required for React Router

For Vite + React Router declarative routes, add one global rewrite so direct loads of `/clients/...`, `/ops/...`, and `/artifacts/...` serve the SPA shell:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Rule order matters: Netlify uses the first matching rule. Put any asset/API exceptions above the catch-all if needed.

## Minimal Netlify config target

```toml
[build]
  command = "npm run build"
  publish = "dist"

[context.deploy-preview]
  command = "npm run build"

[context.branch-deploy]
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Pitfalls

- If a static file path exists, it can shadow redirects unless a forced redirect is used.
- Do not run production deploys without the sprint release receipt and explicit approval.
- Store Netlify tokens as `NETLIFY_AUTH_TOKEN`; never commit tokens into `netlify.toml` or docs.
