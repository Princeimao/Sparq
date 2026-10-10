import axios from "axios";
import { store } from "./store";
import { clearAuth, fetchCurrentUser } from "./store/authSlice";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  // Session cookies (httpOnly) are sent automatically. Tokens are never
  // stored in localStorage and never set as Authorization headers.
  withCredentials: true,
});

// Single-flight refresh: concurrent 401s share one refresh request so token
// rotation can't invalidate itself through parallel calls.
let refreshPromise: Promise<unknown> | null = null;

function refreshSession(): Promise<unknown> {
  if (!refreshPromise) {
    // Raw axios (no interceptors) to avoid loops. The refresh token travels
    // in its httpOnly cookie — no request body needed.
    refreshPromise = axios
      .post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/refresh`, null, {
        withCredentials: true,
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Circuit breaker: once a refresh has definitively failed (no session),
// don't keep hammering /auth/refresh on every subsequent 401. Resets on
// full page load and on any successful refresh.
let sessionExpired = false;

// App routes that require a session (mirror the dashboard nav). Public pages
// (landing, pricing, auth callback, …) must NEVER hard-redirect on 401,
// otherwise logged-out visitors get stuck in a reload loop.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/calendar",
  "/customers",
  "/flows",
  "/forms",
  "/integrations",
  "/products",
  "/resources",
  "/services",
  "/profile",
  "/subscription",
  "/settings",
];

function isProtectedRoute(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function isAuthEndpoint(url?: string): boolean {
  return (
    !!url &&
    (url.includes("/auth/refresh") ||
      url.includes("/auth/logout") ||
      url.includes("/auth/callback"))
  );
}

// Response interceptor: on 401, silently refresh the cookie session once,
// then retry the original request.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;

      // No session at all (previous refresh already failed) — fail fast
      // instead of hitting /auth/refresh again.
      if (sessionExpired) {
        store.dispatch(clearAuth());
        return Promise.reject(error);
      }

      try {
        await refreshSession();
        sessionExpired = false;
        // Session cookies are fresh — update user state and retry.
        await store.dispatch(fetchCurrentUser()).unwrap();
        return api(originalRequest);
      } catch {
        sessionExpired = true;
        store.dispatch(clearAuth());
        // Only bounce to landing from pages that actually need a session.
        // Redirecting from public pages causes a reload loop.
        if (typeof window !== "undefined" && isProtectedRoute()) {
          window.location.href = "/";
        }
      }
    }

    return Promise.reject(error);
  },
);
