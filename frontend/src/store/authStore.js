import { create } from "zustand";

// Global auth state: the JWT, the decoded-ish user info we care about, and
// actions to set/clear them. Persisted to localStorage so a page refresh
// doesn't log the user out (Day 8 will actually populate this via the
// login/register forms).
const TOKEN_KEY = "openex_token";
const EMAIL_KEY = "openex_email";

function loadInitialToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null; // localStorage can throw in some private-browsing modes
  }
}

function loadInitialEmail() {
  try {
    return localStorage.getItem(EMAIL_KEY) || null;
  } catch {
    return null;
  }
}

export const useAuthStore = create((set) => ({
  token: loadInitialToken(),
  email: loadInitialEmail(),
  isAuthenticated: !!loadInitialToken(),

  // email is optional so existing call sites (login(token)) keep working
  // without changes; pass it whenever it's available (AuthResponse already
  // includes it) so the NavBar can show who's logged in.
  login: (token, email) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      if (email) localStorage.setItem(EMAIL_KEY, email);
    } catch {
      // ignore storage failures; token still lives in memory for this session
    }
    set({ token, email: email ?? null, isAuthenticated: true });
  },

  logout: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EMAIL_KEY);
    } catch {
      /* ignore */
    }
    set({ token: null, email: null, isAuthenticated: false });
  },
}));
