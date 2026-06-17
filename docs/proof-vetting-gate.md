# Proof-vetting gate for portal claims

Run:

```bash
npm run test:proof-claims
```

The gate scans:

- `src/**/*.jsx`
- `public/portfolio/**/*.json`
- `public/clients/**/*.json`
- `public/artifacts/**/*.json`
- `public/prds/**/*.json`

It flags two claim classes:

- named-client claims: a known client or GBAutomation/RevStar reference plus action/status wording
- quantified claims: percentages, `N+`, `Nx`, or counts tied to business nouns such as hours, clients, stores, pages, reports, apps, agents, builds, and automations

Required proof shape:

```json
{
  "title": "Mall Scanner cycle ran end to end. 112 brand pages diffed, 4 sale alerts dispatched.",
  "sourcePath": "second-brain/clients/the-mall/deliverables/_baseline-ig-scrape-2026-05-18.md",
  "sourceQuote": "112 brand pages diffed"
}
```

For JSX pages, a file-level proof object is accepted while the content is being migrated:

```js
export const proof = {
  sourcePath: 'second-brain/intelligence/tac-validations/2026-05-10-client-portal-validation-gbautomation.json',
  sourceQuote: 'Client Portal validation receipt written'
};
```

`sourcePath` must point to a file under the landing repo or one of the configured evidence roots. `sourceQuote` must appear verbatim in that source file.

Current baseline:

- `docs/proof-vetting-allowlist.json` records 30 pre-existing unsupported claims.
- These are allowed only so the new gate can pass on the current tree.
- Each entry includes a required action: add sourcePath/sourceQuote or remove/soften the claim.
- Do not add new marketing/client claims to the allowlist; add proof next to the claim instead.
