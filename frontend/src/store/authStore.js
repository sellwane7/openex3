import { create } from "zustand";

// Global auth state: the JWT, the decoded-ish user info we care about, and
// actions to set/clear them. Persisted to localStorage so a page refresh
// doesn't log the user out (Day 8 will actually populate this via the
// login/register forms).
const TOKEN_KEY = "openex_token";

function loadInitialToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null; // localStorage can throw in some private-browsing modes
  }
}

export const useAuthStore = create((set) => ({
  token: loadInitialToken(),
  isAuthenticated: !!loadInitialToken(),

  login: (token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // ignore storage failures; token still lives in memory for this session
    }
    set({ token, isAuthenticated: true });
  },

  logout: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    set({ token: null, isAuthenticated: false });
  },
}));
