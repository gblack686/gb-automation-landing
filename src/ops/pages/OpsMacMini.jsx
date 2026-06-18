import { useCallback, useEffect, useRef, useState } from 'react';
import { Cpu, MonitorSmartphone, Play, RefreshCw, ShieldCheck, TerminalSquare } from 'lucide-react';
import { MetricGrid, StatusBadge } from '../components/OpsCards';
import { createActionRequest, getRequest, getTelemetry } from '../lib/macMiniClient';
import OpsPageShell from '../components/OpsPageShell';
import CollapsibleSection from '../components/CollapsibleSection';

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

  const browsers = telemetry?.browsers || [];
  const consumers = telemetry?.top_consumers || [];

  return (
    <OpsPageShell>
      {/* 01 — Live header: page identity + verdict + freshness. Open by default. */}
      <CollapsibleSection
        eyebrow="01"
        defaultOpen
        title="Mac Mini Telemetry"
        meta={
          <span className="flex items-center gap-3">
            {telemetry?.ram?.verdict && <StatusBadge state={VERDICT_STATE[telemetry.ram.verdict] || 'planned'} />}
            <span className="inline-flex items-center gap-1.5 text-xs text-[#191919]/60">
              <RefreshCw className="h-3.5 w-3.5 text-[#D97757]" /> updated {timeAgo(generatedAt)}
            </span>
          </span>
        }
      >
        <span className="gb-eyebrow text-[#D97757]">Mac Mini · live</span>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#191919]/70">
          RAM pressure and active agent browsers, published from the Mini every ~2 min. Actions
          below enqueue a reviewed intent record; the Mini executes it and writes the result back.
        </p>
      </CollapsibleSection>

      {/* 02 — Telemetry status (conditional). Open by default so the error is visible. */}
      {telemetryError && (
        <CollapsibleSection
          eyebrow="02"
          defaultOpen
          title="Telemetry status"
          meta={<span className="gb-chip gb-chip-red">Unavailable</span>}
        >
          <div className="glass-panel rounded-md border border-[#D97757]/30 bg-[#D97757]/5 p-4 text-sm leading-7 text-[#191919]/75">
            Telemetry unavailable: {telemetryError}
          </div>
        </CollapsibleSection>
      )}

      {/* 03 — Metrics grid */}
      <CollapsibleSection
        eyebrow="03"
        title={
          <span className="inline-flex items-center gap-2">
            <Cpu className="h-4 w-4 text-[#D97757]" /> Metrics
          </span>
        }
        meta={<span className="gb-pill">RAM · swap · browsers</span>}
      >
        <MetricGrid metrics={buildMetrics(telemetry)} />
      </CollapsibleSection>

      {/* 04 — Active Browsers */}
      <CollapsibleSection
        eyebrow="04"
        title={
          <span className="inline-flex items-center gap-2">
            <MonitorSmartphone className="h-4 w-4 text-[#D97757]" /> Active Browsers
          </span>
        }
        meta={<span className="gb-pill">{browsers.length} active</span>}
      >
        {browsers.length === 0 ? (
          <p className="text-sm text-[#191919]/55">No Chrome debug ports active right now.</p>
        ) : (
          <div className="space-y-3">
            {browsers.map((b) => (
              <div key={b.port} className="glass-panel rounded-md border border-[#D6D4C8] bg-white/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="inline-flex items-center gap-2 font-mono text-sm text-[#191919]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D97757]" aria-hidden="true" />
                    port {b.port}
                  </p>
                  <p className="text-sm text-[#191919]/60">{b.tab_count} tabs · {b.duplicate_count} dup</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(b.top_domains || []).map((d) => (
                    <span key={d.domain} className="gb-tag">
                      {d.domain} · {d.count}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* 05 — Top Memory Consumers */}
      <CollapsibleSection
        eyebrow="05"
        title={
          <span className="inline-flex items-center gap-2">
            <Cpu className="h-4 w-4 text-[#D97757]" /> Top Memory Consumers
          </span>
        }
        meta={<span className="gb-pill">{consumers.length} processes</span>}
      >
        <div className="glass-panel rounded-md border border-[#D6D4C8] bg-white/45 p-5">
          <div className="space-y-2">
            {consumers.map((c, i) => (
              <div key={`${c.comm}-${i}`} className="flex items-center justify-between border-b border-[#D6D4C8]/70 pb-2 text-sm last:border-b-0">
                <span className="font-mono text-[#191919]/80">{c.comm}</span>
                <span className="text-[#191919]/60">{c.rss_mb} MB</span>
              </div>
            ))}
            {consumers.length === 0 && (
              <p className="text-sm text-[#191919]/55">No data yet.</p>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* 06 — Invoke a Skill */}
      <CollapsibleSection
        eyebrow="06"
        title={
          <span className="inline-flex items-center gap-2">
            <Play className="h-4 w-4 text-[#D97757]" /> Invoke a Skill
          </span>
        }
        meta={<span className="gb-pill">{ACTIONS.length} actions</span>}
      >
        <p className="text-sm leading-7 text-[#191919]/65">
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
              className="hover-mini glass-panel rounded-md border border-[#D6D4C8] bg-white/60 p-4 text-left transition-colors hover:border-[#D97757] disabled:cursor-not-allowed disabled:opacity-50"
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
      </CollapsibleSection>

      {/* 07 — Intent-record safety note */}
      <CollapsibleSection
        eyebrow="07"
        title={
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#D97757]" /> Safety
          </span>
        }
        meta={<span className="gb-chip gb-chip-green">Intent-record only</span>}
      >
        <div className="flex items-start gap-2 text-sm leading-7 text-[#191919]/65">
          <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#D97757]" />
          <p>
            Intent-record only: the browser never holds the Supabase service key or shell access.
            Destructive actions (closing arbitrary tabs, restarting the gateway) are intentionally
            excluded from this surface.
          </p>
        </div>
      </CollapsibleSection>
    </OpsPageShell>
  );
}
