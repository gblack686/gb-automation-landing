import { fetchAuthSession } from 'aws-amplify/auth';

const DEFAULT_BASE_URL = 'https://gbautoxyz.netlify.app';

const CRAWLER_CODE_FALLBACK = `# Mall Scanner crawler

Runtime:
- Host: Mac Mini
- Agent profile: mall-scraper
- Skill: ~/.hermes/skills/research/social-catalog-scraper/
- Command shape:
  hermes -p mall-scraper exec "scrape <brand-source-url>"

Flow:
1. Read due brand from mall_brands.
2. Route by platform: Instagram, Shopify, WooCommerce, or generic website.
3. Normalize records into mall_items with raw_json preserved.
4. Append price observations to mall_price_history.
5. Insert scrape_runs receipt with status, item_count, output_dir, and raw_json.
6. Diff against previous run and emit sale, price-drop, restock, or removal events.

On-demand run payload:
{
  "brand": {
    "handle": "brand-handle",
    "platform": "instagram|shopify|website",
    "source_url": "https://..."
  },
  "requested_at": "ISO-8601 timestamp",
  "source": "mall-scanner-ui"
}

Production wiring:
- The UI calls POST /api/mall-scanner/runs.
- The API can forward to MALL_SCANNER_RUN_WEBHOOK_URL when that env var is set.
- Without a live runner webhook, Run Now returns a dry-run receipt.`;

function apiBaseUrl() {
  return (import.meta.env.VITE_MALL_SCANNER_API_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
}

async function authHeaders() {
  try {
    const session = await fetchAuthSession();
    const token = session?.tokens?.idToken?.toString();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(await authHeaders()),
    ...(options.headers || {}),
  };
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Mall Scanner API ${response.status}`);
  }
  return data;
}

export function getDashboard() {
  return request('/api/mall-scanner/dashboard');
}

export function getBrands() {
  return request('/api/mall-scanner/brands');
}

export function getBrandItems(brandSlug) {
  return request(`/api/mall-scanner/brands/${brandSlug}/items`);
}

export function addCrawlTarget(sourceUrl) {
  return request('/api/mall-scanner/crawl-targets', {
    method: 'POST',
    body: JSON.stringify({ source_url: sourceUrl }),
  });
}

export function runCrawlNow(brand) {
  return request('/api/mall-scanner/runs', {
    method: 'POST',
    body: JSON.stringify({ brand }),
  }).catch(() => ({
    receipt: {
      run_id: `manual-${brand.handle || brand.slug || brand.name || 'shop'}-${Date.now()}`,
      source_handle: brand.handle || brand.slug || brand.name || 'shop',
      source_platform: brand.platform || 'website',
      source_url: brand.source_url || brand.url || '',
      status: 'dry_run',
      requested_at: new Date().toISOString(),
      command: `hermes -p mall-scraper exec "scrape ${brand.source_url || brand.url || brand.handle || brand.slug || brand.name || 'shop'}"`,
      item_count: 0,
    },
    source: 'client-fallback',
  }));
}

export function getCrawlerCode() {
  return request('/api/mall-scanner/crawler-code').catch(() => ({
    title: 'Mall Scanner crawler',
    language: 'text',
    entrypoint: 'hermes -p mall-scraper exec "scrape <brand-source-url>"',
    code: CRAWLER_CODE_FALLBACK,
    source: 'client-fallback',
  }));
}

export function getRecentEvents() {
  return request('/api/mall-scanner/events');
}

export function getLatestRun() {
  return request('/api/mall-scanner/latest-run');
}
