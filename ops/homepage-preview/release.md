# Homepage and Forge showcase release

The homepage keeps the AI developer headline and particle background. It adds the intro video placeholder, Agent Forge showcase, broader service copy, nine Zero Touch Engineering tiles above the retained 90-day timeline, and monochrome animated call-to-action buttons. The floating ElevenLabs menu is removed.

The public Forge build is explicitly preview-only. It lists all 13 workspace windows and links to the existing contact form. Automated team generation and email delivery are labeled coming soon. No intake answers, email addresses, model calls, or Forge API requests are collected by the preview. The existing local Gmail/OpenRouter pilot is separate and stays private.

Release target: Amplify app `d1qefy5a1kauhs`, `master`, `us-east-1`, `https://gbautomation.xyz/`. The repository's existing master workflow also publishes its Netlify mirror. No build pipeline, authentication, database, sender, or paid subscription is changed by this release.

## Validation

- Forge static build and verified nine-asset sync passed.
- Website production build and focused JSX lint passed.
- 60 browser checks passed at `http://127.0.0.1:4321/`, including button inversion/reset in both appearances, reduced motion, all 13 bullets, desktop/mobile layouts, preview disclosure, no Forge API requests, deep links, and contact navigation.
- Contact submission tests intercept the request. No real inquiry or email was sent.

## Publishing and rollback

Merge the scoped website PR after review. Preserve existing Amplify custom rules and insert the three routes in `ops/forge-amplify-rules.json` before the root SPA fallback. Verify the successful job's commit plus apex/www/branch-domain HTML, JS/CSS responses, Forge routes, and a browser smoke run.

Revert the website merge commit to restore the previous homepage. If removing Forge routes, remove only the three additions, preserving other apps' rewrites. No backend rollback is required. Keep Forge in preview mode until a hosted API, email sender, and generation limits are verified.
