# YouTube Intel — Daily Scrape Runbook

The `/apps/youtube-intel` page is backed by static JSON written by a Node
script. No backend, no secrets, no paid APIs — it pulls each channel's public
RSS feed (`https://www.youtube.com/feeds/videos.xml?channel_id=…`), which
YouTube serves anonymously.

## Files

| Path | Purpose |
| --- | --- |
| `scripts/youtube-intel/scrape.mjs` | The CLI. |
| `scripts/youtube-intel/channels.json` | Channel allowlist (committed). |
| `public/apps/youtube-intel/dashboard.json` | Read by the UI. Counts + recent videos + latest_run. |
| `public/apps/youtube-intel/channels.json` | Per-channel status. |
| `public/apps/youtube-intel/videos.json` | Full deduped video list. |
| `public/apps/youtube-intel/latest-run.json` | Last run metadata + errors. |
| `src/pages/YouTubeIntel.jsx` | UI shell. |
| `src/lib/youtubeIntelClient.js` | Reads the static JSON above. |

## Daily command

From the repo root:

```bash
npm run youtube-intel:scrape
```

Other modes:

```bash
npm run youtube-intel:scrape:dry      # fetch but do not write
npm run youtube-intel:scrape:sample   # bundled sample data, no network
node scripts/youtube-intel/scrape.mjs --max 25  # pull up to 25 videos per channel
```

Exit codes: `0` on full success, `1` if at least one channel errored
(artifacts are still written), `2` on fatal error.

## Env vars

**None required.** The scrape uses YouTube's anonymous RSS endpoint. There are
no API keys, refresh tokens, or AWS secrets to wire up. If you later add
transcripts or summaries, point at existing AWS Secrets Manager entries (e.g.
`gbautomation/core/apify-token`) — do **not** check secrets into the repo.

## Adding or removing channels

1. Find the channel's `UC…` channel_id (view source on any channel page and
   grep for `"channelId"`).
2. Edit `scripts/youtube-intel/channels.json`. Required fields: `slug`,
   `name`, `channel_id`. Optional: `handle`, `priority`, `enabled`, `tags`.
3. Re-run `npm run youtube-intel:scrape`.
4. Commit the updated `channels.json` plus the regenerated artifacts under
   `public/apps/youtube-intel/`.

## Manual validation

```bash
# 1. Run the scrape
npm run youtube-intel:scrape

# 2. Confirm the four artifacts exist and parse
for f in dashboard channels videos latest-run; do
  node -e "JSON.parse(require('fs').readFileSync('public/apps/youtube-intel/$f.json','utf8'))" && echo "  ok $f.json"
done

# 3. Build the site
npm run build

# 4. Eyeball the UI locally
npm run dev
# open http://localhost:5173/apps/youtube-intel (requires login)
```

## OpenClaw cron recommendation

The repo does **not** schedule the job itself. Sebastian should add a
nightly entry to OpenClaw's cron after the repo path is stable on the host.
Suggested payload:

```yaml
# OpenClaw cron — proposed, not auto-applied
name: youtube-intel-daily-scrape
schedule: "15 4 * * *"          # 04:15 UTC daily, off-peak
workdir: /Users/greg/repos/gb-automation-landing
command: |
  /usr/bin/env -i \
    PATH=/usr/local/bin:/usr/bin:/bin \
    HOME=$HOME \
    npm run youtube-intel:scrape
on_success:
  - git add public/apps/youtube-intel/ scripts/youtube-intel/channels.json
  - git commit -m "youtube-intel: daily scrape $(date -u +%Y-%m-%dT%H:%MZ)" || true
  - git push origin master || true
on_error:
  notify: telegram
```

Reasoning:

- 04:15 UTC avoids overlap with morning briefs and YouTube's own publish bursts.
- `env -i` keeps the cron environment clean — the script reads no env vars,
  so we don't risk a stale token leaking in.
- The commit step is best-effort (`|| true`) so a clean-tree run doesn't
  fail the cron, and so a transient git error doesn't block the next day's
  scrape.
- If pushing is undesirable on a particular host, drop the `git push` line
  and rely on a separate sync.

Once Sebastian confirms the path and host, register the job via the standard
OpenClaw process. Do not commit the cron registration through this repo.

## What's intentionally not here yet

- **Transcripts and summaries.** The `transcripts` and `summaries` metrics
  on the dashboard are stubbed at `0`. A follow-up pass can wire in
  `youtube-transcript-apify` (already documented under consulting-co) and
  write per-video markdown into `public/apps/youtube-intel/transcripts/`.
- **Per-tenant scoping.** All channels share a single allowlist today.
  When a tenant needs their own list, follow the
  `public/clients/<tenant>/` pattern used elsewhere and parameterize the
  output path in the scrape script.
- **Add-channel UI.** The previous version had a form that posted to a
  local API. That API was never deployed; the new flow edits
  `channels.json` and re-runs the script. If you want the form back, build
  it against a real backend — don't re-introduce the localhost stub.
