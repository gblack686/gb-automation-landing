import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';

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

const FALLBACK_BRANDS = [
  { id: 'brand-vaincourt', slug: 'vaincourt_paris', handle: 'vaincourt_paris', name: 'Vaincourt Paris', platform: 'instagram', item_count: 2, last_scraped_at: '2026-05-28T19:45:05Z', active: true },
  { id: 'brand-amanu', slug: 'amanustudio', handle: 'amanustudio', name: 'Amanu Studio', platform: 'shopify', item_count: 2, last_scraped_at: '2026-05-28T19:45:05Z', active: true },
  { id: 'brand-themall', slug: 'themall.app', handle: 'themall.app', name: 'The Mall App', platform: 'instagram', item_count: 1, last_scraped_at: '2026-05-28T19:45:05Z', active: true },
];

const FALLBACK_ITEMS = {
  vaincourt_paris: [
    { item_id: 'item-vaincourt-classic-belt', source_item_id: 'ig-vaincourt-001', item_type: 'product', title: 'Classic belt', description: 'Polished leather belt with gold hardware.', url: 'https://www.instagram.com/vaincourt_paris/', image_urls: [], price: 340, currency: 'USD', sale_price: 285, compare_at_price: 340, available: true, first_seen_at: '2026-05-28T19:45:05Z', last_seen_at: '2026-05-28T19:45:05Z', raw_json: { platform: 'instagram', handle: 'vaincourt_paris', source: 'client-fallback' } },
    { item_id: 'item-vaincourt-wrap-belt', source_item_id: 'ig-vaincourt-002', item_type: 'product', title: 'Wrap waist belt', description: 'Long wrap silhouette in black calfskin.', url: 'https://www.instagram.com/vaincourt_paris/', image_urls: [], price: 410, currency: 'USD', sale_price: null, compare_at_price: null, available: true, first_seen_at: '2026-05-28T19:45:05Z', last_seen_at: '2026-05-28T19:45:05Z', raw_json: { platform: 'instagram', handle: 'vaincourt_paris', source: 'client-fallback' } },
  ],
  amanustudio: [
    { item_id: 'item-amanu-sandal', source_item_id: 'shopify-amanu-001', item_type: 'product', title: 'Made-to-order sandal', description: 'Custom leather sandal with natural sole.', url: 'https://amanustudio.com/', image_urls: [], price: 220, currency: 'USD', sale_price: 176, compare_at_price: 220, available: true, first_seen_at: '2026-05-28T19:45:05Z', last_seen_at: '2026-05-28T19:45:05Z', raw_json: { platform: 'shopify', handle: 'amanustudio', source: 'client-fallback' } },
    { item_id: 'item-amanu-wrap-slide', source_item_id: 'shopify-amanu-002', item_type: 'product', title: 'Wrap slide', description: 'Minimal slide with hand-tied straps.', url: 'https://amanustudio.com/', image_urls: [], price: 190, currency: 'USD', sale_price: null, compare_at_price: null, available: true, first_seen_at: '2026-05-28T19:45:05Z', last_seen_at: '2026-05-28T19:45:05Z', raw_json: { platform: 'shopify', handle: 'amanustudio', source: 'client-fallback' } },
  ],
  'themall.app': [
    { item_id: 'item-themall-watchlist', source_item_id: 'ig-themall-001', item_type: 'post', title: 'Editorial watchlist', description: 'Tracked social catalog post for The Mall app.', url: 'https://www.instagram.com/themall.app/', image_urls: [], price: null, currency: 'USD', sale_price: null, compare_at_price: null, available: true, first_seen_at: '2026-05-28T19:45:05Z', last_seen_at: '2026-05-28T19:45:05Z', raw_json: { platform: 'instagram', handle: 'themall.app', source: 'client-fallback' } },
  ],
};

const FALLBACK_EVENTS = [
  { id: 'evt-vaincourt-drop', brand_name: 'Vaincourt Paris', item_title: 'Classic belt', event_type: 'price_drop', previous_price: 340, current_price: 285, detected_at: '2026-05-28T19:45:05Z' },
  { id: 'evt-amanu-sale', brand_name: 'Amanu Studio', item_title: 'Made-to-order sandal', event_type: 'sale_start', previous_price: 220, current_price: 176, detected_at: '2026-05-28T19:45:05Z' },
];

const FALLBACK_LATEST_RUN = { run_id: 'dryrun-2026-05-28', source_handle: 'client-fallback', source_platform: 'fixture', status: 'dry_run', item_count: 5, scraped_at: '2026-05-28T19:45:05Z' };

function inferTarget(sourceUrl) {
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error('Enter a valid crawl URL');
  }
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  const pathParts = parsed.pathname.split('/').filter(Boolean);
  const platform = host.includes('instagram.com')
    ? 'instagram'
    : host.includes('shopify.com') || host.includes('myshopify.com')
      ? 'shopify'
      : 'website';
  const handle = platform === 'instagram' ? (pathParts[0] || host) : host;
  return {
    sourceUrl: parsed.toString(),
    handle: handle.toLowerCase(),
    displayName: handle.replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    platform,
    status: 'queued',
    submittedAt: new Date().toISOString(),
  };
}

function targetToBrand(target) {
  return {
    id: target.id,
    slug: target.handle,
    handle: target.handle,
    name: target.displayName || target.handle,
    display_name: target.displayName || target.handle,
    platform: target.platform || 'website',
    status: target.status || 'queued',
    source_url: target.sourceUrl,
    active: target.status !== 'paused',
    item_count: 0,
    last_scraped_at: target.lastRunAt || target.submittedAt,
    pending: target.status === 'queued',
  };
}

function getAmplifyClient() {
  return generateClient();
}

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
  return request('/api/mall-scanner/dashboard').catch(() => ({
    brands_tracked: FALLBACK_BRANDS.length,
    items_indexed: Object.values(FALLBACK_ITEMS).reduce((sum, rows) => sum + rows.length, 0),
    sale_events: FALLBACK_EVENTS.length,
    latest_run: FALLBACK_LATEST_RUN,
    source: 'client-fallback',
  }));
}

export function getBrands() {
  return request('/api/mall-scanner/brands').catch(() => ({ brands: FALLBACK_BRANDS, source: 'client-fallback' }));
}

export function getBrandItems(brandSlug) {
  return request(`/api/mall-scanner/brands/${brandSlug}/items`).catch(() => ({
    brand: brandSlug,
    items: FALLBACK_ITEMS[brandSlug] || [],
    source: 'client-fallback',
  }));
}

export function addCrawlTarget(sourceUrl) {
  const target = inferTarget(sourceUrl);
  const client = getAmplifyClient();
  return client.models.MallCrawlTarget.create(target).then(({ data, errors }) => {
    if (errors && errors.length) throw new Error(errors[0].message);
    return {
      target: data,
      brand: targetToBrand(data || target),
      source: 'amplify',
    };
  });
}

export function listCrawlTargets() {
  const client = getAmplifyClient();
  return client.models.MallCrawlTarget.list().then(({ data, errors }) => {
    if (errors && errors.length) throw new Error(errors[0].message);
    return {
      targets: data || [],
      brands: (data || []).map(targetToBrand),
      source: 'amplify',
    };
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
  return request('/api/mall-scanner/events').catch(() => ({ events: FALLBACK_EVENTS, source: 'client-fallback' }));
}

export function getLatestRun() {
  return request('/api/mall-scanner/latest-run').catch(() => ({ latest_run: FALLBACK_LATEST_RUN, source: 'client-fallback' }));
}
