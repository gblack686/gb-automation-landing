import { useEffect, useMemo, useState } from 'react';
import { Bot, Clock, GripVertical, RefreshCw, X } from 'lucide-react';
import { opsData } from '../data/opsData';
import { StatusBadge } from '../components/OpsCards';

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

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <span className="text-xs font-bold uppercase text-[#D97757]">Hermes Work Queue</span>
          <h1 className="mt-3 font-serif text-4xl text-[#191919] md:text-5xl">Kanban</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#191919]/70">
            Read-only mirror of the Hermes Kanban plugin installed on the Mac Mini.
            Cards are sanitized before publishing: no raw logs, env files, or workspace paths.
          </p>
        </div>

        <div className="rounded-md border border-[#D6D4C8] bg-white/45 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[#191919]/45">
            <RefreshCw className="h-3.5 w-3.5 text-[#D97757]" />
            {loadState === 'live' ? 'Live mirror' : loadState === 'loading' ? 'Loading mirror' : 'Fallback data'}
          </div>
          <p className="mt-2 font-mono text-sm text-[#191919]">{formatGeneratedAt(mirror.generatedAt)}</p>
          <p className="mt-2 text-xs text-[#191919]/55">{mirror.source.host} - {mirror.source.mode}</p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-md border border-[#D6D4C8] bg-white/45 p-4">
          <p className="text-xs font-semibold uppercase text-[#191919]/45">Active Board</p>
          <p className="mt-2 font-serif text-2xl text-[#191919]">{activeBoard.name}</p>
        </article>
        <article className="rounded-md border border-[#D6D4C8] bg-white/45 p-4">
          <p className="text-xs font-semibold uppercase text-[#191919]/45">Tasks</p>
          <p className="mt-2 font-serif text-2xl text-[#191919]">{mirror.totals.tasks}</p>
        </article>
        <article className="rounded-md border border-[#D6D4C8] bg-white/45 p-4">
          <p className="text-xs font-semibold uppercase text-[#191919]/45">Running</p>
          <p className="mt-2 font-serif text-2xl text-[#191919]">{mirror.totals.running}</p>
        </article>
        <article className="rounded-md border border-[#D6D4C8] bg-white/45 p-4">
          <p className="text-xs font-semibold uppercase text-[#191919]/45">Blocked</p>
          <p className="mt-2 font-serif text-2xl text-[#191919]">{mirror.totals.blocked}</p>
        </article>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {mirror.boards.map((board) => (
          <button
            type="button"
            key={board.slug}
            onClick={() => setSelectedBoardSlug(board.slug)}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold uppercase ${
              board.slug === activeBoard.slug
                ? 'border-[#D97757]/35 bg-[#D97757]/10 text-[#B75F43]'
                : 'border-[#D6D4C8] bg-white/40 text-[#191919]/55'
            }`}
          >
            {board.name}
          </button>
        ))}
      </div>

      <section className="grid gap-4 xl:grid-cols-6">
        {activeBoard.columns.map((column) => (
          <div key={column.name} className="rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/60">
            <div className="border-b border-[#D6D4C8] p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-serif text-2xl text-[#191919]">{column.label}</h2>
                <span className="rounded-md border border-[#D6D4C8] bg-white/55 px-2 py-1 text-xs text-[#191919]/55">
                  {column.tasks.length}
                </span>
              </div>
            </div>
            <div className="space-y-3 p-3">
              {column.tasks.map((task) => (
                <button
                  type="button"
                  key={task.id}
                  onClick={() => setSelectedTask({ ...task, columnLabel: column.label })}
                  className="block w-full rounded-md border border-[#D6D4C8] bg-white/55 p-4 text-left transition hover:border-[#D97757]/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97757]/30"
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
                  <div key={label} className="rounded-md border border-[#D6D4C8] bg-white/45 p-3">
                    <p className="text-xs font-semibold uppercase text-[#191919]/45">{label}</p>
                    <p className="mt-2 font-serif text-2xl text-[#191919]">{value}</p>
                  </div>
                ))}
              </div>

              <article className="rounded-md border border-[#D6D4C8] bg-white/45 p-4">
                <h3 className="text-sm font-semibold text-[#191919]">Latest Summary</h3>
                <p className="mt-2 text-sm leading-6 text-[#191919]/65">
                  {selectedTask.latestSummary || selectedTask.resultPreview || 'No run summary has been mirrored yet.'}
                </p>
              </article>

              <article className="rounded-md border border-[#D6D4C8] bg-white/45 p-4">
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
    </div>
  );
}
