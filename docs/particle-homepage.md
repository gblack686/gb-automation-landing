# Fixed GB particle homepage

The September 14, 2026 operator-approved homepage uses the nine-color GB signature
and 100-second Tight Skim camera loop from the July particle-dune experiment.
The background stays fixed to the viewport while the existing sections scroll
over it. Cream text, transparent sections, and dark translucent cards reproduce
the approved local preview. Existing copy, pricing omission, navigation, contact
submission behavior, portfolio dialogs, and the ElevenLabs widget are retained.

There are no visitor-facing animation controls, theme switches, palette settings,
or playground UI. The separate redesign experiment in PR #24 remains on hold.

`ParticleBackground.jsx` owns the homepage-only lifecycle and dynamically imports
`gbParticleScene.js`. Three.js 0.160.0 is pinned and bundled locally; no runtime CDN
import or captured website HTML is shipped. The canonical `/gb-signature.png`
exactly matches the source experiment's embedded logo. Colors are cyan, violet,
magenta, olive, blueprint, green, amber, blue, and red. Each particle keeps its
assigned color throughout a visit. The existing terracotta headline stays intact.

The optional WebGL layer starts after the content paints, caps pixel ratio at 1.5
and rendering at 30 fps, pauses in hidden tabs, and disposes resources on route
changes. Device reduced-motion preferences use a still image without downloading
Three.js. That image also covers loading and unavailable/lost WebGL contexts.
The homepage CSS is scoped so client and sign-in routes retain their existing theme.

## Validation

Run the production build and existing checks:

```sh
npm run build
npm test
npm run test:tenant
npm run test:client-hub
npx eslint src/components/ParticleBackground.jsx src/components/VideoHero.jsx src/pages/Home.jsx src/lib/gbParticleScene.js
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4192 --strictPort
python scripts/validate-particle-home.py http://127.0.0.1:4192
```

The browser script requires Python Playwright and Chrome. It checks fixed viewport
bounds and continued rendering after scrolling; desktop and 390/320px layouts;
absence of public controls; device reduced motion; WebGL context-loss fallback;
portfolio dialogs; a mocked contact submission; and isolation from other routes.
Every contact POST is intercepted, including when the script targets production.
Screenshots and JSON results go to ignored `artifacts/particle-background/`.

The existing shared application chunk warning remains. This change adds a separate
Three.js scene chunk, loaded only for homepage visitors who allow motion.

## Release

Deploy through a scoped PR to this repository's actual production branch,
`master`. Amplify app `d1qefy5a1kauhs` deploys that branch to
https://gbautomation.xyz/. Verify the Amplify job's commit and browser behavior on
the custom domain after merging. Backend definitions and build configuration are
outside this change.
