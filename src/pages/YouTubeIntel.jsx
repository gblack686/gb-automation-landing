import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Database, FileText, Plus, RefreshCw, Search, Youtube } from 'lucide-react';
import Footer from '../components/Footer';
import SignOutButton from '../components/SignOutButton';
import { addChannel, backfillArtifacts, getDashboard } from '../lib/youtubeIntelClient';

const initialForm = {
  handle: '',
  name: '',
  channel_id: '',
  priority: 'medium',
  enabled: true,
  tags: '',
  scan_days: 7,
  max_videos_per_scan: 5,
};

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

export default function YouTubeIntel() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(initialForm);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setDashboard(await getDashboard());
    } catch (err) {
      setError(err.message || 'Could not load YouTube Intel API');
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

  async function submitChannel(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await addChannel({
        ...form,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        scan_days: Number(form.scan_days),
        max_videos_per_scan: Number(form.max_videos_per_scan),
      });
      setForm(initialForm);
      setNotice('Channel saved.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not save channel');
    } finally {
      setSaving(false);
    }
  }

  async function syncArtifacts() {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await backfillArtifacts();
      setNotice(`Synced ${result.channels} channels, ${result.videos} videos, ${result.artifacts} artifacts.`);
      await load();
    } catch (err) {
      setError(err.message || 'Could not sync artifacts');
    } finally {
      setSaving(false);
    }
  }

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
              Manage the channel allowlist, monitor transcript coverage, and jump to reports and artifacts generated by the TAC-backed YouTube pipeline.
            </p>
          </div>
          <button
            type="button"
            onClick={syncArtifacts}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#191919] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#D97757] disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Sync artifacts
          </button>
        </div>

        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
        {notice && <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

        <section className="grid gap-4 md:grid-cols-4 mb-8">
          <Metric icon={Youtube} label="Channels" value={dashboard?.enabled_channels} />
          <Metric icon={Database} label="Videos" value={dashboard?.videos} />
          <Metric icon={FileText} label="Transcripts" value={dashboard?.transcripts} />
          <Metric icon={Activity} label="Summaries" value={dashboard?.summaries} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[420px,1fr]">
          <form onSubmit={submitChannel} className="bg-white border border-[#D6D4C8] rounded-lg p-5 h-fit">
            <div className="flex items-center gap-2 mb-5">
              <Plus className="w-4 h-4 text-[#D97757]" />
              <h2 className="font-serif text-2xl text-[#191919]">Add Channel</h2>
            </div>

            <div className="grid gap-3">
              <label className="text-xs uppercase tracking-widest text-[#191919]/50">
                Handle
                <input className="input-field mt-1 w-full rounded-lg px-3 py-2 normal-case tracking-normal" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="@IndyDevDan" required />
              </label>
              <label className="text-xs uppercase tracking-widest text-[#191919]/50">
                Name
                <input className="input-field mt-1 w-full rounded-lg px-3 py-2 normal-case tracking-normal" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="IndyDevDan" required />
              </label>
              <label className="text-xs uppercase tracking-widest text-[#191919]/50">
                Channel ID
                <input className="input-field mt-1 w-full rounded-lg px-3 py-2 normal-case tracking-normal" value={form.channel_id} onChange={(e) => setForm({ ...form, channel_id: e.target.value })} placeholder="Optional UC... id" />
              </label>
              <label className="text-xs uppercase tracking-widest text-[#191919]/50">
                Tags
                <input className="input-field mt-1 w-full rounded-lg px-3 py-2 normal-case tracking-normal" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="tac, agents, openclaw" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs uppercase tracking-widest text-[#191919]/50">
                  Priority
                  <select className="input-field mt-1 w-full rounded-lg px-3 py-2 normal-case tracking-normal" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
                <label className="text-xs uppercase tracking-widest text-[#191919]/50">
                  Scan days
                  <input type="number" min="1" max="90" className="input-field mt-1 w-full rounded-lg px-3 py-2 normal-case tracking-normal" value={form.scan_days} onChange={(e) => setForm({ ...form, scan_days: e.target.value })} />
                </label>
              </div>
              <button disabled={saving} className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[#D97757] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#191919] disabled:opacity-50">
                Save channel
              </button>
            </div>
          </form>

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
                  {loading ? (
                    <tr><td className="px-4 py-6 text-[#191919]/50" colSpan="4">Loading...</td></tr>
                  ) : videos.length === 0 ? (
                    <tr><td className="px-4 py-6 text-[#191919]/50" colSpan="4">No videos indexed yet.</td></tr>
                  ) : videos.map((video) => (
                    <tr key={video.video_id} className="border-t border-[#D6D4C8]/70">
                      <td className="px-4 py-3 whitespace-nowrap text-[#191919]/60">{video.published_at || 'unknown'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{video.channel_name || 'unknown'}</td>
                      <td className="px-4 py-3 min-w-[280px]"><a className="hover:text-[#D97757]" href={video.url} target="_blank" rel="noreferrer">{video.title}</a></td>
                      <td className="px-4 py-3"><span className="rounded-full bg-emerald-500/10 text-emerald-700 px-2 py-1 text-xs">{video.status}</span></td>
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
