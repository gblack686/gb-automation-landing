import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// ADR-2 P2 — the public Amplify surface for "every Supabase table as a 3D Sankey".
//
// Pattern A (static): a Mini-side build job (scripts/build_public_sankey.py in the
// gbautomation repo) runs the shared PII-safe aggregate core over the table
// catalog and commits, per table, a self-contained chart HTML + an aggregate-only
// JSON + a sankey-manifest.json into public/sankey/. This page reads that manifest,
// offers a table picker, and embeds the selected self-contained chart in an iframe.
//
// No live Supabase call from the browser; no anon key; aggregate-only data
// (GROUP BY dims -> count). The chart HTML is self-contained (three.js inlined).

function chip(active) {
  return {
    padding: '7px 14px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'Inter, system-ui, sans-serif',
    border: `1px solid ${active ? '#D97757' : '#D6D4C8'}`,
    background: active ? '#D97757' : 'transparent',
    color: active ? '#fff' : '#5C5C5C',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    minHeight: 'auto',
  };
}

function SankeyView() {
  const [tables, setTables] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = 'Data Sankey | GBAutomation';
    fetch('/sankey/sankey-manifest.json')
      .then((r) => {
        if (!r.ok) throw new Error(`manifest not found (${r.status})`);
        return r.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setTables(list);
        setActive(list[0]?.table ?? null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const current = tables.find((t) => t.table === active) || null;

  return (
    <div className="min-h-screen bg-[#F3F1E7]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="flex items-center gap-3 mb-8 w-fit" style={{ minHeight: 'auto' }}>
            <div style={{ background: 'linear-gradient(135deg,#D97757 0%,#B85a3e 100%)', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600, fontSize: '16px' }}>gb</span>
            </div>
            <span style={{ fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600, fontSize: '18px', color: '#191919' }}>GBAutomation</span>
          </Link>

          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A5FBF] mb-2">3D Sankey · aggregate telemetry</div>
          <h1 className="text-4xl text-[#191919] mb-3" style={{ fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600 }}>
            Data Sankey
          </h1>
          <p className="text-[#5C5C5C] text-base max-w-2xl">
            Every charted Supabase table as an interactive 3D Sankey &mdash; rotate, and re-pick the
            left/middle/right dimensions inside each chart. Data is <strong>aggregate-only</strong>
            {' '}(grouped counts, never raw rows), rebuilt by a Mac&nbsp;Mini job and served as static
            files. No live database call from your browser.
          </p>
        </div>

        {/* States */}
        {loading ? (
          <div className="text-center py-20 text-[#5C5C5C] italic" style={{ fontFamily: 'Newsreader, Georgia, serif' }}>
            Loading tables...
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-[#5C5C5C] italic text-lg mb-2" style={{ fontFamily: 'Newsreader, Georgia, serif' }}>
              No charts published yet.
            </p>
            <p className="text-[#8C8A84] text-sm">{error} &mdash; check back after the next build.</p>
          </div>
        ) : tables.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#5C5C5C] italic text-lg" style={{ fontFamily: 'Newsreader, Georgia, serif' }}>
              No tables in the manifest yet.
            </p>
          </div>
        ) : (
          <>
            {/* Table picker */}
            <div className="flex flex-wrap gap-2 mb-5">
              {tables.map((t) => (
                <button key={t.table} onClick={() => setActive(t.table)} style={chip(t.table === active)} title={`${t.group_count} groups · ${t.row_total} ${t.unit}`}>
                  {t.title}
                </button>
              ))}
            </div>

            {/* Meta line */}
            {current && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-xs text-[#8C8A84]">
                <span><strong className="text-[#5C5C5C]">{current.group_count}</strong> groups</span>
                <span><strong className="text-[#5C5C5C]">{current.row_total}</strong> {current.unit}</span>
                <span>dims: <code className="text-[#8A5FBF]">{(current.dims || []).join(', ')}</code></span>
                <a href={`/sankey/${current.html}`} target="_blank" rel="noopener noreferrer" className="text-[#D97757] hover:underline" style={{ minHeight: 'auto' }}>
                  Open full screen &rarr;
                </a>
                <a href={`/sankey/${current.data}`} target="_blank" rel="noopener noreferrer" className="text-[#D97757] hover:underline" style={{ minHeight: 'auto' }}>
                  Aggregate JSON &rarr;
                </a>
              </div>
            )}

            {/* Embedded self-contained chart */}
            {current && (
              <div className="rounded-2xl overflow-hidden border border-[#D6D4C8] shadow-sm" style={{ background: '#121110' }}>
                <iframe
                  key={current.table}
                  title={current.title}
                  src={`/sankey/${current.html}`}
                  style={{ width: '100%', height: '72vh', minHeight: 520, border: 'none', display: 'block' }}
                />
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-14 text-center border-t border-[#D6D4C8] pt-8">
          <p className="text-[#5C5C5C] text-sm mb-2">PII-safe by construction &mdash; only grouped counts ever leave the database.</p>
          <Link to="/observability" className="text-[#D97757] hover:underline text-sm mr-4" style={{ minHeight: 'auto' }}>
            Agent observability &rarr;
          </Link>
          <a href="/#contact" className="text-[#D97757] hover:underline text-sm" style={{ minHeight: 'auto' }}>
            Work with us &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}

export default SankeyView;
