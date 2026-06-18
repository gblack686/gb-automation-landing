import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from 'lucide-react';

/**
 * DataTable — generic, themed, read-only table over an array of plain row
 * objects. Presentation only; takes no fetch responsibility.
 *
 * Columns are inferred from the union of row keys (humanized headers). Provides
 * client-side text search, click-to-sort per column, pagination, a
 * "showing N of M" footer, and CSV export of the filtered+sorted set.
 *
 * Rendered as the GBAuto glass-panel grid-per-row stack (not an HTML <table>),
 * horizontally scrollable for wide column sets.
 *
 * Props:
 *   - rows      (array, required) Plain objects. Empty array → empty state.
 *   - columns   (string[])  Optional explicit column order; defaults to inferred.
 *   - pageSize  (number)    Rows per page. Default 25.
 *   - exportName(string)    Base filename for CSV export. Default 'export'.
 */
export default function DataTable({ rows = [], columns, pageSize = 25, exportName = 'export' }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ col: null, dir: 'asc' });
  const [page, setPage] = useState(0);

  const cols = useMemo(() => {
    if (columns?.length) return columns;
    const seen = [];
    for (const row of rows) {
      for (const k of Object.keys(row || {})) {
        if (!seen.includes(k)) seen.push(k);
      }
    }
    return seen;
  }, [rows, columns]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      cols.some((c) => formatCell(row[c]).toLowerCase().includes(q)),
    );
  }, [rows, cols, query]);

  const sorted = useMemo(() => {
    if (!sort.col) return filtered;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => factor * compareValues(a[sort.col], b[sort.col]));
  }, [filtered, sort]);

  const total = rows.length;
  const matched = sorted.length;
  const pageCount = Math.max(1, Math.ceil(matched / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  function toggleSort(col) {
    setPage(0);
    setSort((prev) => {
      if (prev.col !== col) return { col, dir: 'asc' };
      if (prev.dir === 'asc') return { col, dir: 'desc' };
      return { col: null, dir: 'asc' };
    });
  }

  function onSearch(value) {
    setQuery(value);
    setPage(0);
  }

  function exportCsv() {
    const csv = toCsv(cols, sorted);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const gridTemplate = `repeat(${cols.length}, minmax(150px, 1fr))`;
  const minWidth = `${cols.length * 150}px`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative flex min-w-0 flex-1 items-center sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[#191919]/40" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Filter rows…"
            className="w-full rounded-md border border-[#D6D4C8] bg-white/60 py-2 pl-9 pr-3 text-sm text-[#191919] placeholder:text-[#191919]/40 focus:border-[#D97757] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
          />
        </label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#191919]/55">
            Showing {matched === 0 ? 0 : start + 1}–{Math.min(start + pageSize, matched)} of {matched}
            {matched !== total ? ` (filtered from ${total})` : ''}
          </span>
          <button
            type="button"
            onClick={exportCsv}
            disabled={matched === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#D6D4C8] bg-white/60 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[#191919]/70 transition-colors hover:bg-[#191919] hover:text-[#F3F1E7] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/60 disabled:hover:text-[#191919]/70"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            CSV
          </button>
        </div>
      </div>

      {matched === 0 ? (
        <p className="rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/60 p-5 text-sm text-[#191919]/60">
          No rows match the current filter.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div
            className="glass-panel divide-y divide-[#D6D4C8] rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/60"
            style={{ minWidth }}
          >
            <div
              className="grid gap-3 bg-[#191919]/[0.04] px-5 py-3"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {cols.map((col) => {
                const active = sort.col === col;
                const SortIcon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => toggleSort(col)}
                    className={`group flex min-w-0 items-center gap-1 text-left gb-eyebrow ${
                      active ? 'text-[#D97757]' : 'text-[#191919]/45 hover:text-[#191919]'
                    }`}
                    title={`Sort by ${humanize(col)}`}
                  >
                    <span className="truncate">{humanize(col)}</span>
                    <SortIcon className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            {visible.map((row, i) => (
              <div
                key={start + i}
                className="grid gap-3 px-5 py-3 text-sm"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {cols.map((col) => (
                  <div key={col} className="min-w-0 break-words text-[#191919]/85">
                    <CellValue value={row[col]} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-[#191919]/55">
            Page {safePage + 1} of {pageCount}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="rounded-md border border-[#D6D4C8] bg-white/60 px-3 py-1.5 text-xs font-semibold text-[#191919]/70 transition-colors hover:bg-[#191919] hover:text-[#F3F1E7] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/60 disabled:hover:text-[#191919]/70"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="rounded-md border border-[#D6D4C8] bg-white/60 px-3 py-1.5 text-xs font-semibold text-[#191919]/70 transition-colors hover:bg-[#191919] hover:text-[#F3F1E7] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/60 disabled:hover:text-[#191919]/70"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CellValue({ value }) {
  if (value == null || value === '') {
    return <span className="text-[#191919]/35">—</span>;
  }
  const text = formatCell(value);
  if (/^https?:\/\//i.test(text)) {
    return (
      <a
        href={text}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all font-mono text-xs text-[#D97757] underline-offset-2 hover:underline"
      >
        {text}
      </a>
    );
  }
  if (isIsoDate(text)) {
    return <span title={text}>{formatMaybeDate(text)}</span>;
  }
  return <span>{text}</span>;
}

// --- pure helpers (module-private) ---

function humanize(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCell(value) {
  if (value == null) return '';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function isIsoDate(text) {
  return /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(text);
}

function formatMaybeDate(text) {
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return text;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && a !== '' && b !== '') {
    return na - nb;
  }
  return formatCell(a).localeCompare(formatCell(b), undefined, { numeric: true, sensitivity: 'base' });
}

function toCsv(cols, rows) {
  const escape = (v) => {
    const s = formatCell(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = cols.map((c) => escape(humanize(c))).join(',');
  const body = rows.map((row) => cols.map((c) => escape(row[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}
