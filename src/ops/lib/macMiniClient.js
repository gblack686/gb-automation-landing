// Client for the Mac Mini ops API (Netlify function /api/mac-mini/*). Mirrors
// src/lib/mallScannerClient.js: attaches the Cognito ID token as a Bearer header.
import { fetchAuthSession } from 'aws-amplify/auth';

const DEFAULT_BASE_URL = 'https://gbautoxyz.netlify.app';

function apiBaseUrl() {
  return (import.meta.env.VITE_OPS_API_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
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
  const response = await fetch(`${apiBaseUrl()}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Mac Mini API ${response.status}`);
  }
  return data;
}

export function getTelemetry() {
  return request('/api/mac-mini/telemetry');
}

export function createActionRequest(action, params = {}) {
  return request('/api/mac-mini/requests', {
    method: 'POST',
    body: JSON.stringify({ action, params }),
  });
}

export function getRequest(id) {
  return request(`/api/mac-mini/requests?id=${encodeURIComponent(id)}`);
}

export function listRequests() {
  return request('/api/mac-mini/requests');
}
