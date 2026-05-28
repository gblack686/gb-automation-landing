import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ExternalLink, Package, Plus, RefreshCw, Search, ShoppingBag, Store, Tag } from 'lucide-react';
import Footer from '../components/Footer';
import SignOutButton from '../components/SignOutButton';
import {
  addCrawlTarget,
  getBrandItems,
  getBrands,
  getDashboard,
  getLatestRun,
  getRecentEvents,
} from '../lib/mallScannerClient';

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="bg-white border border-[#D6D4C8] rounded-lg p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="text-xs uppercase tracking-widest text-[#191919]/50">{label}</span>
        <Icon className="w-4 h-4 text-[#D97757]" />
      </div>
      <div className="text-3xl font-serif text-[#191919]">{value ?? 0}</div>
    </div>
  );
}

const PLATFORM_COLORS = {
  shopify: 'bg-green-100 text-green-700',
  woocommerce: 'bg-purple-100 text-purple-700',
  instagram: 'bg-pink-100 text-pink-700',
  website: 'bg-blue-100 text-blue-700',
};

const EVENT_CHIPS = {
  sale_start: { label: 'Sale', className: 'bg-orange-100 text-orange-700' },
  price_drop: { label: 'Price Drop', className: 'bg-red-100 text-red-700' },
  new_item: { label: 'New Item', className: 'bg-green-100 text-green-700' },
  price_observation: { label: 'Observed', className: 'bg-gray-100 text-gray-600' },
};

function formatDate(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatPrice(value, currency = 'USD') {
  if (value == null || value === '') return '-';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value));
  } catch {
    return `$${Number(value).toFixed(2)}`;
  }
}

function brandSlug(brand) {
  return brand.slug || brand.handle || brand.id || brand.brand_id;
}

function itemJson(item) {
  return JSON.stringify(item.raw_json || item, null, 2);
}

