const API_BASE =
  "https://script.google.com/macros/s/AKfycbwBTT16NqFMoZyEVqWNBIBJXfra-uq943lIHXIrthJJ3AF8GQc9VvriQc8ojgSEwA4c/exec";

export async function apiGet(resource, params = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set("resource", resource);
  for (const k in params) url.searchParams.set(k, params[k]);

  const res = await fetch(url.toString(), { method: "GET" });
  const body = await res.json();
  return body;
}

export async function apiPost(payload) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const body = await res.json();
  return body;
}
