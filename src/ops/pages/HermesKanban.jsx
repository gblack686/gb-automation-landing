import { useEffect, useMemo, useState } from 'react';
import { Bot, Clock, GripVertical, RefreshCw, X } from 'lucide-react';
import { opsData } from '../data/opsData';
import { StatusBadge } from '../components/OpsCards';
import OpsPageShell from '../components/OpsPageShell';
import CollapsibleSection from '../components/CollapsibleSection';

const fallbackMirror = {
  generatedAt: null,
  source: { host: opsData.mirror.host, mode: 'static-fallback' },
  activeBoard: 'preview',
  totals: { boards: 1, tasks: opsData.kanbanColumns.reduce((sum, col) => sum + col.tasks.length, 0), running: 0, blocked: 0 },
  boards: [
    {
      slug: 'preview',
      name: 'Preview',
      active: true,
      columns: opsData.kanbanColumns.map((column) => ({
        name: column.title.toLowerCase(),
        label: column.title,
        tasks: column.tasks.map((task, index) => ({
          id: `${column.title}-${index}`,
          title: task.title,
          status: task.status,
          assignee: task.agent,
          tenant: 'gbautomation',
          priority: 0,
          latestSummary: task.detail,
          bodyPreview: task.detail,
          commentCount: 0,
          eventCount: 0,
          runCount: 0,
          childrenCount: 0,
          parentsCount: 0,
        })),
      })),
    },
  ],
};

