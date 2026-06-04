import { useCallback, useEffect, useRef, useState } from 'react';
import { Cpu, MonitorSmartphone, Play, RefreshCw, ShieldCheck, TerminalSquare } from 'lucide-react';
import { MetricGrid, StatusBadge } from '../components/OpsCards';
import { createActionRequest, getRequest, getTelemetry } from '../lib/macMiniClient';

const VERDICT_STATE = { healthy: 'done', warn: 'degraded', critical: 'blocked' };

const ACTIONS = [
  { key: 'memguard_report', label: 'Memory report', desc: 'Run memguard report (RAM pressure + top consumers).', confirm: false },
  { key: 'tab_stats', label: 'Tab stats', desc: 'Per-browser tab / duplicate / domain counts.', confirm: false },
  { key: 'tab_list', label: 'Tab list', desc: 'List open tabs (URLs query-stripped).', confirm: false },
  { key: 'tab_dedupe_apply', label: 'Dedupe tabs', desc: 'Close exact-duplicate tabs (keeps the first).', confirm: true },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function timeAgo(iso) {
  if (!iso) return 'never';
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 90) return `${secs}s ago`;
  if (secs < 5400) return `${Math.round(secs / 60)}m ago`;
  return `${Math.round(secs / 3600)}h ago`;
}

function buildMetrics(snap) {
  const ram = snap?.ram || {};
  return [
    { label: 'Memory Pressure', value: ram.pressure || '—', detail: ram.verdict ? `verdict: ${ram.verdict}` : '' },
    { label: 'Available', value: ram.available_mb != null ? `${ram.available_mb} MB` : '—', detail: `of ${ram.total_mb || '—'} MB · trend ${ram.trend || '—'}` },
    { label: 'Swap Used', value: ram.swap_used_mb != null ? `${ram.swap_used_mb} MB` : '—', detail: `of ${ram.swap_total_mb || '—'} MB` },
    { label: 'Browsers / Tabs', value: `${snap?.browser_count ?? 0} / ${snap?.total_tabs ?? 0}`, detail: 'active debug browsers / tabs' },
  ];
}

