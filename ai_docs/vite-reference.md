# Vite reference for GBAuto portal

- fetched_at: `2026-06-11T19:21:44Z`
- sources:
  - https://vite.dev/guide/
  - https://vite.dev/guide/static-deploy
  - https://vite.dev/guide/assets
- repo package observed: `vite@^7.1.7`
- repo scripts observed: `npm run build` => `vite build`; `npm run preview` => `vite preview`

## Sprint-relevant facts

- Vite dev server uses native ES modules and HMR for fast local iteration.
- Production builds output optimized static assets to `dist` by default.
- `vite preview` serves the built `dist` locally, commonly at `http://localhost:4173`; it is for local preview, not production hosting.
- Vite 7 requires Node.js `20.19+` or `22.12+`.
- Public assets belong in `<root>/public` when they must keep exact names and be addressable without imports.
- Files under `public` are served from `/` during development and copied as-is into `dist` during build.

## Portal static-data implication

The current app's artifact lake under `public/artifacts`, `public/portfolio`, `public/prds`, and `public/tac` should be referenced with root-absolute URLs, for example:

```txt
/artifacts/manifest.json
/portfolio/apps-registry.json
/prds/prds-manifest.json
/tac/catalog.json
```

Do not import large generated registries into React modules unless the data should enter the JS bundle. Fetch JSON from `public` for v1 portal data surfaces.

## Minimal local verification

```bash
npm install        # only if node_modules is missing or stale
npm run test
npm run build
npm run preview -- --host 127.0.0.1
```

## Pitfalls

- Do not rely on `vite preview` as a production server.
- Public assets are not fingerprinted; use manifest fields like `sha256`, `updated_at`, or content IDs for cache/version proof.
- Root-absolute paths require Netlify/Vite base to remain `/` for `gbautomation.xyz`.
- If a client portal path is loaded directly, the host must rewrite that path to `/index.html`.
