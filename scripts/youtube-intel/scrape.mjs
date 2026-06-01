#!/usr/bin/env node
/**
 * YouTube Intel daily scrape.
 *
 * Pulls recent uploads for each enabled channel from YouTube's public RSS
 * feed (no API key, no secret needed) and writes deterministic JSON that
 * the /apps/youtube-intel UI consumes.
 *
 * Usage:
 *   node scripts/youtube-intel/scrape.mjs               # live scrape
 *   node scripts/youtube-intel/scrape.mjs --dry-run     # fetch but do not write
 *   node scripts/youtube-intel/scrape.mjs --sample      # bundled sample data, no network
 *   node scripts/youtube-intel/scrape.mjs --max 10      # max recent videos per channel (default 5)
 *
 * Output (relative to repo root):
 *   public/apps/youtube-intel/dashboard.json
 *   public/apps/youtube-intel/channels.json
 *   public/apps/youtube-intel/videos.json
 *   public/apps/youtube-intel/latest-run.json
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(__dirname, 'channels.json');
const OUT_DIR = path.join(REPO_ROOT, 'public', 'apps', 'youtube-intel');

const RSS_BASE = 'https://www.youtube.com/feeds/videos.xml?channel_id=';
const USER_AGENT =
  'gb-automation-landing/youtube-intel (https://github.com/gbauto/gbautomation)';

function parseArgs(argv) {
  const args = { dryRun: false, sample: false, max: 5 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--sample') args.sample = true;
    else if (a === '--max') {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) args.max = n;
    } else if (a.startsWith('--max=')) {
      const n = Number(a.split('=')[1]);
      if (Number.isFinite(n) && n > 0) args.max = n;
    } else if (a === '-h' || a === '--help') {
      console.log(
        'Usage: node scripts/youtube-intel/scrape.mjs [--dry-run] [--sample] [--max N]'
      );
      process.exit(0);
    }
  }
  return args;
}

async function loadConfig() {
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.channels)) {
    throw new Error(`Invalid channels config at ${CONFIG_PATH} — missing channels[]`);
  }
  return parsed;
}

function decodeEntities(s) {
  return String(s ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function extractAll(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

function extractFirst(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const m = re.exec(xml);
  return m ? m[1] : '';
}

function extractAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"[^>]*\\/?>`);
  const m = re.exec(xml);
  return m ? m[1] : '';
}

function parseRss(xml) {
  const channelName = decodeEntities(
    extractFirst(extractFirst(xml, 'author') || '', 'name')
  );
  const entries = extractAll(xml, 'entry').map((entry) => {
    const videoId = extractFirst(entry, 'yt:videoId');
    const title = decodeEntities(extractFirst(entry, 'title'));
    const published = extractFirst(entry, 'published');
    const updated = extractFirst(entry, 'updated');
    const link = extractAttr(entry, 'link', 'href') ||
      (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '');
    const author = decodeEntities(
      extractFirst(extractFirst(entry, 'author') || '', 'name')
    );
    return {
      video_id: videoId,
      title,
      url: link,
      published_at: published,
      updated_at: updated,
      channel_name: author || channelName,
    };
  });
  return { channelName, entries };
}

async function fetchRss(channelId) {
  const url = `${RSS_BASE}${encodeURIComponent(channelId)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`RSS ${res.status} for ${channelId}: ${body.slice(0, 200)}`);
  }
  return res.text();
}

function sampleFeed(channel) {
  const now = new Date();
  const day = (offset) => {
    const d = new Date(now.getTime() - offset * 86400000);
    return d.toISOString();
  };
  return {
    channelName: channel.name,
    entries: [
      {
        video_id: `${channel.slug}-sample-1`,
        title: `${channel.name} — sample upload one`,
        url: `https://www.youtube.com/watch?v=${channel.slug}-sample-1`,
        published_at: day(0),
        updated_at: day(0),
        channel_name: channel.name,
      },
      {
        video_id: `${channel.slug}-sample-2`,
        title: `${channel.name} — sample upload two`,
        url: `https://www.youtube.com/watch?v=${channel.slug}-sample-2`,
        published_at: day(2),
        updated_at: day(2),
        channel_name: channel.name,
      },
    ],
  };
}

async function scrapeChannel(channel, { sample }) {
  if (sample) return { ok: true, parsed: sampleFeed(channel), error: null };
  if (!channel.channel_id) {
    return {
      ok: false,
      parsed: { channelName: channel.name, entries: [] },
      error: 'missing channel_id (RSS requires UC... id)',
    };
  }
  try {
    const xml = await fetchRss(channel.channel_id);
    return { ok: true, parsed: parseRss(xml), error: null };
  } catch (err) {
    return {
      ok: false,
      parsed: { channelName: channel.name, entries: [] },
      error: err.message,
    };
  }
}

function buildArtifacts(config, channelResults, args, startedAt) {
  const channels = config.channels.map((channel) => {
    const result = channelResults.find((r) => r.slug === channel.slug);
    return {
      slug: channel.slug,
      name: channel.name,
      handle: channel.handle ?? null,
      channel_id: channel.channel_id ?? null,
      priority: channel.priority ?? 'medium',
      enabled: channel.enabled !== false,
      tags: channel.tags ?? [],
      last_status: result?.ok ? 'ok' : 'error',
      last_error: result?.error ?? null,
      last_scraped_at: result?.scraped_at ?? null,
      video_count: result?.videos?.length ?? 0,
    };
  });

  const allVideos = channelResults
    .flatMap((r) =>
      (r.videos || []).map((v) => ({
        ...v,
        channel_slug: r.slug,
        status: 'indexed',
      }))
    )
    .filter((v) => v.video_id)
    .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));

  const dedupeVideos = [];
  const seen = new Set();
  for (const v of allVideos) {
    if (seen.has(v.video_id)) continue;
    seen.add(v.video_id);
    dedupeVideos.push(v);
  }

  const enabledChannels = channels.filter((c) => c.enabled).length;
  const errored = channels.filter((c) => c.last_status === 'error');

  const latestRun = {
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    mode: args.sample ? 'sample' : args.dryRun ? 'dry-run' : 'live',
    max_videos_per_channel: args.max,
    channels_scanned: channels.length,
    channels_enabled: enabledChannels,
    channels_ok: channels.filter((c) => c.last_status === 'ok').length,
    channels_error: errored.length,
    videos_indexed: dedupeVideos.length,
    errors: errored.map((c) => ({
      slug: c.slug,
      name: c.name,
      error: c.last_error,
    })),
    next_steps:
      errored.length > 0
        ? 'Resolve channel errors above (verify channel_id is a UC... id; confirm network egress to youtube.com).'
        : 'Schedule daily via OpenClaw cron (see docs/youtube-intel.md).',
  };

  const dashboard = {
    schema_version: 1,
    generated_at: latestRun.finished_at,
    mode: latestRun.mode,
    enabled_channels: enabledChannels,
    videos: dedupeVideos.length,
    transcripts: 0,
    summaries: 0,
    recent_videos: dedupeVideos.slice(0, Math.max(args.max * channels.length, 25)),
    latest_run: latestRun,
  };

  const videosArtifact = {
    schema_version: 1,
    generated_at: latestRun.finished_at,
    count: dedupeVideos.length,
    videos: dedupeVideos,
  };

  const channelsArtifact = {
    schema_version: 1,
    generated_at: latestRun.finished_at,
    count: channels.length,
    channels,
  };

  return { dashboard, videos: videosArtifact, channels: channelsArtifact, latestRun };
}

async function writeJson(target, payload) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

async function main() {
  const args = parseArgs(process.argv);
  const startedAt = new Date().toISOString();

  console.log(
    `[youtube-intel] mode=${args.sample ? 'sample' : args.dryRun ? 'dry-run' : 'live'} max=${args.max}`
  );

  const config = await loadConfig();
  const enabled = config.channels.filter((c) => c.enabled !== false);
  console.log(`[youtube-intel] scanning ${enabled.length} of ${config.channels.length} channels`);

  const results = [];
  for (const channel of config.channels) {
    if (channel.enabled === false) {
      results.push({
        slug: channel.slug,
        ok: true,
        videos: [],
        error: null,
        scraped_at: startedAt,
      });
      continue;
    }
    const scrapedAt = new Date().toISOString();
    const { ok, parsed, error } = await scrapeChannel(channel, args);
    const videos = (parsed.entries || []).slice(0, args.max);
    if (ok) {
      console.log(`  ok    ${channel.slug.padEnd(20)} ${videos.length} videos`);
    } else {
      console.error(`  error ${channel.slug.padEnd(20)} ${error}`);
    }
    results.push({ slug: channel.slug, ok, videos, error, scraped_at: scrapedAt });
  }

  const artifacts = buildArtifacts(config, results, args, startedAt);

  if (args.dryRun) {
    console.log('[youtube-intel] dry-run, not writing. Summary:');
    console.log(JSON.stringify(artifacts.latestRun, null, 2));
    return;
  }

  await Promise.all([
    writeJson(path.join(OUT_DIR, 'dashboard.json'), artifacts.dashboard),
    writeJson(path.join(OUT_DIR, 'channels.json'), artifacts.channels),
    writeJson(path.join(OUT_DIR, 'videos.json'), artifacts.videos),
    writeJson(path.join(OUT_DIR, 'latest-run.json'), artifacts.latestRun),
  ]);

  console.log(`[youtube-intel] wrote artifacts to ${path.relative(REPO_ROOT, OUT_DIR)}/`);
  console.log(
    `[youtube-intel] channels: ${artifacts.latestRun.channels_ok} ok, ${artifacts.latestRun.channels_error} error; videos: ${artifacts.latestRun.videos_indexed}`
  );
  if (artifacts.latestRun.channels_error > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[youtube-intel] fatal:', err.stack || err.message);
  process.exit(2);
});
