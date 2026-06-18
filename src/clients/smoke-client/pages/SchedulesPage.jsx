import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import OpsPageShell from '../../../ops/components/OpsPageShell';
import CollapsibleSection from '../../../ops/components/CollapsibleSection';
import { fetchSmokeSchedules } from '../../../lib/supabaseOps';
import { formatDateTime, statusChipClass } from '../lib/format';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchSmokeSchedules()
      .then((data) => {
        if (!cancelled) setSchedules(data || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load schedules');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = !error && schedules === null;
  const empty = !error && !loading && schedules.length === 0;

  return (
    <OpsPageShell
      number="SCHEDULES"
      title="Cron Schedules"
      meta={<span className="gb-pill">{schedules?.length ?? 0} lanes</span>}
    >
      <div className="space-y-3">
        <CollapsibleSection
          eyebrow="01"
          title="Registered Lanes"
          meta={
            error ? (
              <span className="gb-chip gb-chip-red">Error</span>
            ) : loading ? (
              <span className="gb-chip gb-chip-blue">Loading</span>
            ) : empty ? (
              <span className="gb-chip gb-chip-amber">Empty</span>
            ) : (
              <span className="gb-pill">{schedules.length}</span>
            )
          }
          defaultOpen
        >
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>
          )}
          {loading && <p className="text-sm text-[#191919]/60">Loading schedules…</p>}
          {empty && (
            <p className="text-sm text-[#191919]/60">No schedules registered for this tenant yet.</p>
          )}
          {!error && !loading && !empty && (
            <div className="glass-panel divide-y divide-[#D6D4C8] rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/60">
              {schedules.map((s) => (
                <div
                  key={s.cron_id || s.name}
                  className="grid gap-3 p-5 md:grid-cols-[1.4fr_1fr_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 shrink-0 text-[#D97757]" />
                      <h4 className="break-words font-medium text-[#191919]">{s.name}</h4>
                    </div>
                    <p className="mt-1 font-mono text-xs text-[#191919]/55">
                      {[s.host, s.profile, s.script_or_skill].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="gb-eyebrow text-[#191919]/45">Schedule</p>
                    <p className="mt-1 font-mono text-sm text-[#191919]">{s.schedule || '—'}</p>
                    <p className="mt-1 text-xs text-[#191919]/55">
                      Last green: {formatDateTime(s.last_green_at)}
                    </p>
                  </div>
                  <div className="md:text-right">
                    <span className={`gb-chip ${statusChipClass(s.state)} uppercase`}>
                      {s.state || 'unknown'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      </div>
    </OpsPageShell>
  );
}
