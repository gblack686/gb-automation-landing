# Amplify Hosting Rewrites — gbautomation.xyz

The file `amplify-rewrites.json` is the source of truth for the AWS Amplify Hosting
Rewrites and Redirects rules used by this app.

This repo ALSO ships a Netlify-style `public/_redirects`. That file is only honored
by the secondary Netlify mirror (gbautoxyz.netlify.app). AWS Amplify Hosting IGNORES
`_redirects`; rules must be set via the Amplify Console or the Amplify HTTP API.

## Why this exists

`PRDView.jsx` (route `/prds/:slug`) fetches `/prds/<slug>.html` and injects the body
via `dangerouslySetInnerHTML`. Without an explicit asset pass-through rule, Amplify's
default SPA catch-all rewrites `/prds/<slug>.html` to `/index.html`, so the React
component receives the SPA shell instead of the published PRD artifact and renders
an empty page on every PRD URL.

## What the rules do, in order

1. `/prds/prds-manifest.json` — passes the manifest through to the static JSON file.
2. `/prds/<*>.html` — passes published PRD HTML artifacts through unchanged.
3. `/prds/<*>.json` — passes any per-PRD JSON sidecar files through unchanged.
4. `/previews/<*>` — passes preview artifacts through unchanged.
5. The regex rule rewrites everything else (extensionless paths and any extension
   NOT in the allowlist) to `/index.html` so React Router can take over for SPA
   deep-link refreshes. `html` is in the allowlist so static `.html` files keep
   serving without falling into the SPA catch-all.

## How `/prds/<slug>` works after this lands

- Browser hits `https://gbautomation.xyz/prds/foo`.
- Path is extensionless and matches the regex SPA rule, so Amplify serves
  `/index.html`. React Router mounts `<PRDView />`.
- `PRDView` does `fetch('/prds/foo.html')`. Path matches rule 2 and serves the
  static published artifact byte-for-byte. The body is extracted and rendered
  inside the brand frame.
- If `/prds/foo.html` doesn't exist, Amplify returns a real 404. `PRDView`
  catches the failed fetch and renders the "PRD not found" error state with
  a link back to `/prds`.

## Applying these rules

You need someone with `amplify:UpdateApp` on the gb-automation-landing app
(neither `mac-mini-automation` nor `admin-agent` has this today).

### Option A — Amplify Console (manual, no extra IAM needed)

1. Open https://console.aws.amazon.com/amplify/home?region=us-east-1
2. Pick the `gb-automation-landing` app
3. Left nav → Hosting → Rewrites and redirects
4. Click "Open text editor"
5. Paste the contents of `amplify-rewrites.json`
6. Save

### Option B — AWS CLI (requires `amplify:UpdateApp`)

```bash
APP_ID=<amplify-app-id>  # from the console URL, e.g. d1abc23defghij
aws amplify update-app \
  --app-id "$APP_ID" \
  --custom-rules "$(cat amplify-rewrites.json)" \
  --region us-east-1
```

A helper script lives at `scripts/apply-amplify-rewrites.sh` (does the right
thing if AWS creds with amplify perms are present, prints a clear error if not).

## Verification

After applying the rules, no redeploy is needed — Amplify Hosting applies
rewrites at the edge. Verify with:

```bash
# Should return a published PRD HTML body, NOT the SPA shell.
curl -s https://gbautomation.xyz/prds/test-clients-hermes-iac-prd.html | head -5
# Expect: <!DOCTYPE html> ... <title>test-clients Hermes IaC PRD | GBAutomation</title>

# The SPA route should still work (returns the SPA shell so React can mount).
curl -sI https://gbautomation.xyz/prds/test-clients-hermes-iac-prd | head -5
# Expect: HTTP/2 200 + content-type text/html

# A nonexistent slug's .html should 404 (this drives the "PRD not found" UI).
curl -sI https://gbautomation.xyz/prds/total-nonsense-xyz-123.html | head -5
# Expect: HTTP/2 403 or 404 (S3 returns 403 on a missing key by default)

# Browser-side check: open the URL in a real browser and confirm the PRD content
# renders (title becomes the PRD title, body is the rendered markdown).
```

## Pitfalls

- Don't strip `html` from the regex allowlist; if you do, `/prds/<*>.html` gets
  shadowed by the SPA catch-all again and you're back to the original bug.
- Don't move the SPA catch-all above the asset rules — order matters; the regex
  rule is intentionally last.
- The `200!` forced-rewrite syntax used by Netlify's `_redirects` has no Amplify
  equivalent; specific source patterns naturally take precedence over the regex
  catch-all because Amplify matches rules top-down.
