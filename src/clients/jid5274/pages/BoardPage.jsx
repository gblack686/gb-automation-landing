import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, User } from 'lucide-react';
import OpsPageShell from '../../../ops/components/OpsPageShell';
import CollapsibleSection from '../../../ops/components/CollapsibleSection';
import { fetchJid5274Board } from '../lib/portalData';
import { formatDateTime, statusChipClass } from '../lib/format';

export default function BoardPage() {
  const [cards, setCards] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchJid5274Board()
      .then((data) => {
        if (!cancelled) setCards(data || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load board');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = !error && cards === null;
  const empty = !error && !loading && cards.length === 0;

  const groups = useMemo(() => {
    const map = new Map();
    for (const card of cards || []) {
      const key = card.status || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(card);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [cards]);

  return (
    <OpsPageShell
      number="BOARD"
      title="Kanban Board"
      meta={<span className="gb-pill">{cards?.length ?? 0} cards</span>}
    >
      <div className="space-y-3">
        <CollapsibleSection
          eyebrow="01"
          title="Status Summary"
          meta={
            error ? (
              <span className="gb-chip gb-chip-red">Error</span>
            ) : loading ? (
              <span className="gb-chip gb-chip-blue">Loading</span>
            ) : empty ? (
              <span className="gb-chip gb-chip-amber">Empty</span>
            ) : (
              <span className="gb-pill">{groups.length} columns</span>
            )
          }
          defaultOpen
        >
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>
          )}
          {loading && <p className="text-sm text-[#191919]/60">Loading board…</p>}
          {empty && <p className="text-sm text-[#191919]/60">No board cards for this tenant yet.</p>}
          {!error && !loading && !empty && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {groups.map(([status, items]) => (
                <article
                  key={status}
                  className="glass-panel reveal rounded-md border border-[#D6D4C8] bg-white/45 p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`gb-chip ${statusChipClass(status)} uppercase`}>{status}</span>
                    <LayoutGrid className="h-4 w-4 text-[#D97757]" />
                  </div>
                  <p className="mt-3 font-serif text-4xl text-[#191919]">{items.length}</p>
                </article>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {!error && !loading && !empty &&
          groups.map(([status, items], i) => (
            <CollapsibleSection
              key={status}
              eyebrow={String(i + 2).padStart(2, '0')}
              title={
                <span className="inline-flex items-center gap-2">
                  <span className={`gb-chip ${statusChipClass(status)} uppercase`}>{status}</span>
                </span>
              }
              meta={<span className="gb-pill">{items.length} {items.length === 1 ? 'card' : 'cards'}</span>}
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map((card) => (
                  <article
                    key={card.task_id || card.run_id}
                    className="glass-panel rounded-md border border-[#D6D4C8] bg-[#F3F1E7] p-4"
                  >
                    <h4 className="break-words font-medium text-[#191919]">{card.title || card.task_id}</h4>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#191919]/55">
                      {card.assignee && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-[#D97757]" />
                          {card.assignee}
                        </span>
                      )}
                      {card.profile && <span className="font-mono">{card.profile}</span>}
                    </div>
                    {card.step_key && (
                      <p className="mt-2 font-mono text-xs text-[#191919]/45">{card.step_key}</p>
                    )}
                    <p className="mt-3 text-xs text-[#191919]/50">
                      Updated {formatDateTime(card.updated_at)}
                    </p>
                  </article>
                ))}
              </div>
            </CollapsibleSection>
          ))}
      </div>
    </OpsPageShell>
  );
}
