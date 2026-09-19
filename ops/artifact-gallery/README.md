# Homepage design gallery

The gallery is placed immediately below Zero Touch Engineering, before the
90-day process. It contains 12 public design examples across six categories.
These are style-guide examples, not delivered client projects.

`src/data/showcaseGallery.json` is the curated list. `sources.json` records the
public source URLs and SHA-256 hashes of the shipped 1200 x 800 JPEG previews.
The grid starts with one example from each category. Filters, expansion, and
links to the original examples work without loading the optional Globe view.

The Globe adapts Expert Atlas's golden-angle placement using the site's existing
Three.js dependency. It renders only in response to interaction, loading, or
resize, releases resources on unmount, and falls back to the grid without WebGL.
A labeled HTML selector and previous/next buttons provide keyboard access.

Capture public previews from the repository root:

```powershell
python ops/artifact-gallery/capture_sources.py --monorepo C:/tmp/gbauto-worktrees/codex-session-20260917-forge-lead-magnet
```

Use `--only example-id` to refresh one preview. Capture hides the library's fixed
navigation badge, waits for entrance animations, and scrolls the dashboard and
image gallery to their content. The dashboard's entrance is set to its final
visible state to avoid capturing a blurred animation frame.

The existing homepage acceptance check now includes the gallery and six Forge
steps. It intercepts contact submissions and makes no real email or model calls:

```powershell
python ops/homepage-preview/check.py --monorepo C:/tmp/gbauto-worktrees/codex-session-20260917-forge-lead-magnet --static-preview --output ops/artifact-gallery/local-validation
```

Local validation: 90 checks passed, with no browser errors. Screenshots remain
local; `local-validation/validation.json` preserves the results.
