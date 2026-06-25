# GBAuto Image 2.0 Prompt Fingerprints

Use this packet to keep Image 2.0 prompts compact while preserving the
component styling from `gbauto-component-prompt-packet.md`.

## Core Fingerprint

`GBR-CORE`: GB Automation report-native artifact. Cream page `#F3F1E7`;
cream panel `#E6E4D9`; white translucent panels at 45-70%; stone borders
`#D6D4C8`; ink text `#191919`; muted text `#5C5C5C`; metadata `#8C8A84`;
terracotta accent `#D97757`; status green `#1f7a3a`, amber `#C08A3E`, blue
`#3D6EA8`, red `#B94A48`. Headings feel like Newsreader serif; labels and
body feel like Inter. No black background, no pure white page, no blue/purple
startup gradient, no dark ink cards, no generic PowerPoint diagram style.

## Component Fingerprints

`GBR-SHELL`: Sticky cream report topbar with small terracotta-dot brand lockup,
compact filename text, left-side section navigation rhythm, and bottom metadata
footer. The image should look like one embedded panel inside that report system,
not a separate poster.

`GBR-PANEL`: Compact 8px-radius bordered panels, white/cream translucent fills,
thin stone dividers, small uppercase metadata labels, dense but readable values,
and terracotta active paths. Panels may float only enough to show grouping; avoid
decorative nested cards.

`GBR-PILLS`: Small rounded status/taxonomy chips with stone borders and muted
cream/white fills. Use color sparingly for state: green done, amber degraded,
red blocked, blue verified, terracotta current build.

`GBR-CHART`: Real information visualization first: DAG, waterfall, heatmap,
ribbon, lane chart, Sankey, radial proof timeline, or matrix. Use measured
labels, row/column axes, callout chips, and evidence captions. Do not fill the
canvas with generic rectangles and arrows.

`GBR-FOOTER`: Bottom evidence strip with 3-5 compact metadata cells such as
run id, trace count, Supabase rows, blocker, and production gate. The strip is
part of the visual and should anchor interpretation.

`GBR-BLACKLIST`: Avoid fake SVG-looking slide art, chunky arrows, giant labels,
abstract node blobs, 3D plastic UI, neon gradients, wireframe dashboards, and
meaningless boxes. If an arrow is needed, make it thin, proportional, and behind
the main shapes.

## Image 2.0 Assembly Pattern

Use this compact prompt shape:

```text
Create a 16:9 report-embedded PNG visualization using GBR-CORE, GBR-SHELL,
GBR-PANEL, GBR-PILLS, GBR-CHART, GBR-FOOTER, and GBR-BLACKLIST.

Context: <one short report context paragraph>
Data to show: <5-8 evidence bullets with exact numbers and states>
Visualization method: <specific chart/diagram layout>
Must read at a glance: <one decision sentence>
Avoid: decorative slide, fake UI, generic SaaS colors, unsafe anti-bot wording.
```

Keep prompts grounded in report facts. For client reports, the visual should
make the current decision obvious before it tries to look impressive.
