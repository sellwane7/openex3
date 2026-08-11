import { useAuthStore } from "../store/authStore";

// All backend calls go through here. Vite proxies /api to the Spring Boot
// backend in dev (see vite.config.js note in README) — in production, point
// this at your deployed backend URL via an env var instead.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// Same host as API_BASE, just with the http(s) scheme swapped for ws(s) —
// used by the Day 10 STOMP client to reach the backend's /ws endpoint.
export const WS_BASE = API_BASE.replace(/^http/, "ws");

export async function apiFetch(path, options = {}) {
  const token = useAuthStore.getState().token;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    // token missing/expired/invalid — log the user out so the UI reflects it
    useAuthStore.getState().logout();
  }

  return res;
}