function formatGeneratedAt(value) {
  if (!value) return 'Static fallback';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

const LOAD_STATE_META = {
  live: { label: 'Live mirror', chip: 'gb-chip-green' },
  loading: { label: 'Loading mirror', chip: 'gb-chip-blue' },
  fallback: { label: 'Fallback data', chip: 'gb-chip-amber' },
};

export default function HermesKanban() {
  const [mirror, setMirror] = useState(fallbackMirror);
  const [loadState, setLoadState] = useState('loading');
  const [selectedBoardSlug, setSelectedBoardSlug] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/ops/hermes-kanban.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`Mirror returned ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          setMirror(data);
          setLoadState('live');
        }
      })
      .catch(() => {
        if (!cancelled) setLoadState('fallback');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeBoard = useMemo(
    () => (
      mirror.boards.find((board) => board.slug === selectedBoardSlug)
      || mirror.boards.find((board) => board.slug === mirror.activeBoard)
      || mirror.boards[0]
      || fallbackMirror.boards[0]
    ),
    [mirror, selectedBoardSlug],
  );

  const stateMeta = LOAD_STATE_META[loadState] || LOAD_STATE_META.fallback;
  const statusChip = <span className={`gb-chip ${stateMeta.chip}`}>{stateMeta.label}</span>;

  return (
    <OpsPageShell eyebrow="Hermes Work Queue" number="01" title="Kanban" meta={statusChip}>
      <div className="space-y-3">
        <CollapsibleSection eyebrow="01" title="Mirror Status" meta={statusChip}>
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <p className="max-w-3xl text-sm leading-6 text-[#191919]/70">
              Read-only mirror of the Hermes Kanban plugin installed on the Mac Mini.
              Cards are sanitized before publishing: no raw logs, env files, or workspace paths.
            </p>

            <div className="glass-panel reveal rounded-md p-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 text-[#D97757]" />
                <span className="gb-eyebrow">{stateMeta.label}</span>
              </div>
              <p className="mt-2 font-mono text-sm text-[#191919]">{formatGeneratedAt(mirror.generatedAt)}</p>
              <p className="mt-2 text-xs text-[#191919]/55">{mirror.source.host} - {mirror.source.mode}</p>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection eyebrow="02" title="Totals" meta={<span className="gb-pill">{mirror.totals.tasks} tasks</span>}>
          <section className="grid gap-4 md:grid-cols-4">
            <article className="glass-panel reveal rounded-md p-4">
              <p className="gb-eyebrow">Active Board</p>
              <p className="mt-2 font-serif text-2xl text-[#191919]">{activeBoard.name}</p>
            </article>
            <article className="glass-panel reveal rounded-md p-4">
              <p className="gb-eyebrow">Tasks</p>
              <p className="mt-2 font-serif text-2xl text-[#191919]">{mirror.totals.tasks}</p>
            </article>
            <article className="glass-panel reveal rounded-md p-4">
              <p className="gb-eyebrow">Running</p>
              <p className="mt-2 font-serif text-2xl text-[#191919]">{mirror.totals.running}</p>
            </article>
            <article className="glass-panel reveal rounded-md p-4">
              <p className="gb-eyebrow">Blocked</p>
              <p className="mt-2 font-serif text-2xl text-[#191919]">{mirror.totals.blocked}</p>
            </article>
          </section>
        </CollapsibleSection>

        <CollapsibleSection eyebrow="03" title="Boards" meta={<span className="gb-pill">{mirror.boards.length} boards</span>}>
          <div className="flex flex-wrap items-center gap-3">
            {mirror.boards.map((board) => (
              <button
                type="button"
                key={board.slug}
                onClick={() => setSelectedBoardSlug(board.slug)}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                  board.slug === activeBoard.slug
                    ? 'border-[#D97757]/35 bg-[#D97757]/10 text-[#B75F43]'
                    : 'border-[#D6D4C8] bg-white/40 text-[#191919]/55 hover:border-[#D97757]/30 hover:text-[#191919]/80'
                }`}
              >
                {board.name}
              </button>
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="04"
          title={activeBoard.name}
          meta={<span className="gb-pill">{activeBoard.columns.length} columns</span>}
          defaultOpen
        >
          <section className="grid gap-4 xl:grid-cols-6">
            {activeBoard.columns.map((column) => (
              <div key={column.name} className="glass-panel rounded-md">
                <div className="border-b border-[#D6D4C8] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-serif text-2xl text-[#191919]">{column.label}</h2>
                    <span className="gb-pill">{column.tasks.length}</span>
                  </div>
                </div>
                <div className="space-y-3 p-3">
                  {column.tasks.map((task) => (
                    <button
                      type="button"
                      key={task.id}
                      onClick={() => setSelectedTask({ ...task, columnLabel: column.label })}
                      className="hover-mini block w-full rounded-md border border-[#D6D4C8] bg-white/55 p-4 text-left transition hover:border-[#D97757]/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97757]/30"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 h-4 w-4 text-[#191919]/25" />
                        <div>
                          <h3 className="text-sm font-semibold text-[#191919]">{task.title}</h3>
                          <p className="mt-2 text-xs leading-5 text-[#191919]/60">
                            {task.latestSummary || task.bodyPreview || task.resultPreview || 'No summary yet.'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#191919]/50">
                        <span className="inline-flex min-h-0 items-center gap-1.5">
                          <Bot className="h-3.5 w-3.5 text-[#D97757]" />
                          {task.assignee}
                        </span>
                        {task.startedAt && (
                          <span className="inline-flex min-h-0 items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-[#D97757]" />
                            {formatGeneratedAt(task.startedAt)}
                          </span>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-[#191919]/40">{task.id}</span>
                        <StatusBadge state={task.status} />
                      </div>
                      {(task.commentCount > 0 || task.runCount > 0 || task.childrenCount > 0) && (
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#191919]/45">
                          <span>{task.commentCount} comments</span>
                          <span>{task.runCount} runs</span>
                          <span>{task.childrenCount} children</span>
                        </div>
                      )}
                    </button>
                  ))}
                  {column.tasks.length === 0 && (
                    <div className="rounded-md border border-dashed border-[#D6D4C8] bg-white/35 p-4 text-center text-xs text-[#191919]/45">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        </CollapsibleSection>
      </div>

      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#191919]/45 px-4 py-4 sm:items-center">
          <section className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-md border border-[#D6D4C8] bg-[#F3F1E7] shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-[#D6D4C8] bg-[#F3F1E7] p-5">
              <div>
                <p className="font-mono text-xs text-[#191919]/45">{selectedTask.id} · {selectedTask.columnLabel}</p>
                <h2 className="mt-2 font-serif text-3xl text-[#191919]">{selectedTask.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#D6D4C8] bg-white/60 text-[#191919]/55 hover:text-[#191919]"
                aria-label="Close task details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-5 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge state={selectedTask.status} />
                <span className="rounded-md border border-[#D6D4C8] bg-white/55 px-2.5 py-1 text-xs text-[#191919]/55">
                  Priority {selectedTask.priority}
                </span>
                <span className="rounded-md border border-[#D6D4C8] bg-white/55 px-2.5 py-1 text-xs text-[#191919]/55">
                  {selectedTask.assignee}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ['Runs', selectedTask.runCount],
                  ['Events', selectedTask.eventCount],
                  ['Comments', selectedTask.commentCount],
                  ['Children', selectedTask.childrenCount],
                ].map(([label, value]) => (
                  <div key={label} className="glass-panel rounded-md p-3">
                    <p className="gb-eyebrow">{label}</p>
                    <p className="mt-2 font-serif text-2xl text-[#191919]">{value}</p>
                  </div>
                ))}
              </div>

              <article className="glass-panel rounded-md p-4">
                <h3 className="text-sm font-semibold text-[#191919]">Latest Summary</h3>
                <p className="mt-2 text-sm leading-6 text-[#191919]/65">
                  {selectedTask.latestSummary || selectedTask.resultPreview || 'No run summary has been mirrored yet.'}
                </p>
              </article>

              <article className="glass-panel rounded-md p-4">
                <h3 className="text-sm font-semibold text-[#191919]">Task Body</h3>
                <p className="mt-2 text-sm leading-6 text-[#191919]/65">
                  {selectedTask.bodyPreview || 'No task body preview has been mirrored.'}
                </p>
              </article>

              <div className="grid gap-3 text-sm text-[#191919]/65 sm:grid-cols-2">
                <p><span className="font-semibold text-[#191919]">Created:</span> {formatGeneratedAt(selectedTask.createdAt)}</p>
                <p><span className="font-semibold text-[#191919]">Started:</span> {formatGeneratedAt(selectedTask.startedAt)}</p>
                <p><span className="font-semibold text-[#191919]">Completed:</span> {formatGeneratedAt(selectedTask.completedAt)}</p>
                <p><span className="font-semibold text-[#191919]">Workspace:</span> {selectedTask.hasWorkspace ? 'sanitized scratch workspace present' : 'none mirrored'}</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </OpsPageShell>
  );
}
