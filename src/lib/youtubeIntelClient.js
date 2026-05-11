import { fetchAuthSession } from 'aws-amplify/auth';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8787';

function apiBaseUrl() {
  return (import.meta.env.VITE_YOUTUBE_INTEL_API_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
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
    throw new Error(data.error || `YouTube Intel API ${response.status}`);
  }
  return data;
}

export function getDashboard() {
  return request('/api/youtube-intel/dashboard');
}

export function getChannels() {
  return request('/api/youtube-intel/channels');
}

export function addChannel(channel) {
  return request('/api/youtube-intel/channels', {
    method: 'POST',
    body: JSON.stringify(channel),
  });
}

export function backfillArtifacts() {
  return request('/api/youtube-intel/backfill', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
