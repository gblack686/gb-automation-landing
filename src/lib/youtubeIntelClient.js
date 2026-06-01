/**
 * YouTube Intel client.
 *
 * Source of truth is the static JSON written by scripts/youtube-intel/scrape.mjs
 * (see docs/youtube-intel.md). Fetched from the deployed site under
 * /apps/youtube-intel/ so no backend is required to render the app.
 */

const DATA_BASE_PATH = '/apps/youtube-intel';

async function fetchJson(path) {
  const url = `${DATA_BASE_PATH}${path}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`YouTube Intel data ${response.status} at ${url}`);
  }
  return response.json();
}

export function getDashboard() {
  return fetchJson('/dashboard.json');
}

export function getChannels() {
  return fetchJson('/channels.json');
}

export function getVideos() {
  return fetchJson('/videos.json');
}

export function getLatestRun() {
  return fetchJson('/latest-run.json');
}
