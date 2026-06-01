const SEVERITY_ORDER = { high: 0, medium: 1, low: 2, info: 3 };

export function sortBySeverity(findings) {
  return [...findings].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99),
  );
}

export function severityColor(sev) {
  switch (sev) {
    case 'high':
      return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
    case 'medium':
      return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' };
    case 'low':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    default:
      return { bg: 'bg-[#E6E4D9]', text: 'text-[#191919]/70', border: 'border-[#D6D4C8]' };
  }
}

export function groupPagesByHeader(pages) {
  const groups = new Map();
  for (const page of pages) {
    const key = page.header || 'unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(page);
  }
  return groups;
}

export function summarizeInventory(pages) {
  const total = pages.length;
  const byAuth = pages.reduce((acc, p) => {
    const k = p.auth || 'unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const withFooter = pages.filter((p) => p.footer).length;
  const headerCounts = pages.reduce((acc, p) => {
    const k = p.header || 'unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  return { total, byAuth, withFooter, headerCounts };
}
