# Approved homepage preview

Local review URL: http://127.0.0.1:4321/

This is the current homepage implementation based on website master `fed68fa59a76c8644ef3437f4c179babde0b1abf`. The older preview at port 4319 is superseded for homepage review. No deployment or public activation has occurred.

## Included

- Preserved particle shell, typography and AI developer hero.
- Loom placeholder immediately below the hero subtitle, above the contact CTA.
- Agent Forge showcase with the exact selected workspace PNG and its own intake link.
- Existing portfolio and technology strip; broader services and capabilities.
- Nine source-parity Zero Touch tiles above the retained 90-day process.
- Preserved contact submission handler and accessible field labels.
- Removed floating ElevenLabs widget, script, styling and visibility helper.
- Responsive header clearance and reduced-motion scrolling.

## Validation

- Production Vite build passed. Existing large-bundle and outdated browser-data notices remain.
- Focused ESLint passed on every changed JSX module.
- `python ops/homepage-preview/check.py --monorepo <gbautomation-checkout>` passed 45 checks. See validation.json for the individual results.
- Desktop 1440 px and mobile 390/320 px screenshots are retained alongside this receipt.
- Contact submissions were mocked. No real inquiry, model request or email was sent.
- Eight public Forge files match their existing static-build receipt. This preview proxies to the simulated local API at port 4318.
- Source hashes did not change during validation.

The browser opening command was rejected by automatic approval review as blocked by policy. The loopback URL remains available for manual review.

## Remaining release work

The approved offline backend release preparation is still pending: challenge and trusted ingress handling, the pinned 3.1 Flash-Lite change, and project-specific disabled release templates. Hosted project/sender binding, pilot verification and deployment are separate release gates. User review of this homepage is requested before any deployment. This receipt does not authorize cloud activation.

## Local preview

With the simulator at port 4318, run:

```sh
npm run build
node node_modules/vite/bin/vite.js preview --config ops/forge-preview.config.mjs
```

The public website source remains in this isolated branch. Parallel draft files and the original Nexus source were not modified.
