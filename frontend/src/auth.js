const API_BASE = "https://script.google.com/macros/s/AKfycbyW6n3XNMTiHyBvV84ZVumIy0KH3d4ZqJ8kuFrj7u5nqBxM7q6VPWzUsTKRdG-oOylb/exec";

export async function api(path, opts = {}) {
  const headers = opts.headers || {};

  // ONLY add JSON header for POST
  if (opts.method === 'POST') {
    headers['Content-Type'] = 'application/json';
  }

  const url = opts.method === 'GET'
    ? `${API_BASE}?path=${path}`
    : API_BASE;

  const res = await fetch(url, { ...opts, headers });

  const body = await res.json().catch(() => null);
  if (!res.ok) throw body || { message: 'network error' };
  return body;
}
