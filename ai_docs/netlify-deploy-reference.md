# Netlify deploy reference for portal sprint

fetched_at: 2026-06-11T19:23:58Z
scope: P0/P1 deploy preview, branch deploy, alias, and SPA routing decisions for the five-day GBAutomation portal sprint.
repo context: Vite app builds to `dist`; package scripts include `npm run build` and `npm run preview`.

## Sources fetched

- https://docs.netlify.com/deploy/deploy-overview/ — atomic deploys, skew protection, deploy summaries/logs, deploy contexts, preview URLs, noindex behavior.
- https://docs.netlify.com/deploy/deploy-types/deploy-previews/ — deploy preview creation, URL formats, PR/MR previews, agent-run previews, deploy permalinks, entry paths.
- https://docs.netlify.com/cli/get-started/#manual-deploys — Netlify CLI requirements, auth, manual deploys, CI recommendation to pin `netlify-cli` locally.
- https://vite.dev/guide/static-deploy — Vite Netlify deploy basics and default `dist` output assumption.

## Current-doc facts that matter this week

- Netlify deploys are atomic: changed files are uploaded into a new deploy and the public URL switches only when the deploy is complete.
- Deploy Previews are created for pull/merge requests on connected Git repositories and for Netlify agent runs that modify site files.
- Pull/MR Deploy Preview URLs follow `https://deploy-preview-1234--my-site.netlify.app`.
- Agent run preview URLs follow `https://agent-<run-id>--my-site.netlify.app`.
- Every deploy also has a permalink beginning with the deploy ID; permalink contents do not change after redeploy.
- Deploy Previews may return Not Found while the first deploy is still pending.
- Deploy Previews, unpublished production deploys, and old branch deploys include `X-Robots-Tag: noindex`.
- Skew protection is only available on the production context; it is bypassed for branch deploys, Deploy Previews, and deploy permalinks.
- Netlify CLI requires Node.js 18.14.0 or later.
- Netlify recommends installing the CLI locally in CI rather than relying on a mutable global install.

## Minimal examples

### Vite build settings in Netlify UI

```text
Build command: npm run build
Publish directory: dist
Production branch: main
```

### SPA redirect for React Router deep links

Create `public/_redirects` so Vite copies it into `dist/_redirects`:

```text
/* /index.html 200
```

### Manual preview deploy

```bash
npm run build
npx netlify deploy --dir=dist --message "portal sprint preview"
```

### Manual alias deploy for a stable review URL

```bash
npm run build
npx netlify deploy --dir=dist --alias=portal-day-0
```

Expected stable URL shape:

```text
https://portal-day-0--<site-name>.netlify.app
```

### Production candidate deploy

```bash
npm run build
npx netlify deploy --prod --dir=dist --message "portal sprint production candidate"
```

## V1 sprint recommendation

P0:
- Use Netlify connected-Git Deploy Previews for reviewable portal work.
- Use `dist` as publish directory and `npm run build` as the build command.
- Add/verify a SPA fallback redirect before QA tests deep private routes.
- Capture both the mutable Deploy Preview URL and immutable deploy permalink in release receipts.
- Treat preview Not Found during first build as pending deploy, not necessarily failure.

P1:
- Use alias deploys for day-gate review URLs such as `portal-day-1`, `portal-day-2`, etc. if PR previews are not enough.
- Pin `netlify-cli` locally if manual deploys become part of CI.
- Add deploy context notes to the release receipt: production, deploy-preview, branch-deploy, or alias/manual.

## Pitfalls

- Do not rely on Netlify skew protection in Deploy Previews; docs state it is production-only.
- Do not report an alias URL as immutable proof; deploy aliases move when a later deploy uses the same alias.
- Use deploy permalinks for immutable proof because their contents do not change.
- Without `_redirects`, hard refreshes on React Router paths can 404 before the SPA loads.
- Preview URLs can be unavailable while the initial deploy is pending; QA should retry after build success.
- Keep production deploys behind an explicit release receipt; the PRD forbids production deploy without that gate.
