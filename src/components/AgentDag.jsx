import { useMemo, useState } from 'react';

// Native React render of a Langfuse agent DAG from the gbauto-archon-dag.v1
// contract (dag-nodes.json): { nodes: [{ id, label, nodeType, status, summary,
// owner, evidence, depends_on }] }. Ports the Archon layout/visual language from
// resources/skills/report-package render_collapsible_report.py, but responsive
// and interactive (click a node for its detail). No iframe, no pre-baked SVG.

const ACCENT = '#8A5FBF';

const STATUS_COLORS = {
  completed: '#4F9D69',
  success: '#4F9D69',
  running: ACCENT,
  active: ACCENT,
  failed: '#B94A48',
  error: '#B94A48',
  blocked: '#B94A48',
  skipped: '#9B9688',
  pending: '#9B9688',
  ready_for_review: '#8A5FBF',
  partial: '#C08A3E',
};

const TYPE_LABELS = {
  command: 'CMD', prompt: 'PROMPT', bash: 'BASH', script: 'SCRIPT', loop: 'LOOP',
  approval: 'APPROVAL', cancel: 'CANCEL', agent: 'AGENT', tool: 'TOOL',
  artifact: 'ARTIFACT', gate: 'GATE', data: 'DATA',
};

function statusColor(status) {
  return STATUS_COLORS[String(status || '').toLowerCase()] || '#9B9688';
}

function nodeType(node) {
  const explicit = String(node.nodeType || node.span_type || '').trim().toLowerCase();
  if (explicit) return explicit;
  const id = String(node.id || '').toLowerCase();
  if (id.startsWith('agent.')) return 'agent';
  if (id.startsWith('tool.')) return 'tool';
  if (id.startsWith('gate.') || id.startsWith('approval.')) return 'approval';
  if (id.startsWith('artifact.')) return 'artifact';
  return 'prompt';
}

function typeLabel(type) {
  return TYPE_LABELS[type] || (type ? type.slice(0, 9).toUpperCase() : 'NODE');
}

function wrapWords(text, maxChars, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) { cur = w; }
    else if ((cur + ' ' + w).length <= maxChars) { cur += ' ' + w; }
    else { lines.push(cur); cur = w; }
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && (words.join(' ').length > lines.join(' ').length)) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{1}$/, '…');
  }
  return lines;
}

// Layer each node = 1 + max(layer of its in-graph deps); cycles pin to 0.
function computeLayout(nodes) {
  const byId = new Map(nodes.map((n) => [String(n.id), n]));
  const layer = new Map();

  function layerFor(id, visiting) {
    if (layer.has(id)) return layer.get(id);
    if (visiting.has(id)) { layer.set(id, 0); return 0; }
    visiting.add(id);
    const deps = (byId.get(id)?.depends_on || []).map(String).filter((d) => byId.has(d));
    const v = deps.length ? 1 + Math.max(...deps.map((d) => layerFor(d, visiting))) : 0;
    layer.set(id, v);
    visiting.delete(id);
    return v;
  }
  for (const n of nodes) layerFor(String(n.id), new Set());

  const grouped = new Map();
  for (const n of nodes) {
    const l = layer.get(String(n.id));
    if (!grouped.has(l)) grouped.set(l, []);
    grouped.get(l).push(String(n.id));
  }
  const layers = [...grouped.keys()].sort((a, b) => a - b);
  const maxRow = Math.max(1, ...[...grouped.values()].map((a) => a.length));

  // Sizing scales down as the graph gets denser (mirrors archon_layout_profile).
  const dense = maxRow >= 4 || nodes.length > 9;
  const NODE_W = dense ? 188 : 212;
  const NODE_H = dense ? 84 : 96;
  const COL_GAP = NODE_W + (dense ? 40 : 64);
  const ROW_GAP = NODE_H + 78;
  const PAD_X = 48;
  const PAD_TOP = 40;
  const PAD_BOTTOM = 48;

  const contentW = (maxRow - 1) * COL_GAP + NODE_W;
  const width = contentW + PAD_X * 2;
  const centerX = width / 2;
  const height = (layers.length - 1) * ROW_GAP + NODE_H + PAD_TOP + PAD_BOTTOM;

  const pos = new Map();
  for (const l of layers) {
    const ids = grouped.get(l);
    const k = ids.length;
    const rowW = (k - 1) * COL_GAP;
    const firstX = centerX - rowW / 2;
    ids.forEach((id, i) => {
      pos.set(id, { x: firstX + i * COL_GAP, y: PAD_TOP + NODE_H / 2 + layers.indexOf(l) * ROW_GAP });
    });
  }
  return { pos, width, height, NODE_W, NODE_H, dense };
}

