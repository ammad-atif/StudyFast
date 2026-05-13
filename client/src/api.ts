import axios from "axios";
import { store } from "./store";
import { logout } from "./store/authSlice";

const api = axios.create({
  baseURL: (import.meta as any).env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true, // send cookies (for refresh token flow)
  headers: { "Content-Type": "application/json" },
});

// Generate or retrieve request ID for tracing
const getOrCreateRequestId = (): string => {
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback for older browsers
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
};

// ─── Request interceptor ──────────────────────────────────────────
// Attach access token from Redux, enforce expiry, and add request ID for tracing
api.interceptors.request.use((config) => {
  const { accessToken, expiresAt } = store.getState().auth;

  // If session expired, clear auth state and skip auth header.
  if (expiresAt && Date.now() >= expiresAt) {
    store.dispatch(logout());
    return config;
  }

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  // Add request ID for distributed tracing
  config.headers["x-request-id"] = getOrCreateRequestId();

  return config;
});

// ─── Response interceptor ─────────────────────────────────────────
// Unwrap your { success, data } envelope so callers just get `data`
// Also handle 401 token refresh here if needed
api.interceptors.response.use(
  (response) => response.data,

  (error) => {
    const serverError = error.response?.data;

    return Promise.reject({
      code: serverError?.code || "UNKNOWN_ERROR",
      details: serverError?.details || null,
      statusCode: error.response?.status || serverError?.statusCode || null,
      message: serverError?.message || error.message,
      data: serverError || null,
    });
  },
);

export { api };
