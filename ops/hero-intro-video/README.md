# Greg's homepage introduction

Replaces the hero placeholder immediately below the subtitle with Greg's
provided `Avatar_Video_v2.mp4`. The whole 107.12-second recording is retained,
with its original portrait framing and audio.

The published copy is 720 x 1280 H.264 with AAC audio and faststart metadata,
encoded with FFmpeg at CRF 23 and 128 kb/s audio. It is 13,891,415 bytes instead
of the source's 92,243,750 bytes. The poster is the frame at two seconds, scaled
to 540 x 960. Source and published hashes are recorded in `media.json`.

The player uses a local poster and `preload="none"` so the MP4 is requested only
when a visitor presses play. It does not autoplay or loop. Native controls,
inline playback, keyboard activation, and a direct-video error link are
available. The portrait frame is never cropped.

Validation uses the existing homepage checker, including real media playback,
pause and seeking, poster loading, deferred download, and 390px/320px layouts.
The checker defaults to installed Chrome because bundled Playwright Chromium
in this environment does not include H.264/AAC playback support.

```powershell
python ops/homepage-preview/check.py --monorepo C:/tmp/gbauto-worktrees/codex-session-20260917-forge-lead-magnet --static-preview --output ops/hero-intro-video/local-validation
```

The source recording stays in Downloads. Only the optimized public copy and
poster are published; the existing homepage sections and Forge preview remain.

Local validation passed all 101 checks with no browser errors. The production
build and focused component ESLint passed. HTTP range requests return 206 with
`video/mp4` and the correct total length. Audio is present (first 12 seconds:
mean -18.8 dB, peak -3.5 dB). The unsupported-codec browser displayed the direct
video fallback correctly. Screenshots are local-only; the validation receipt is
tracked.
