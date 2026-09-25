# Private Forge visual generation

The Artist Packet workspace uses the existing Cognito tenant boundary. The
`forge-visual-operator` group additionally controls all generation and approval
mutations. Other tenant members can review saved outputs. No anonymous access.

The opaque Studio frame opens the host's Character Studio with a selected visual
brief. It never receives a provider key or Cognito token. Saving creates a job
without a provider call. Five explicit, version-bound decisions run one
portrait, one full agent card, one full character, one 30-credit Meshy master,
and one 5-credit remesh. Older jobs retain their original four-stage pipeline.
OpenAI image charges are separate token-based charges, each limited to one low
quality edit. There is no automatic paid retry or alternative generation.

The initial brief is immutable after creation. The server pins tenant, expert and config
SHA and resolves the exact Scryfall printing/face itself. It uploads actual card
art pixels to the portrait edit, approved portrait pixels to the full-character
edit, and approved full-character pixels to Meshy. Operator notes cannot supply
URLs or output paths. Full card pixels never enter the 3D branch.

After portrait approval, the card editor defaults title/abilities/quote to the
agent, type to **Expert Agent — Artist Deliverables**, and mana/stats to the source.
New jobs (`card_frame_version: 1`) assemble the card locally for **zero provider
charge**. The original full card is the preview canvas; no CSS substitute frame.
The exact Isshin NEO 224 printing/face has a measured art/text interior map.
Other printings are blocked before paid generation until their maps are verified.
Mana symbols, ornamentation, bevels, set emblem, hologram, borders and collector
footer remain source pixels. Stats remain source pixels unless explicitly edited.

Only approved interiors are replaced. Source paper texture fills text interiors;
OFL-licensed Crimson Text outlines make lettering independent of browser/Lambda
fonts. Unsupported characters and overflowing text fail before approval. The
font outline data has source URLs/hashes; `scripts/build-forge-card-fonts.py`
rebuilds it with fonttools. The bundled license applies to these glyphs.

The card approval binds the source image, portrait, text, frame profile/version
and a no-charge quote. `frame_preservation` records zero changed protected pixels,
source/output protected hashes, source/portrait/text/output hashes and editable
regions. The worker re-verifies uploaded bytes, including recovery after a crash.
Missing/stale/failing proof blocks card approval, ZIP export and adoption. Art
crop, lettering, spelling and composition still need visible human review.
Already submitted older jobs retain their original paid image-edit contract and
saved text; no existing approval is rewritten. Portrait/full-character edits and
the textless 3D lineage retain their separate approvals.

State and immutable artifacts live in the existing private versioned bucket:
`gbautomation/artist-packet-expert/visuals/runs/<UUID>/`. S3 conditional writes
serialize commands; SQS handles background delivery. A durable `submitting`
state precedes every paid POST. Ambiguous outcomes stop at `outcome_unknown`;
Resume only recovers existing artifacts or polls a saved task ID. A lost task ID
requires operator reconciliation against provider records, never blind retry.
Preflight failures can resume because no POST was attempted. The queue retains
messages for 14 days and moves repeated transport failures to its dead-letter
queue after five deliveries. Active polling pauses after two hours.

Generated files have tenant/expert/run/input/checksum metadata, exact-version
readback, and generation receipts. Master files stay private. The web pass uses
50k target triangles, WebP textures at 2048 px, and verifies actual GLB triangles,
texture edges and bytes. It requires <=100k triangles, <=2048 px and <=5 MB.
Failures remain `needs_optimization`, preserving the unchanged master.

Each stage needs a hash-bound visual review. Final Use in Forge writes a separate
private `active.json` presentation manifest after all reviews and the web gate.
It does not alter the expert configuration, runtime permissions, proposal gates,
email settings or current source portrait. That portrait is still the fallback.
The active manifest also carries the approved full card for Presence preview
and full-screen views. The host verifies both assets before passing data URLs
into the private frame.

## Approved output packet

The complete ZIP is enabled only after every stage has a matching approved
asset hash and the web-model budget passes. Each downloaded file is checked
against its immutable S3 version, size and SHA-256 before ZIP creation.

| File | Purpose |
| --- | --- |
| `reference-full-card.jpg` | Full selected printing and face, including frame and text |
| `reference-art-only.jpg` | Art crop used by the portrait branch |
| `agent-portrait.png` | Approved textless agent identity |
| `agent-full-card.png` | Approved full card with edited agent text |
| `agent-full-character.png` | Approved full-body, textless 3D input |
| `agent-master.glb` | Unmodified textured Meshy master |
| `agent-web.glb` | Measured, optimized web model |
| `manifest.json` | Expert/run/config binding, artifact versions, hashes and lineage |
| `generation-receipt.json` | Stage approvals, reviews, provider usage and task IDs |
| `brief.json` | Immutable normalized intake |
| `card-text.json` | Exact operator-approved card text |
| `source-printing.json` | Scryfall printing/face, artist, colors, stats and source text |

Legacy packets explicitly report pipeline version 1 and omit the two full-card
images. New packets report version 2. No paid retry is added; Meshy remains 35
credits. New card assembly is free; portrait/full-character token usage remains separate.

The server currently supports this one deployed expert. Listing is bounded to
30 latest jobs and 1000 objects in the run prefix; a larger inventory fails
explicitly rather than returning an incomplete list. General expert onboarding
and paginated history need a later scope extension.

## Deployment and recovery

- Amplify deploys `forgeVisual`, its AppSync query/mutation, SQS and the worker.
  The worker bundles Sharp as a native Linux dependency through NodejsFunction.
- Secrets: `gbautomation/core/openai-api-key` and
  `gbautomation/providers/meshy`, both server-only, exact IAM resources.
- The operator group is assigned only to Greg's verified existing subject.
- Source checks: `node --test amplify/functions/forge-atlas/*.test.mjs
  amplify/functions/forge-visual/*.test.mjs`, TypeScript, ESLint, production build.
- `node scripts/validate-forge-visual.mjs` tests the real React UI and GLTFLoader
  offline with synthetic provider outputs. It does not prove paid generation.
- Live acceptance must verify tenant/operator denials, save/reload, private
  routing, and unsigned S3 denial. Use suppressed temporary Cognito accounts,
  delete them afterward, and never buy model generations as an implicit test.
- Rollback the website release and restore the prior private document version.
  Preserve the visual prefix and queue receipts; stop the event source before
  reverting worker code if work is pending. Never delete completed jobs.

Provider contracts checked 2026-09-25:
[OpenAI image edits](https://developers.openai.com/api/docs/guides/image-generation),
[Meshy image-to-3D](https://docs.meshy.ai/en/api/image-to-3d),
[remesh](https://docs.meshy.ai/en/api/remesh),
[pricing](https://docs.meshy.ai/en/api/pricing).
# Card previews and reusable avatars

New jobs have `output_version: 2` as well as the existing five-stage pipeline.
The card editor offers three local Artist Packet writing treatments and per-field
choices, an immediate layout mockup, and editable final text. Saving binds the
exact final fields to the assembly approval; this preview makes no provider call.

The portrait worker derives 32/64/128 px PNGs with Sharp. Each immutable output
keeps its portrait input hash, measured dimensions and run route. Partial failure
resumes derivation from saved pixels without another billable submission. Portrait
review includes these small outputs. Older jobs keep their original packet rules.

The package gallery shows ten assets plus five JSON records, with pending and
review states. An approved ZIP requires the original stage reviews, derivative
lineage/dimensions and measured web gate. Adoption carries all three sizes; the
host verifies the 64 px version before sending it to the matching private expert.
Proposal ownership does not imply assignment: missing assignees stay unassigned.
