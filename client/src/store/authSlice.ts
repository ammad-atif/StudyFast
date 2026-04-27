import { createSlice } from "@reduxjs/toolkit";

// Keep this exported so other files can reuse the user shape.
export type AuthUser = {
  _id: string;
  fullName: string;
  email: string;
  isVerified: boolean;
};

// Minimal auth state used across the app.
type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  expiresAt: number | null;
  isAuthenticated: boolean;
};

const AUTH_STORAGE_KEY = "auth";
const AUTH_SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

const emptyAuthState: AuthState = {
  accessToken: null,
  user: null,
  expiresAt: null,
  isAuthenticated: false,
};

// Read auth from localStorage when app starts.
const loadInitialAuth = (): AuthState => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return emptyAuthState;

    const parsed = JSON.parse(raw) as {
      accessToken?: string | null;
      user?: AuthUser | null;
      expiresAt?: number | null;
    };

    const accessToken = parsed.accessToken ?? null;
    const user = parsed.user ?? null;
    const expiresAt = parsed.expiresAt ?? null;

    // If token is expired (or expiry is missing), clear storage and log user out.
    if (!accessToken || !expiresAt || Date.now() >= expiresAt) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return emptyAuthState;
    }

    return {
      accessToken,
      user,
      expiresAt,
      isAuthenticated: Boolean(accessToken),
    };
  } catch {
    return emptyAuthState;
  }
};

// Save auth state for refresh persistence.
const persistAuth = (
  state: Pick<AuthState, "accessToken" | "user" | "expiresAt">,
) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
};

// Clear all auth-related storage keys.
const clearPersistedAuth = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  // Remove legacy key used before auth payload contained expiresAt.
  localStorage.removeItem("expiration");
};

const initialState: AuthState = loadInitialAuth();

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Save fresh credentials after login.
    setCredentials: (
      state,
      action: { payload: { accessToken: string; user: AuthUser } },
    ) => {
      const { accessToken, user } = action.payload;
      const expiresAt = Date.now() + AUTH_SESSION_TTL_MS;
      state.accessToken = accessToken;
      state.user = user;
      state.expiresAt = expiresAt;
      state.isAuthenticated = true;
      persistAuth({ accessToken, user, expiresAt });
    },
    // Remove credentials on logout.
    logout: (state) => {
      state.accessToken = emptyAuthState.accessToken;
      state.user = emptyAuthState.user;
      state.expiresAt = emptyAuthState.expiresAt;
      state.isAuthenticated = emptyAuthState.isAuthenticated;
      clearPersistedAuth();
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
