const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const RUN_WEBHOOK_URL = process.env.MALL_SCANNER_RUN_WEBHOOK_URL || '';

const crawlerCode = `# Mall Scanner crawler

Runtime:
- Host: Mac Mini
- Agent profile: mall-scraper
- Skill: ~/.hermes/skills/research/social-catalog-scraper/
- Command shape:
  hermes -p mall-scraper exec "scrape <brand-source-url>"

Flow:
1. Read due brand from mall_brands.
2. Route by platform:
   - instagram -> social post/catalog crawl with full pagination
   - shopify -> storefront product crawl
   - woocommerce/generic website -> catalog page discovery
3. Normalize each record to mall_items:
   item_id, brand_id, source_item_id, item_type, title, description, url,
   image_urls, price, currency, sale_price, compare_at_price, available,
   raw_json, first_seen_at, last_seen_at, removed_at
4. Append observations to mall_price_history.
5. Insert scrape_runs receipt with status, item_count, output_dir, error, raw_json.
6. Diff vs previous run and emit sale / price-drop / restock / removal events.

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
- Set MALL_SCANNER_RUN_WEBHOOK_URL on Netlify to call the Mac Mini/Hermes runner.
- The webhook should execute the Hermes command above and persist the scrape_runs row.
- Without that env var, this API returns a dry_run receipt so the UI remains testable.`;

