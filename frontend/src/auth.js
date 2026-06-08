const API_BASE =
  "https://script.google.com/macros/s/AKfycbwBTT16NqFMoZyEVqWNBIBJXfra-uq943lIHXIrthJJ3AF8GQc9VvriQc8ojgSEwA4c/exec";

export async function apiGet(resource, params = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set("resource", resource);
  for (const k in params) url.searchParams.set(k, params[k]);
  const res = await fetch(url.toString(), { method: "GET" });
  return res.json();
}

// All write operations use GET to avoid CORS preflight issues with Google Apps Script
export async function apiPost(resource, data = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set("resource", resource);
  for (const k in data) {
    if (data[k] !== undefined && data[k] !== null) {
      url.searchParams.set(k, data[k]);
    }
  }
  const res = await fetch(url.toString(), { method: "GET" });
  return res.json();
}
