# Private Forge visual generation

The Artist Packet workspace uses the existing Cognito tenant boundary. The
`forge-visual-operator` group additionally controls all generation and approval
mutations. Other tenant members can review saved outputs. No anonymous access.

The opaque Studio frame opens the host's Character Studio with a selected visual
brief. It never receives a provider key or Cognito token. Saving creates a job
without a provider call. Four explicit, version-bound charge decisions run one
portrait, one full character, one 30-credit Meshy master, and one 5-credit remesh.
OpenAI image charges are separate token-based charges, each limited to one low
quality edit. There is no automatic paid retry or alternative generation.

Inputs are immutable after creation. The server pins tenant, expert and config
SHA and resolves the exact Scryfall printing/face itself. It uploads actual card
pixels to OpenAI, approved portrait pixels to the second edit, and approved full
character pixels to Meshy. Operator notes cannot supply URLs or output paths.

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
