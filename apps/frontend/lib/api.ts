import axios from "axios";
import { store } from "./store";
import { setTokens, clearAuth } from "./store/authSlice";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  withCredentials: true,
});

// Request interceptor: attach Access Token if present
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If it's a 401 unauthorized and we haven't retried yet
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Don't intercept refresh token calls or logout calls to avoid infinite loop
      if (
        originalRequest.url?.includes("/auth/refresh") ||
        originalRequest.url?.includes("/auth/logout")
      ) {
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;
      
      const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
      
      if (refreshToken) {
        try {
          // Use raw axios to avoid interceptor loop
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/refresh`,
            { refreshToken },
            { withCredentials: true }
          );
          
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          
          // Dispatch setTokens to update Redux store and localStorage
          store.dispatch(setTokens({ accessToken, refreshToken: newRefreshToken }));
          
          // Update authorization header on the original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          
          // Retry the original request
          return api(originalRequest);
        } catch (refreshError) {
          // If refresh fails, clear auth state and redirect to landing page
          store.dispatch(clearAuth());
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token available, clear auth and redirect
        store.dispatch(clearAuth());
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      }
    }
    
    return Promise.reject(error);
  }
);