export default function OpsMacMini() {
  const [telemetry, setTelemetry] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [telemetryError, setTelemetryError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [active, setActive] = useState(null);
  const [result, setResult] = useState(null);
  const cancelled = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const data = await getTelemetry();
      setTelemetry(data.snapshot);
      setGeneratedAt(data.generated_at);
      setTelemetryError(null);
    } catch (e) {
      setTelemetryError(e.message);
    }
  }, []);

  useEffect(() => {
    cancelled.current = false;
    refresh();
    const t = setInterval(refresh, 15000);
    return () => { cancelled.current = true; clearInterval(t); };
  }, [refresh]);

  async function runAction(action) {
    if (action.confirm && !window.confirm(`Run "${action.label}" on the Mac Mini? It closes exact-duplicate tabs (keeps the first of each).`)) return;
    setBusy(action.key);
    setResult(null);
    setActive({ action: action.key, status: 'pending' });
    try {
      const { id } = await createActionRequest(action.key);
      for (let i = 0; i < 40 && !cancelled.current; i += 1) {
        await sleep(3000);
        const { request } = await getRequest(id);
        if (request) {
          setActive({ action: action.key, status: request.status });
          if (request.status === 'done' || request.status === 'error') {
            setResult(request);
            break;
          }
        }
      }
    } catch (e) {
      setResult({ status: 'error', error: e.message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-10">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase text-[#D97757]">Mac Mini · live</span>
          <h1 className="mt-3 font-serif text-4xl font-medium leading-tight text-[#191919] md:text-5xl">
            Mac Mini Telemetry
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#191919]/70">
            RAM pressure and active agent browsers, published from the Mini every ~2 min. Actions
            below enqueue a reviewed intent record; the Mini executes it and writes the result back.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-[#191919]/60">
          {telemetry?.ram?.verdict && <StatusBadge state={VERDICT_STATE[telemetry.ram.verdict] || 'planned'} />}
          <span className="inline-flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5 text-[#D97757]" /> updated {timeAgo(generatedAt)}
          </span>
        </div>
      </section>

      {telemetryError && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Telemetry unavailable: {telemetryError}
        </div>
      )}

      <MetricGrid metrics={buildMetrics(telemetry)} />

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-md border border-[#D6D4C8] bg-white/45 p-5">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="h-4 w-4 text-[#D97757]" />
            <h2 className="font-serif text-2xl text-[#191919]">Active Browsers</h2>
          </div>
          {(telemetry?.browsers || []).length === 0 ? (
            <p className="mt-4 text-sm text-[#191919]/55">No Chrome debug ports active right now.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {telemetry.browsers.map((b) => (
                <div key={b.port} className="rounded-md border border-[#D6D4C8] bg-[#F3F1E7] p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-sm text-[#191919]">port {b.port}</p>
                    <p className="text-sm text-[#191919]/60">{b.tab_count} tabs · {b.duplicate_count} dup</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(b.top_domains || []).map((d) => (
                      <span key={d.domain} className="rounded-md border border-[#D6D4C8] bg-white/60 px-2 py-0.5 text-xs text-[#191919]/65">
                        {d.domain} · {d.count}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-md border border-[#D6D4C8] bg-white/45 p-5">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-[#D97757]" />
            <h2 className="font-serif text-2xl text-[#191919]">Top Memory Consumers</h2>
          </div>
          <div className="mt-4 space-y-2">
            {(telemetry?.top_consumers || []).map((c, i) => (
              <div key={`${c.comm}-${i}`} className="flex items-center justify-between border-b border-[#D6D4C8]/70 pb-2 text-sm last:border-b-0">
                <span className="font-mono text-[#191919]/80">{c.comm}</span>
                <span className="text-[#191919]/60">{c.rss_mb} MB</span>
              </div>
            ))}
            {(telemetry?.top_consumers || []).length === 0 && (
              <p className="text-sm text-[#191919]/55">No data yet.</p>
            )}
          </div>
        </article>
      </section>

      <section className="rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/60 p-5">
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-[#D97757]" />
          <h2 className="font-serif text-2xl text-[#191919]">Invoke a Skill</h2>
        </div>
        <p className="mt-2 text-sm text-[#191919]/65">
          Each button writes a reviewed intent record; the Mini poller runs the allowlisted action
          (~30s) and returns its output. No commands run in the browser.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ACTIONS.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => runAction(a)}
              disabled={!!busy}
              className="rounded-md border border-[#D6D4C8] bg-white/60 p-4 text-left transition-colors hover:border-[#D97757] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <p className="text-sm font-semibold text-[#191919]">{a.label}</p>
              <p className="mt-1 text-xs leading-5 text-[#191919]/60">{a.desc}</p>
              {busy === a.key && <p className="mt-2 text-xs font-semibold uppercase text-[#D97757]">running…</p>}
            </button>
          ))}
        </div>

        {(active || result) && (
          <div className="mt-5 rounded-md border border-[#D6D4C8] bg-[#191919] p-4 text-[#F3F1E7]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TerminalSquare className="h-4 w-4 text-[#D97757]" />
                <span className="font-mono text-sm">{(result || active)?.action}</span>
              </div>
              <StatusBadge state={(result || active)?.status} />
            </div>
            {result?.error && <p className="mt-3 text-sm text-red-300">{result.error}</p>}
            {result?.result?.output_text && (
              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-3 font-mono text-xs leading-5 text-[#F3F1E7]/90">
                {result.result.output_text}
              </pre>
            )}
            {!result && <p className="mt-3 text-sm text-[#F3F1E7]/60">Waiting for the Mini poller…</p>}
          </div>
        )}
      </section>

      <section className="flex items-start gap-2 rounded-md border border-[#D6D4C8] bg-white/45 p-4 text-sm text-[#191919]/65">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#D97757]" />
        <p>
          Intent-record only: the browser never holds the Supabase service key or shell access.
          Destructive actions (closing arbitrary tabs, restarting the gateway) are intentionally
          excluded from this surface.
        </p>
      </section>
    </div>
  );
}
