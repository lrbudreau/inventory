const API_BASE =
  "https://script.google.com/macros/s/AKfycbyDcj9U3AmF-DqrtAy8uULykAhafUnts3xH5GBAsN83LEjc8FYB2T4KAvHreUPaVsmD/exec";

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
