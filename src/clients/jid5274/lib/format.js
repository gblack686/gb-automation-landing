// Presentation helpers for the jid5274 portal. Read-only formatting only.

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDuration(ms) {
  if (ms == null || Number.isNaN(Number(ms))) return '—';
  const n = Number(ms);
  if (n < 1000) return `${n} ms`;
  const s = n / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
}

export function formatSeconds(s) {
  if (s == null || Number.isNaN(Number(s))) return '—';
  const n = Number(s);
  if (n < 60) return `${n.toFixed(0)} s`;
  const m = Math.floor(n / 60);
  const rem = Math.round(n % 60);
  return `${m}m ${rem}s`;
}

export function formatCost(value) {
  if (value == null || Number.isNaN(Number(value))) return '$0.00';
  return `$${Number(value).toFixed(2)}`;
}

// Map a free-form status string to a gb-chip tone class.
export function statusChipClass(status) {
  const s = String(status || '').toLowerCase();
  if (['ok', 'done', 'pass', 'passed', 'success', 'green', 'merged', 'complete', 'completed'].includes(s)) {
    return 'gb-chip-green';
  }
  if (['fail', 'failed', 'error', 'crashed', 'red', 'blocked'].includes(s)) {
    return 'gb-chip-red';
  }
  if (['running', 'in_progress', 'in-progress', 'active', 'started', 'pending'].includes(s)) {
    return 'gb-chip-blue';
  }
  if (['skipped', 'queued', 'waiting', 'paused', 'todo', 'backlog'].includes(s)) {
    return 'gb-chip-amber';
  }
  return 'gb-chip-blue';
}
