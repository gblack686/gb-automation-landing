import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Package, RefreshCw, ShoppingBag, Store, Tag } from 'lucide-react';
import Footer from '../components/Footer';
import SignOutButton from '../components/SignOutButton';
import { getDashboard, getBrands, getRecentEvents, getLatestRun } from '../lib/mallScannerClient';

function Metric({ icon, label, value }) {
  const MetricIcon = icon;
  return (
    <div className="bg-[#E6E4D9] border border-[#D6D4C8] rounded-lg p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="text-xs uppercase tracking-widest text-[#191919]/50">{label}</span>
        <MetricIcon className="w-4 h-4 text-[#D97757]" />
      </div>
      <div className="text-3xl font-serif text-[#191919]">{value ?? 0}</div>
    </div>
  );
}

const PLATFORM_COLORS = {
  shopify: 'bg-green-100 text-green-700',
  woocommerce: 'bg-purple-100 text-purple-700',
  instagram: 'bg-pink-100 text-pink-700',
};

const EVENT_CHIPS = {
  sale_start: { label: 'Sale', className: 'bg-orange-100 text-orange-700' },
  price_drop: { label: 'Price Drop', className: 'bg-red-100 text-red-700' },
  new_item: { label: 'New Item', className: 'bg-green-100 text-green-700' },
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatPrice(val) {
  if (val == null) return '—';
  return `$${Number(val).toFixed(2)}`;
}

export default function MallScanner() {
  const [dashboard, setDashboard] = useState(null);
  const [brands, setBrands] = useState([]);
  const [events, setEvents] = useState([]);
  const [latestRun, setLatestRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice] = useState('');

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
      setDashboard(dash);
      setBrands(Array.isArray(brandsData) ? brandsData : (brandsData.brands || []));
      setEvents(Array.isArray(eventsData) ? eventsData : (eventsData.events || []));
      setLatestRun(runData?.latest_run ?? runData ?? null);
    } catch (err) {
      setError(err.message || 'Could not load Mall Scanner API');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const latestRunDisplay = latestRun
    ? `${formatDate(latestRun.scraped_at)} — ${latestRun.status || 'unknown'}`
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

      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-10">
          <div>
            <span className="text-[#D97757] text-xs font-bold tracking-widest uppercase">
              The Mall Scanner
            </span>
            <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#191919] tracking-tight mt-2 mb-4">
              Brand Catalog Console
            </h1>
            <p className="text-base text-[#191919]/70 max-w-2xl leading-relaxed">
              Monitor indie brand catalogs tracked by The Mall scanner. Live data from Supabase — brands, current catalog, recent sale and price-drop events.
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
          <div className="bg-[#E6E4D9] border border-[#D6D4C8] rounded-lg p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className="text-xs uppercase tracking-widest text-[#191919]/50">Latest Run</span>
              <Clock className="w-4 h-4 text-[#D97757]" />
            </div>
            <div className="text-sm font-medium text-[#191919] leading-snug">
              {loading ? '…' : latestRunDisplay}
            </div>
          </div>
        </section>

        <div className="grid gap-6">
          <div className="bg-[#E6E4D9] border border-[#D6D4C8] rounded-lg overflow-hidden">
            <div className="p-5 border-b border-[#D6D4C8] flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#D97757]" />
              <h2 className="font-serif text-2xl text-[#191919]">Brands</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#E6E4D9]/60 text-xs uppercase tracking-widest text-[#191919]/50">
                  <tr>
                    <th className="text-left px-4 py-3">Brand</th>
                    <th className="text-left px-4 py-3">Platform</th>
                    <th className="text-left px-4 py-3">Items</th>
                    <th className="text-left px-4 py-3">Last Scraped</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-4 py-6 text-[#191919]/50" colSpan="5">Loading...</td>
                    </tr>
                  ) : brands.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-[#191919]/50" colSpan="5">No brands tracked yet.</td>
                    </tr>
                  ) : brands.map((brand) => {
                    const platformClass = PLATFORM_COLORS[brand.platform?.toLowerCase()] || 'bg-gray-100 text-gray-600';
                    return (
                      <tr key={brand.slug || brand.id} className="border-t border-[#D6D4C8]/70">
                        <td className="px-4 py-3 font-medium">{brand.name}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${platformClass}`}>
                            {brand.platform || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#191919]/70">{brand.item_count ?? '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-[#191919]/60">
                          {formatDate(brand.last_scraped_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${brand.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            {brand.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[#E6E4D9] border border-[#D6D4C8] rounded-lg overflow-hidden">
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
                          {formatDate(event.occurred_at || event.created_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{event.brand_name || event.brand || '—'}</td>
                        <td className="px-4 py-3 min-w-[200px]">{event.item_name || event.item || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${chip.className}`}>
                            {chip.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[#191919]/60">{formatPrice(event.old_price)}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium">{formatPrice(event.new_price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
