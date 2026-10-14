import axios from "axios";
import { store } from "./store";
import { clearAuth, fetchCurrentUser } from "./store/authSlice";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  withCredentials: true,
});

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

let sessionExpired = false;

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