const fixture = {
  brands: [
    { id: 'brand-vaincourt', slug: 'vaincourt_paris', name: 'Vaincourt Paris', platform: 'instagram', item_count: 42, last_scraped_at: '2026-05-28T19:45:05Z', active: true },
    { id: 'brand-amanu', slug: 'amanustudio', name: 'Amanu Studio', platform: 'shopify', item_count: 36, last_scraped_at: '2026-05-28T19:45:05Z', active: true },
    { id: 'brand-themall', slug: 'themall.app', name: 'The Mall App', platform: 'instagram', item_count: 12, last_scraped_at: '2026-05-28T19:45:05Z', active: true },
  ],
  items: {
    vaincourt_paris: [
      {
        item_id: 'item-vaincourt-classic-belt',
        source_item_id: 'ig-vaincourt-001',
        item_type: 'product',
        title: 'Classic belt',
        description: 'Polished leather belt with gold hardware.',
        url: 'https://www.instagram.com/vaincourt_paris/',
        image_urls: [],
        price: 340,
        currency: 'USD',
        sale_price: 285,
        compare_at_price: 340,
        available: true,
        first_seen_at: '2026-05-28T19:45:05Z',
        last_seen_at: '2026-05-28T19:45:05Z',
        raw_json: { platform: 'instagram', handle: 'vaincourt_paris', source: 'fixture' },
      },
      {
        item_id: 'item-vaincourt-wrap-belt',
        source_item_id: 'ig-vaincourt-002',
        item_type: 'product',
        title: 'Wrap waist belt',
        description: 'Long wrap silhouette in black calfskin.',
        url: 'https://www.instagram.com/vaincourt_paris/',
        image_urls: [],
        price: 410,
        currency: 'USD',
        sale_price: null,
        compare_at_price: null,
        available: true,
        first_seen_at: '2026-05-28T19:45:05Z',
        last_seen_at: '2026-05-28T19:45:05Z',
        raw_json: { platform: 'instagram', handle: 'vaincourt_paris', source: 'fixture' },
      },
    ],
    amanustudio: [
      {
        item_id: 'item-amanu-sandal',
        source_item_id: 'shopify-amanu-001',
        item_type: 'product',
        title: 'Made-to-order sandal',
        description: 'Custom leather sandal with natural sole.',
        url: 'https://amanustudio.com/',
        image_urls: [],
        price: 220,
        currency: 'USD',
        sale_price: 176,
        compare_at_price: 220,
        available: true,
        first_seen_at: '2026-05-28T19:45:05Z',
        last_seen_at: '2026-05-28T19:45:05Z',
        raw_json: { platform: 'shopify', handle: 'amanustudio', source: 'fixture' },
      },
      {
        item_id: 'item-amanu-wrap-slide',
        source_item_id: 'shopify-amanu-002',
        item_type: 'product',
        title: 'Wrap slide',
        description: 'Minimal slide with hand-tied straps.',
        url: 'https://amanustudio.com/',
        image_urls: [],
        price: 190,
        currency: 'USD',
        sale_price: null,
        compare_at_price: null,
        available: true,
        first_seen_at: '2026-05-28T19:45:05Z',
        last_seen_at: '2026-05-28T19:45:05Z',
        raw_json: { platform: 'shopify', handle: 'amanustudio', source: 'fixture' },
      },
    ],
    'themall.app': [
      {
        item_id: 'item-themall-watchlist',
        source_item_id: 'ig-themall-001',
        item_type: 'post',
        title: 'Editorial watchlist',
        description: 'Tracked social catalog post for The Mall app.',
        url: 'https://www.instagram.com/themall.app/',
        image_urls: [],
        price: null,
        currency: 'USD',
        sale_price: null,
        compare_at_price: null,
        available: true,
        first_seen_at: '2026-05-28T19:45:05Z',
        last_seen_at: '2026-05-28T19:45:05Z',
        raw_json: { platform: 'instagram', handle: 'themall.app', source: 'fixture' },
      },
    ],
  },
  events: [
    { id: 'evt-vaincourt-drop', brand_name: 'Vaincourt Paris', item_title: 'Classic belt', event_type: 'price_drop', previous_price: 340, current_price: 285, detected_at: '2026-05-28T19:45:05Z' },
    { id: 'evt-amanu-sale', brand_name: 'Amanu Studio', item_title: 'Made-to-order sandal', event_type: 'sale_start', previous_price: 220, current_price: 176, detected_at: '2026-05-28T19:45:05Z' },
  ],
  latest_run: { run_id: 'dryrun-2026-05-28', source_handle: 'fixture', source_platform: 'fixture', status: 'dry_run', item_count: 90, scraped_at: '2026-05-28T19:45:05Z' },
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

async function supabase(path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function supabaseInsert(path, body) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function postRunWebhook(payload) {
  if (!RUN_WEBHOOK_URL) return null;
  const response = await fetch(RUN_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Run webhook ${response.status}: ${await response.text()}`);
  }
  return response.json().catch(() => ({}));
}

function inferTarget(sourceUrl) {
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    const error = new Error('Enter a valid crawl URL');
    error.statusCode = 400;
    throw error;
  }
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  const pathParts = parsed.pathname.split('/').filter(Boolean);
  const platform = host.includes('instagram.com')
    ? 'instagram'
    : host.includes('shopify.com') || host.includes('myshopify.com')
      ? 'shopify'
      : 'website';
  const handle = platform === 'instagram'
    ? (pathParts[0] || host)
    : host;
  return {
    handle: handle.toLowerCase(),
    display_name: handle.replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    platform,
    source_url: parsed.toString(),
    status: 'active',
    scrape_cadence: 'daily',
  };
}

async function liveBrands() {
  return supabase('mall_brands?select=brand_id,handle,display_name,platform,status,last_scraped_at&order=handle.asc');
}

async function liveEvents() {
  return supabase('mall_price_history?select=history_id,scraped_at,price,sale_price,available,mall_items(title,mall_brands(display_name,handle))&order=scraped_at.desc&limit=25');
}

async function liveLatestRun() {
  const rows = await supabase('scrape_runs?select=*&order=scraped_at.desc&limit=1');
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function liveBrandBySlug(slug) {
  const rows = await supabase(`mall_brands?select=brand_id,handle,display_name,platform,status,last_scraped_at&handle=eq.${encodeURIComponent(slug)}&limit=1`);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function liveBrandItems(slug) {
  const brand = await liveBrandBySlug(slug);
  if (!brand?.brand_id) return [];
  return supabase(`mall_items?select=item_id,source_item_id,item_type,title,description,url,image_urls,price,currency,sale_price,compare_at_price,available,raw_json,first_seen_at,last_seen_at,removed_at&brand_id=eq.${encodeURIComponent(brand.brand_id)}&order=last_seen_at.desc`);
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return json(204, {});
  }

  const originalPath = event.path || '';
  const route = originalPath.replace(/^.*\/api\/mall-scanner\/?/, '').replace(/^.*\/mall-scanner\/?/, '');

  try {
    if (route === 'crawler-code') {
      return json(200, {
        title: 'Mall Scanner crawler',
        language: 'text',
        entrypoint: 'hermes -p mall-scraper exec "scrape <brand-source-url>"',
        code: crawlerCode,
      });
    }

    if (event.httpMethod === 'POST' && route === 'crawl-targets') {
      const body = event.body ? JSON.parse(event.body) : {};
      const sourceUrl = String(body.source_url || body.url || '').trim();
      if (!sourceUrl) {
        return json(400, { error: 'source_url is required' });
      }
      const target = inferTarget(sourceUrl);
      const rows = SUPABASE_URL && SUPABASE_SERVICE_KEY
        ? await supabaseInsert('mall_brands', target)
        : [{ ...target, id: `queued-${Date.now()}`, queued: true }];
      return json(201, { target: rows[0] || target, source: SUPABASE_URL && SUPABASE_SERVICE_KEY ? 'supabase' : 'fixture' });
    }

    if (event.httpMethod === 'POST' && route === 'runs') {
      const body = event.body ? JSON.parse(event.body) : {};
      const brand = body.brand || {};
      const handle = String(brand.handle || brand.slug || brand.name || '').trim();
      if (!handle) {
        return json(400, { error: 'brand.handle is required' });
      }
      const requestedAt = new Date().toISOString();
      const payload = {
        brand: {
          handle,
          platform: brand.platform || 'website',
          source_url: brand.source_url || brand.url || '',
          display_name: brand.display_name || brand.name || handle,
        },
        requested_at: requestedAt,
        source: 'mall-scanner-ui',
      };
      const webhookResult = await postRunWebhook(payload);
      const receipt = webhookResult?.receipt || {
        run_id: `manual-${handle}-${Date.now()}`,
        source_handle: handle,
        source_platform: payload.brand.platform,
        source_url: payload.brand.source_url,
        status: webhookResult ? 'queued' : 'dry_run',
        requested_at: requestedAt,
        command: `hermes -p mall-scraper exec "scrape ${payload.brand.source_url || handle}"`,
        item_count: 0,
      };
      return json(202, {
        receipt,
        source: webhookResult ? 'webhook' : 'fixture',
      });
    }

    if (route === 'dashboard' || route === '') {
      const [brands, events, latestRun] = SUPABASE_URL && SUPABASE_SERVICE_KEY
        ? await Promise.all([liveBrands(), liveEvents(), liveLatestRun()])
        : [fixture.brands, fixture.events, fixture.latest_run];
      return json(200, {
        brands_tracked: brands.length,
        items_indexed: brands.reduce((sum, brand) => sum + Number(brand.item_count || 0), 0) || 90,
        sale_events: events.length,
        latest_run: latestRun,
        source: SUPABASE_URL && SUPABASE_SERVICE_KEY ? 'supabase' : 'fixture',
      });
    }

    if (route === 'brands') {
      const rows = SUPABASE_URL && SUPABASE_SERVICE_KEY ? await liveBrands() : fixture.brands;
      const brands = rows.map((brand) => ({
        id: brand.brand_id || brand.id,
        slug: brand.handle || brand.slug,
        name: brand.display_name || brand.name || brand.handle,
        platform: brand.platform,
        status: brand.status,
        active: brand.active ?? brand.status !== 'paused',
        last_scraped_at: brand.last_scraped_at,
        item_count: brand.item_count || 0,
      }));
      return json(200, { brands });
    }

    if (route === 'events') {
      if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
        const rows = await liveEvents();
        return json(200, { events: rows.map((row) => ({
          id: row.history_id,
          brand_name: row.mall_items?.mall_brands?.display_name || row.mall_items?.mall_brands?.handle || 'Unknown brand',
          item_title: row.mall_items?.title || 'Untitled item',
          event_type: row.sale_price ? 'sale_start' : 'price_observation',
          previous_price: null,
          current_price: row.sale_price || row.price,
          detected_at: row.scraped_at,
        })) });
      }
      return json(200, { events: fixture.events });
    }

    if (route === 'latest-run') {
      const latest_run = SUPABASE_URL && SUPABASE_SERVICE_KEY ? await liveLatestRun() : fixture.latest_run;
      return json(200, { latest_run });
    }

    const brandItemsMatch = route.match(/^brands\/([^/]+)\/items$/);
    if (brandItemsMatch) {
      const brandSlug = decodeURIComponent(brandItemsMatch[1]);
      const rows = SUPABASE_URL && SUPABASE_SERVICE_KEY ? await liveBrandItems(brandSlug) : (fixture.items[brandSlug] || []);
      return json(200, { brand: brandSlug, items: rows });
    }

    return json(404, { error: `Unknown Mall Scanner route: ${route}` });
  } catch (error) {
    return json(error.statusCode || 500, { error: error.message || 'Mall Scanner API error' });
  }

}
