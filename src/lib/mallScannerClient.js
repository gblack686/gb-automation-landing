import { fetchAuthSession } from 'aws-amplify/auth';

const DEFAULT_BASE_URL = 'https://gbautoxyz.netlify.app';

function apiBaseUrl() {
  return (import.meta.env.VITE_MALL_SCANNER_API_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
}

async function authHeaders() {
  try {
    const session = await fetchAuthSession();
    const token = session?.tokens?.idToken?.toString();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(await authHeaders()),
    ...(options.headers || {}),
  };
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Mall Scanner API ${response.status}`);
  }
  return data;
}

export function getDashboard() {
  return request('/api/mall-scanner/dashboard');
}

export function getBrands() {
  return request('/api/mall-scanner/brands');
}

export function getBrandItems(brandSlug) {
  return request(`/api/mall-scanner/brands/${brandSlug}/items`);
}

export function addCrawlTarget(sourceUrl) {
  return request('/api/mall-scanner/crawl-targets', {
    method: 'POST',
    body: JSON.stringify({ source_url: sourceUrl }),
  });
}

export function getRecentEvents() {
  return request('/api/mall-scanner/events');
}

export function getLatestRun() {
  return request('/api/mall-scanner/latest-run');
}
