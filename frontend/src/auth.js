const API_BASE = "https://script.google.com/macros/s/AKfycbyzyNSnJrfeVyx9m62oh-c6souRBIEOoNd39IleJ1-9FdwwN1-CNT5ahmvtgESbWUZd/exec";

export async function api(path, opts = {}) {
  const headers = opts.headers || {};
  headers['Content-Type'] = 'application/json';
  const res = await fetch(API_BASE + (opts.method === 'GET' ? '?path=' + path : ''), { ...opts, headers, method: opts.method, body: opts.body });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw body || { message: 'network error' };
  return body;
}