function StatusIcon({ x, y, status, color, r = 8 }) {
  const s = String(status || '').toLowerCase();
  const sw = Math.max(2, Math.round(r * 0.26));
  if (s === 'completed' || s === 'success') {
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill={color} />
        <path d={`M${x - r * 0.45} ${y} l${r * 0.35} ${r * 0.35} l${r * 0.75} -${r * 0.85}`} fill="none" stroke="#fff" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }
  if (s === 'failed' || s === 'error' || s === 'blocked') {
    const d = Math.round(r * 0.48);
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill={color} />
        <path d={`M${x - d} ${y - d} l${d * 2} ${d * 2} M${x + d} ${y - d} l-${d * 2} ${d * 2}`} stroke="#fff" strokeWidth={sw} strokeLinecap="round" />
      </g>
    );
  }
  if (s === 'running' || s === 'active') {
    return (
      <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${Math.round(r * 1.35)} ${Math.round(r * 0.9)}`} style={{ transformOrigin: `${x}px ${y}px` }}>
        <animateTransform attributeName="transform" type="rotate" from={`0 ${x} ${y}`} to={`360 ${x} ${y}`} dur="1.7s" repeatCount="indefinite" />
      </circle>
    );
  }
  if (s === 'skipped') {
    const d = Math.round(r * 0.48);
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={sw} />
        <path d={`M${x - d} ${y} h${d * 2}`} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      </g>
    );
  }
  return <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={sw} />;
}

function DagNode({ node, cx, cy, w, h, dense, selected, dimmed, onSelect }) {
  const type = nodeType(node);
  const status = String(node.status || node.metadata?.status || 'pending').toLowerCase();
  const sc = statusColor(status);
  const label = String(node.label || node.name || node.id || 'Node');
  const summary = String(node.summary || node.output_data || node.metadata?.evidence || '');
  const duration = String(node.duration || node.duration_ms || '');
  const x = cx - w / 2;
  const y = cy - h / 2;
  const pad = dense ? 14 : 18;
  const labelFont = dense ? 14 : 15;
  const iconR = dense ? 7 : 8;
  const iconX = x + pad + iconR;
  const iconY = y + 22;
  const labelLines = wrapWords(label, dense ? 20 : 24, 2);
  const previewLines = summary ? wrapWords(summary, dense ? 30 : 34, 1) : [];

  return (
    <g
      onClick={() => onSelect(node.id)}
      style={{ cursor: 'pointer', opacity: dimmed ? 0.32 : 1, transition: 'opacity .18s' }}
    >
      <rect x={x} y={y} width={w} height={h} rx="12" fill="rgba(255,255,255,.86)"
        stroke={selected ? sc : '#D6D4C8'} strokeWidth={selected ? 2.4 : 1.6} filter="url(#dagShadow)" />
      <rect x={x} y={y} width={dense ? 6 : 7} height={h} rx={3.5} fill={sc} />
      <StatusIcon x={iconX} y={iconY} status={status} color={sc} r={iconR} />
      <text x={iconX + iconR + 8} y={iconY + 4} fontSize={dense ? 10 : 11} fontWeight="800"
        fill={ACCENT} letterSpacing="1" fontFamily="Inter, system-ui, sans-serif">{typeLabel(type)}</text>
      {duration && (
        <text x={x + w - 12} y={iconY + 4} fontSize={dense ? 9 : 10} fontWeight="700"
          fill="rgba(25,25,25,.48)" textAnchor="end" fontFamily="Inter, system-ui, sans-serif">{duration}</text>
      )}
      {labelLines.map((line, i) => (
        <text key={i} x={x + pad} y={y + 48 + i * (labelFont + 2)} fontSize={labelFont} fontWeight="700"
          fill="#191919" fontFamily="Inter, system-ui, sans-serif">{line}</text>
      ))}
      {previewLines.map((line, i) => (
        <text key={`p${i}`} x={x + pad} y={y + h - 12} fontSize={dense ? 9 : 10} fontWeight="400"
          fill="rgba(25,25,25,.58)" fontFamily="Inter, system-ui, sans-serif">{line}</text>
      ))}
    </g>
  );
}

export default function AgentDag({ nodes }) {
  const [selected, setSelected] = useState(null);
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const { pos, width, height, NODE_W, NODE_H, dense } = useMemo(() => computeLayout(safeNodes), [safeNodes]);
  const byId = useMemo(() => new Map(safeNodes.map((n) => [String(n.id), n])), [safeNodes]);

  if (!safeNodes.length) {
    return <div className="text-[#8C8A84] text-sm italic p-8 text-center">No DAG nodes to render.</div>;
  }

  // Edges follow depends_on; colored by the downstream node's status; running
  // edges animate flow; conditional ("when") edges dash.
  const edges = [];
  for (const node of safeNodes) {
    const nid = String(node.id);
    const tgt = pos.get(nid);
    if (!tgt) continue;
    const status = String(node.status || 'pending').toLowerCase();
    const color = statusColor(status);
    const dashed = Boolean(node.when);
    const flowing = status === 'running' || status === 'active' || dashed;
    for (const dep of node.depends_on || []) {
      const src = pos.get(String(dep));
      if (!src) continue;
      const sy = src.y + NODE_H / 2 + 7;
      const ty = tgt.y - NODE_H / 2 - 7;
      const my = (sy + ty) / 2;
      edges.push(
        <path key={`${dep}->${nid}`} d={`M${src.x} ${sy} C${src.x} ${my} ${tgt.x} ${my} ${tgt.x} ${ty}`}
          fill="none" stroke={color} strokeWidth={dense ? 2.25 : 2.8} strokeLinecap="round"
          markerEnd="url(#dagArrow)" opacity="0.66" strokeDasharray={dashed ? '14 12' : undefined}>
          {flowing && <animate attributeName="stroke-dashoffset" from="52" to="0" dur="3.5s" repeatCount="indefinite" />}
        </path>
      );
    }
  }

  const sel = selected ? byId.get(String(selected)) : null;
  const selStatus = sel ? String(sel.status || 'pending').toLowerCase() : '';

  // Neighbors of the selected node stay lit; the rest dim.
  const lit = new Set();
  if (sel) {
    lit.add(String(sel.id));
    (sel.depends_on || []).forEach((d) => lit.add(String(d)));
    for (const n of safeNodes) {
      if ((n.depends_on || []).map(String).includes(String(sel.id))) lit.add(String(n.id));
    }
  }

  return (
    <div>
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" preserveAspectRatio="xMidYMin meet"
          style={{ display: 'block', minWidth: dense ? 680 : 520 }} role="img" aria-label="Agent DAG">
          <defs>
            <linearGradient id="dagBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F3F1E7" />
              <stop offset="100%" stopColor="#E9E7DC" />
            </linearGradient>
            <pattern id="dagDots" width="26" height="26" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.35" fill="rgba(25,25,25,.10)" />
            </pattern>
            <filter id="dagShadow" x="-10%" y="-10%" width="120%" height="135%">
              <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#191919" floodOpacity="0.08" />
            </filter>
            <marker id="dagArrow" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 z" fill={ACCENT} />
            </marker>
          </defs>
          <rect width={width} height={height} fill="url(#dagBg)" />
          <rect x="16" y="16" width={width - 32} height={height - 32} rx="16" fill="url(#dagDots)" opacity="0.7" />
          {edges}
          {safeNodes.map((node) => {
            const p = pos.get(String(node.id));
            if (!p) return null;
            return (
              <DagNode key={node.id} node={node} cx={p.x} cy={p.y} w={NODE_W} h={NODE_H} dense={dense}
                selected={String(selected) === String(node.id)}
                dimmed={Boolean(sel) && !lit.has(String(node.id))}
                onSelect={(id) => setSelected((cur) => (String(cur) === String(id) ? null : id))} />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 px-1 text-[11px] text-[#5C5C5C]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {[['completed', 'done'], ['running', 'active'], ['pending', 'waiting'], ['failed', 'blocked']].map(([s, lbl]) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, borderRadius: 999, background: statusColor(s), display: 'inline-block' }} />
            {lbl}
          </span>
        ))}
        <span className="text-[#8C8A84] ml-auto">Click a node for detail</span>
      </div>

      {/* Detail panel */}
      {sel && (
        <div className="mt-5 rounded-xl border p-5" style={{ borderColor: '#D6D4C8', background: 'rgba(255,255,255,.6)' }}>
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="text-[#191919]" style={{ fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600, fontSize: 18 }}>
              {sel.label || sel.id}
            </h3>
            <span style={{ background: statusColor(selStatus), color: '#fff', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
              {selStatus.replace(/_/g, ' ')}
            </span>
          </div>
          {sel.summary && <p className="text-[#5C5C5C] text-sm leading-relaxed mb-3">{sel.summary}</p>}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#8C8A84]">
            <span><span className="text-[#5C5C5C] font-semibold">type</span> {typeLabel(nodeType(sel))}</span>
            {sel.owner && <span><span className="text-[#5C5C5C] font-semibold">owner</span> {sel.owner}</span>}
            {sel.depends_on?.length > 0 && <span><span className="text-[#5C5C5C] font-semibold">depends on</span> {sel.depends_on.join(', ')}</span>}
            {sel.evidence && <span><span className="text-[#5C5C5C] font-semibold">evidence</span> {sel.evidence}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