function itemMatches(item, query) {
  if (!query) return true;
  const haystack = [
    item.title,
    item.description,
    item.item_type,
    item.source_item_id,
    item.url,
    itemJson(item),
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
}

function ItemCard({ item }) {
  const title = item.title || item.source_item_id || 'Untitled item';
  const price = item.sale_price ?? item.price;
  const hasSale = item.sale_price != null && item.compare_at_price != null;
  const imageUrl = Array.isArray(item.image_urls) && item.image_urls.length ? item.image_urls[0] : '';

  return (
    <article className="group relative min-h-[260px] rounded-lg border border-[#D6D4C8] bg-white p-4 shadow-sm">
      <div className="aspect-[4/3] rounded-md border border-[#D6D4C8]/70 bg-[#E6E4D9]/50 overflow-hidden flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Package className="h-8 w-8 text-[#191919]/25" />
        )}
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#191919]/45">{item.item_type || 'item'}</p>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold text-[#191919]">{title}</h3>
        </div>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-md border border-[#D6D4C8] p-2 text-[#191919]/55 hover:text-[#D97757]"
            aria-label={`Open ${title}`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#191919]/60">{item.description || 'No description captured yet.'}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-serif text-2xl text-[#191919]">{formatPrice(price, item.currency || 'USD')}</p>
          {hasSale && (
            <p className="text-xs text-[#191919]/45 line-through">
              {formatPrice(item.compare_at_price, item.currency || 'USD')}
            </p>
          )}
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${item.available === false ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'}`}>
          {item.available === false ? 'Unavailable' : 'Available'}
        </span>
      </div>

      <div className="pointer-events-none absolute left-3 right-3 top-3 z-20 hidden max-h-[88%] overflow-auto rounded-md border border-[#191919]/15 bg-[#191919] p-3 text-[11px] leading-5 text-white shadow-2xl group-hover:block">
        <pre className="whitespace-pre-wrap font-mono">{itemJson(item)}</pre>
      </div>
    </article>
  );
}

export default function MallScanner() {
  const [dashboard, setDashboard] = useState(null);
  const [brands, setBrands] = useState([]);
  const [events, setEvents] = useState([]);
  const [latestRun, setLatestRun] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [dash, brandsData, eventsData, runData] = await Promise.all([
        getDashboard(),
        getBrands(),
        getRecentEvents(),
        getLatestRun(),
      ]);
      const nextBrands = Array.isArray(brandsData) ? brandsData : (brandsData.brands || []);
      setDashboard(dash);
      setBrands(nextBrands);
      setEvents(Array.isArray(eventsData) ? eventsData : (eventsData.events || []));
      setLatestRun(runData?.latest_run ?? runData ?? null);
      if (!selectedBrand && nextBrands.length) {
        setSelectedBrand(brandSlug(nextBrands[0]));
      }
    } catch (err) {
      setError(err.message || 'Could not load Mall Scanner API');
    } finally {
      setLoading(false);
    }
  }

  async function loadItems(slug) {
    if (!slug) return;
    setItemsLoading(true);
    setError('');
    try {
      const data = await getBrandItems(slug);
      setItems(Array.isArray(data) ? data : (data.items || []));
    } catch (err) {
      setItems([]);
      setError(err.message || 'Could not load shop items');
    } finally {
      setItemsLoading(false);
    }
  }

  async function submitCrawlTarget(event) {
    event.preventDefault();
    const sourceUrl = newSiteUrl.trim();
    if (!sourceUrl) return;
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const result = await addCrawlTarget(sourceUrl);
      const target = result.target || {};
      setNotice(`${target.display_name || target.handle || sourceUrl} queued for crawling.`);
      setNewSiteUrl('');
      await load();
    } catch (err) {
      setError(err.message || 'Could not add crawl target');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadItems(selectedBrand);
  }, [selectedBrand]);

  const query = search.trim().toLowerCase();
  const selectedBrandRecord = brands.find((brand) => brandSlug(brand) === selectedBrand);
  const visibleBrands = useMemo(() => {
    if (!query) return brands;
    return brands.filter((brand) => [
      brand.name,
      brand.display_name,
      brand.handle,
      brand.slug,
      brand.platform,
      brand.status,
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [brands, query]);
  const visibleItems = useMemo(() => items.filter((item) => itemMatches(item, query)), [items, query]);

  const latestRunDisplay = latestRun
    ? `${formatDate(latestRun.scraped_at)} - ${latestRun.status || 'unknown'}`
    : 'No runs yet';

  return (
    <div className="min-h-screen bg-[#F3F1E7] selection:bg-[#D97757] selection:text-white">
      <header className="py-10 border-b border-[#D6D4C8]/60">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 hover-mini" aria-label="GB Automation home">
            <div className="w-4 h-4 bg-[#D97757]/20 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-[#D97757] rounded-full" />
            </div>
            <span className="text-xs font-serif font-semibold text-[#191919] tracking-widest uppercase">
              GB Automation
            </span>
          </Link>

          <nav className="flex items-center gap-4 text-xs uppercase tracking-widest">
            <Link to="/apps" className="text-[#191919] font-bold border-b border-[#D97757] pb-0.5">
              Apps
            </Link>
            <Link to="/artifacts" className="text-[#191919]/60 hover:text-[#D97757]">
              Artifacts
            </Link>
            <Link to="/plan" className="text-[#191919]/60 hover:text-[#D97757]">
              Plan
            </Link>
            <span className="w-px h-3 bg-[#D6D4C8]" aria-hidden="true" />
            <SignOutButton />
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-8">
          <div>
            <span className="text-[#D97757] text-xs font-bold tracking-widest uppercase">
              The Mall Scanner
            </span>
            <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#191919] tracking-tight mt-2 mb-4">
              Brand Catalog Console
            </h1>
            <p className="text-base text-[#191919]/70 max-w-2xl leading-relaxed">
              Add shops to crawl, inspect tracked catalogs, and review item source records from the scanner.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#191919] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#D97757] disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notice}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4 mb-8">
          <Metric icon={Store} label="Brands Tracked" value={dashboard?.brands_tracked} />
          <Metric icon={Package} label="Items Indexed" value={dashboard?.items_indexed} />
          <Metric icon={Tag} label="Sale Events" value={dashboard?.sale_events} />
          <div className="bg-white border border-[#D6D4C8] rounded-lg p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className="text-xs uppercase tracking-widest text-[#191919]/50">Latest Run</span>
              <Clock className="w-4 h-4 text-[#D97757]" />
            </div>
            <div className="text-sm font-medium text-[#191919] leading-snug">
              {loading ? '...' : latestRunDisplay}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] mb-8">
          <form onSubmit={submitCrawlTarget} className="bg-white border border-[#D6D4C8] rounded-lg p-4">
            <label htmlFor="crawl-target" className="block text-xs font-bold uppercase tracking-widest text-[#191919]/50 mb-2">
              Add site to crawl
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="crawl-target"
                type="url"
                value={newSiteUrl}
                onChange={(event) => setNewSiteUrl(event.target.value)}
                placeholder="https://shop.example.com or https://instagram.com/brand"
                className="min-h-11 flex-1 rounded-md border border-[#D6D4C8] bg-[#F3F1E7] px-3 text-sm text-[#191919] outline-none focus:border-[#D97757]"
              />
              <button
                type="submit"
                disabled={submitting || !newSiteUrl.trim()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#191919] px-4 text-sm font-semibold text-white hover:bg-[#D97757] disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </form>

          <div className="bg-white border border-[#D6D4C8] rounded-lg p-4">
            <label htmlFor="mall-search" className="block text-xs font-bold uppercase tracking-widest text-[#191919]/50 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#191919]/35" />
              <input
                id="mall-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filter shops, items, schema"
                className="min-h-11 w-full rounded-md border border-[#D6D4C8] bg-[#F3F1E7] pl-10 pr-3 text-sm text-[#191919] outline-none focus:border-[#D97757]"
              />
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <section className="bg-white border border-[#D6D4C8] rounded-lg overflow-hidden">
            <div className="p-5 border-b border-[#D6D4C8] flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#D97757]" />
              <h2 className="font-serif text-2xl text-[#191919]">Shops</h2>
            </div>
            <div className="max-h-[720px] overflow-auto">
              {loading ? (
                <p className="p-5 text-sm text-[#191919]/50">Loading...</p>
              ) : visibleBrands.length === 0 ? (
                <p className="p-5 text-sm text-[#191919]/50">No shops match the current filter.</p>
              ) : visibleBrands.map((brand) => {
                const slug = brandSlug(brand);
                const platformClass = PLATFORM_COLORS[brand.platform?.toLowerCase()] || 'bg-gray-100 text-gray-600';
                const active = slug === selectedBrand;
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => setSelectedBrand(slug)}
                    className={`block w-full border-b border-[#D6D4C8]/70 p-4 text-left hover:bg-[#F3F1E7] ${active ? 'bg-[#F3F1E7]' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#191919]">{brand.name || brand.display_name || brand.handle || slug}</p>
                        <p className="mt-1 text-xs text-[#191919]/50">{brand.source_url || brand.handle || slug}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${platformClass}`}>
                        {brand.platform || '-'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-[#191919]/55">
                      <span>{brand.item_count ?? 0} items</span>
                      <span>{formatDate(brand.last_scraped_at)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="min-w-0">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#D97757]">Selected Shop</p>
                <h2 className="mt-1 font-serif text-3xl text-[#191919]">
                  {selectedBrandRecord?.name || selectedBrandRecord?.display_name || selectedBrandRecord?.handle || selectedBrand || 'No shop selected'}
                </h2>
              </div>
              <p className="text-sm text-[#191919]/55">
                {itemsLoading ? 'Loading items...' : `${visibleItems.length} of ${items.length} items`}
              </p>
            </div>

            {itemsLoading ? (
              <div className="rounded-lg border border-[#D6D4C8] bg-white p-8 text-sm text-[#191919]/50">Loading item cards...</div>
            ) : visibleItems.length === 0 ? (
              <div className="rounded-lg border border-[#D6D4C8] bg-white p-8 text-sm text-[#191919]/50">
                No item cards match the current shop and filter.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleItems.map((item, index) => (
                  <ItemCard key={item.item_id || item.source_item_id || index} item={item} />
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="mt-8 bg-white border border-[#D6D4C8] rounded-lg overflow-hidden">
          <div className="p-5 border-b border-[#D6D4C8] flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#D97757]" />
            <h2 className="font-serif text-2xl text-[#191919]">Recent Events</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#E6E4D9]/60 text-xs uppercase tracking-widest text-[#191919]/50">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Brand</th>
                  <th className="text-left px-4 py-3">Item</th>
                  <th className="text-left px-4 py-3">Event Type</th>
                  <th className="text-left px-4 py-3">Old Price</th>
                  <th className="text-left px-4 py-3">New Price</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-[#191919]/50" colSpan="6">Loading...</td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-[#191919]/50" colSpan="6">No events recorded yet.</td>
                  </tr>
                ) : events.map((event, idx) => {
                  const chip = EVENT_CHIPS[event.event_type] || { label: event.event_type, className: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={event.id || idx} className="border-t border-[#D6D4C8]/70">
                      <td className="px-4 py-3 whitespace-nowrap text-[#191919]/60">
                        {formatDate(event.detected_at || event.occurred_at || event.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{event.brand_name || event.brand || '-'}</td>
                      <td className="px-4 py-3 min-w-[200px]">{event.item_title || event.item_name || event.item || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${chip.className}`}>
                          {chip.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#191919]/60">{formatPrice(event.previous_price ?? event.old_price)}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">{formatPrice(event.current_price ?? event.new_price)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
