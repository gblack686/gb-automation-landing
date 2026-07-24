import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, Clock, Database, FileText, RefreshCw, Search, Youtube } from 'lucide-react';
import Footer from '../components/Footer';
import SignOutButton from '../components/SignOutButton';
import { getChannels, getDashboard } from '../lib/youtubeIntelClient';

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

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function YouTubeIntel() {
  const [dashboard, setDashboard] = useState(null);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [dash, chans] = await Promise.all([getDashboard(), getChannels()]);
      setDashboard(dash);
      setChannels(chans?.channels ?? []);
    } catch (err) {
      setError(err.message || 'Could not load YouTube Intel data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const videos = useMemo(() => {
    const all = dashboard?.recent_videos || [];
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter((video) =>
      [video.title, video.channel_name, video.video_id]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q))
    );
  }, [dashboard, query]);

  const latestRun = dashboard?.latest_run ?? null;
  const runErrors = latestRun?.errors ?? [];
  const isSampleData = dashboard?.mode === 'sample';

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
              YouTube Intel
            </span>
            <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#191919] tracking-tight mt-2 mb-4">
              Channel Intelligence Console
            </h1>
            <p className="text-base text-[#191919]/70 max-w-2xl leading-relaxed">
              Latest uploads from the allowlisted channels, refreshed daily by the YouTube Intel scrape job. Channels are configured in <code className="text-xs bg-[#E6E4D9] px-1.5 py-0.5 rounded">scripts/youtube-intel/channels.json</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#191919] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#D97757] disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Reload
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}. Run <code className="bg-white px-1.5 py-0.5 rounded">npm run youtube-intel:scrape</code> to generate the data file.
          </div>
        )}
        {isSampleData && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Showing sample data (mode=sample). Run <code className="bg-white px-1.5 py-0.5 rounded">npm run youtube-intel:scrape</code> for live results.
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4 mb-8">
          <Metric icon={Youtube} label="Channels" value={dashboard?.enabled_channels} />
          <Metric icon={Database} label="Videos" value={dashboard?.videos} />
          <Metric icon={FileText} label="Transcripts" value={dashboard?.transcripts} />
          <Metric icon={Activity} label="Summaries" value={dashboard?.summaries} />
        </section>

        <section className="grid gap-4 md:grid-cols-3 mb-10">
          <div className="bg-white border border-[#D6D4C8] rounded-lg p-5 md:col-span-2">
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className="text-xs uppercase tracking-widest text-[#191919]/50">Latest run</span>
              <Clock className="w-4 h-4 text-[#D97757]" />
            </div>
            {loading && !dashboard ? (
              <div className="text-sm text-[#191919]/60">Loading…</div>
            ) : latestRun ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#191919]/50">Finished</div>
                  <div className="text-[#191919] font-medium">{formatDateTime(latestRun.finished_at)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#191919]/50">Mode</div>
                  <div className="text-[#191919] font-medium">{latestRun.mode}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#191919]/50">Channels</div>
                  <div className="text-[#191919] font-medium">
                    {latestRun.channels_ok}/{latestRun.channels_scanned} ok
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#191919]/50">Videos</div>
                  <div className="text-[#191919] font-medium">{latestRun.videos_indexed}</div>
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <div className="text-[10px] uppercase tracking-widest text-[#191919]/50 mt-1">Next steps</div>
                  <div className="text-[#191919]/80">{latestRun.next_steps}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[#191919]/60">No run recorded yet.</div>
            )}
          </div>

          <div className="bg-white border border-[#D6D4C8] rounded-lg p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className="text-xs uppercase tracking-widest text-[#191919]/50">Run errors</span>
              <AlertTriangle className={`w-4 h-4 ${runErrors.length > 0 ? 'text-red-500' : 'text-[#D97757]/40'}`} />
            </div>
            {runErrors.length === 0 ? (
              <div className="text-sm text-[#191919]/60">None — all enabled channels scraped cleanly.</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {runErrors.map((err) => (
                  <li key={err.slug} className="border-l-2 border-red-400 pl-3">
                    <div className="font-medium text-[#191919]">{err.name}</div>
                    <div className="text-[#191919]/70 break-words">{err.error}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[360px,1fr]">
          <div className="bg-white border border-[#D6D4C8] rounded-lg overflow-hidden h-fit">
            <div className="p-5 border-b border-[#D6D4C8]">
              <h2 className="font-serif text-2xl text-[#191919]">Channels</h2>
              <p className="text-xs text-[#191919]/60 mt-1">
                Edit <code className="text-xs bg-[#E6E4D9] px-1 py-0.5 rounded">scripts/youtube-intel/channels.json</code> and re-run the scrape to update.
              </p>
            </div>
            <ul>
              {loading && channels.length === 0 ? (
                <li className="px-5 py-4 text-sm text-[#191919]/50">Loading…</li>
              ) : channels.length === 0 ? (
                <li className="px-5 py-4 text-sm text-[#191919]/50">No channels configured.</li>
              ) : (
                channels.map((channel) => (
                  <li key={channel.slug} className="px-5 py-3 border-t border-[#D6D4C8]/70 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-[#191919]">{channel.name}</div>
                      <div className="text-xs text-[#191919]/60">{channel.handle || channel.channel_id}</div>
                      {channel.tags?.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {channel.tags.map((tag) => (
                            <span key={tag} className="text-[10px] uppercase tracking-widest bg-[#E6E4D9] text-[#191919]/70 rounded px-1.5 py-0.5">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest font-medium ${channel.last_status === 'ok' ? 'bg-emerald-100 text-emerald-700' : channel.last_status === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                        {channel.last_status || 'pending'}
                      </span>
                      <div className="text-[10px] text-[#191919]/50 mt-1">{channel.video_count} videos</div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="bg-white border border-[#D6D4C8] rounded-lg overflow-hidden">
            <div className="p-5 border-b border-[#D6D4C8] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="font-serif text-2xl text-[#191919]">Recent Videos</h2>
              <label className="relative block md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#191919]/40" />
                <input className="input-field w-full rounded-lg pl-9 pr-3 py-2" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search videos" />
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#E6E4D9]/60 text-xs uppercase tracking-widest text-[#191919]/50">
                  <tr>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Channel</th>
                    <th className="text-left px-4 py-3">Title</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && videos.length === 0 ? (
                    <tr><td className="px-4 py-6 text-[#191919]/50" colSpan="4">Loading...</td></tr>
                  ) : videos.length === 0 ? (
                    <tr><td className="px-4 py-6 text-[#191919]/50" colSpan="4">No videos indexed yet. Run <code className="bg-[#E6E4D9] px-1 py-0.5 rounded">npm run youtube-intel:scrape</code> to populate.</td></tr>
                  ) : videos.map((video) => (
                    <tr key={video.video_id} className="border-t border-[#D6D4C8]/70">
                      <td className="px-4 py-3 whitespace-nowrap text-[#191919]/60">{formatDate(video.published_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{video.channel_name || 'unknown'}</td>
                      <td className="px-4 py-3 min-w-[280px]">
                        <a className="hover:text-[#D97757]" href={video.url} target="_blank" rel="noreferrer">{video.title}</a>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-emerald-500/10 text-emerald-700 px-2 py-1 text-xs">{video.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
