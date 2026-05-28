const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const fixture = {
  brands: [
    { id: 'brand-vaincourt', slug: 'vaincourt_paris', name: 'Vaincourt Paris', platform: 'instagram', item_count: 42, last_scraped_at: '2026-05-28T19:45:05Z', active: true },
    { id: 'brand-amanu', slug: 'amanustudio', name: 'Amanu Studio', platform: 'shopify', item_count: 36, last_scraped_at: '2026-05-28T19:45:05Z', active: true },
    { id: 'brand-themall', slug: 'themall.app', name: 'The Mall App', platform: 'instagram', item_count: 12, last_scraped_at: '2026-05-28T19:45:05Z', active: true },
  ],
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

export async function handler(event) {
  const originalPath = event.path || '';
  const route = originalPath.replace(/^.*\/api\/mall-scanner\/?/, '').replace(/^.*\/mall-scanner\/?/, '');

  try {
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
      return json(200, { brand: brandItemsMatch[1], items: [] });
    }

    return json(404, { error: `Unknown Mall Scanner route: ${route}` });
  } catch (error) {
    return json(500, { error: error.message || 'Mall Scanner API error' });
  }

}
