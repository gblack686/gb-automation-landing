# GB Automation homepage redesign

The homepage presents GB Automation as an independent AI systems studio: custom agents, internal tools, and connected workflows. It replaces the previous program and pricing composition with selected work, an illustrative workflow comparison, an approach, FAQ, and distinct discovery booking and project-brief entrypoints. All homepage pricing is omitted.

## Scope and approval

- Operator approved local implementation of phases 1–4 on September 7, 2026, after approving the design with pricing omitted.
- Canonical plan in `gbautomation`: `second-brain/plans/2026-09-07-gbautomation-website-redesign.html`. Reviewed plan SHA-256: `7d8391e4a7ec183163bca6caaf17873fe78464d82eff1cb2578a8378c6a2c9f9`.
- Base: `3640a6504d7a725c1c3662b491c0dc94f1dd5bfe`, remote `master`.
- Isolated clone: `C:/tmp/gbauto-isolated/website-redesign-20260907`, branch `codex/website-redesign-20260907`. The primary website checkout is divergent and dirty; its files, seven missing worktree registrations, and refs were preserved. No extra linked worktree was created.
- The supplied DESIGN.md, HTML, and Vantrix ZIP informed scale, geometry, grid, and spacing. Their code, demonstration form, and third-party imagery were not imported.

## Evidence and claim ledger

All source paths below existed publicly in the approved website commit. The images show those actual artifacts. The gallery identifies internal systems, the design library, and an experiment; it makes no claims about client results or numeric improvements.

| Homepage example | Public source and asset | Supported claim |
| --- | --- | --- |
| A session ends. The knowledge stays. | `/prds/pr-500-session-exit-summary.html`; `/marketing/session-report.webp` is a 1280×860 screenshot of that report | The documented session-summary system captures session context, decisions, and references in the knowledge base. The preview is a build report, not a fabricated dashboard. |
| One language. Every interface. | `/theme/`, `/theme/theme-manifest.json`; `/marketing/design-library.webp` is a 1280×860 screenshot of the index | A public library brings reports, workspace examples, and interface patterns into one brand system. |
| From brand asset to moving image. | `/portfolio/apps-registry.json` → `logo-motion`, `/portfolio/artifacts-feed.json`; existing `/portfolio/samples/logo-motion/clip.mp4` and poster | The experimental pipeline creates keyframes and interpolated motion from a brand asset. It remains labeled an experiment. |
| Greg Black, founder and AI/data engineer | `/portfolio/portfolio.json` → `professional_info`, GBautomation founder role and engineering experience | Public biography supports the concise about section. No new employer/client logos or endorsements are introduced. |
| GB signature logo | Existing `/gb-logo.png`, losslessly preserved in source; optimized derivative `/marketing/gb-logo.webp` | Existing first-party brand mark. |
| Hero geometry | Original `SystemArtwork.jsx` SVG paths | Decorative procedural artwork; no claim that it is a product interface. |
| Workflow comparison | `WorkflowDemo.jsx`, explicitly illustrative | Local state only. No agent invocation, upload, generated live status, metric, or external write. |

No private client records, testimonials, case-study metrics, or contractual ownership promises were added. The inquiry copy makes no delivery-time guarantee.

## Integration boundaries

- All new styling is scoped under `.gb-marketing-home`.
- Existing React/JavaScript/Vite remains in place. No provider, routing, authentication, or backend schema migration.
- Booking uses the existing 30-minute calendar URL, `https://calendar.app.google/X4SN26PYLgvVYPRp8`.
- `ProjectBrief.jsx` uses `insertContactSubmission` with the existing `name`, `email`, `company`, `phone`, `project_description` payload. Pending submissions are locked; errors preserve entered data; successful requests clear the form.
- The contact helper now accepts a successful empty HTTP 201 response for its `return=minimal` request, as well as HTTP 204. Other helpers retain their JSON-response behavior; error responses still throw. This fixes a false failure after a successful insertion without changing any backend policy.
- The floating ElevenLabs widget is hidden on `/` so it cannot overlap the offer or form. Its existing provider script, configuration, and visibility rules on other routes remain intact. This is an intentional homepage presentation change in `ConvaiVisibility`.
- Existing pricing components stay available to other imports; the homepage does not import or render them.
- Original SVG motion is optional and has a pause/play control. IntersectionObserver, page visibility, and the user's reduced-motion preference suspend animation. Content does not depend on animation. Below-fold screenshots use lazy-loaded WebP assets with explicit dimensions; no homepage video autoplays.

## Local review and validation

`amplify_outputs.json` is a generated, ignored build prerequisite. The local preview uses the existing checkout's configuration; this file is not committed. A fresh clone without it fails to build, as recorded in baseline evidence.

```powershell
npm ci --no-audit --no-fund
npm run build
npm run preview -- --host 127.0.0.1 --port 4191 --strictPort
npm test
npm run test:tenant
npm run test:client-hub
npm run lint
python scripts/validate-marketing.py --url http://127.0.0.1:4191
```

Browser checks require Python Playwright and installed Chromium. Supply `--browser <executable>` if Playwright's default browser is not installed. Set `GBAUTO_CONTEXT_ROOT` to the canonical `gbautomation` checkout to enable `resources/lib/tracing.py` for the validation script.

Use a production preview for auth regression checks: the existing repository deliberately bypasses auth on localhost in Vite DEV mode. The browser test intercepts all writes, mocks form responses, and only checks the calendar destination; it never submits real leads or books calls.

Validation evidence, screenshots, and baseline/final logs are in the local ignored `artifacts/website-redesign/` directory. The baseline global lint result is 824 errors and four warnings, primarily from checked-in generated public bundles and several unrelated source files. Changed-source lint must pass, and the final global result must introduce no additional diagnostics. The application retains its inherited large shared bundle; local lab results are not field conversion or INP measurements.

### Recorded results

- Production build, site suite (13/13), tenant validation, and client-hub validation pass.
- Changed-source lint passes. Global lint has the same 824 errors and four warnings as the baseline, with zero new diagnostics; the full repository lint gate remains non-green.
- All ten browser acceptance groups pass, covering four viewport widths, pricing omission, navigation, keyboard controls, real artifact destinations, mocked form failures and success responses, motion, and production auth redirects. No uncaught page errors. All three test submissions were intercepted locally.
- Protected route checks cover the unauthenticated boundary and retained destinations. No signed-in client account was used.

| Viewport | Baseline LCP | Final LCP | Final CLS |
| --- | --- | --- | --- |
| 1440×1000 | 1.204 s | 0.876 s | 0 |
| 768×1024 | 0.344 s | 0.400 s | 0.0084 |
| 390×844 | 0.440 s | 0.304 s | 0.0011 |

These are single local Chromium 1234 headless navigations, without CPU or network throttling, observed 2.5 seconds after load. The inherited external font/widget requests were retained. All are within the plan's local LCP ≤2.5s and CLS ≤0.1 targets; they are observations, not production speed guarantees. The shared JavaScript bundle is 1,696.74 kB (459.80 kB gzip), down from 1,819.74 kB (497.97 kB gzip); Vite's inherited large-chunk warning remains.

## Release and rollback

This delivery is a local review build. No production push, merge, deployment, live submission, calendar booking, external message, paid service, or Hermes dispatch is included. A later release should use the reviewed implementation commit and existing hosting pipeline. Roll back through a normal reviewed revert and redeploy to the prior production commit; do not overwrite the divergent primary checkout or force-push.
