const API_BASE =
  "https://script.google.com/macros/s/AKfycbwBTT16NqFMoZyEVqWNBIBJXfra-uq943lIHXIrthJJ3AF8GQc9VvriQc8ojgSEwA4c/exec";

// Get session from localStorage
function getSession() {
  try {
    const s = localStorage.getItem("fabtrack_user");
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

// Save token after login
export function saveSession(user) {
  localStorage.setItem("fabtrack_user", JSON.stringify(user));
}

// Clear session on logout
export function clearSession() {
  localStorage.removeItem("fabtrack_user");
}

// Attach token + userID to every request automatically
function withAuth(params = {}) {
  const session = getSession();
  if (session?.token && session?.id) {
    return { ...params, token: session.token, userID: session.id };
  }
  return params;
}

export async function apiGet(resource, params = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set("resource", resource);
  const authParams = withAuth(params);
  for (const k in authParams) url.searchParams.set(k, authParams[k]);
  const res = await fetch(url.toString(), { method: "GET", redirect: "follow" });
  const data = await res.json();
  if (data?.code === 401) {
    clearSession();
    window.location.reload();
    return null;
  }
  return data;
}

// All writes use GET to avoid CORS preflight with Google Apps Script
export async function apiPost(resource, data = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set("resource", resource);
  const authData = withAuth(data);
  for (const k in authData) {
    if (authData[k] !== undefined && authData[k] !== null) {
      url.searchParams.set(k, authData[k]);
    }
  }
  const res = await fetch(url.toString(), { method: "GET", redirect: "follow" });
  const result = await res.json();
  if (result?.code === 401) {
    clearSession();
    window.location.reload();
    return null;
  }
  return result;
}
