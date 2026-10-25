import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "/api";
console.log("API URL:", API_URL); // Debug

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Create Axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Set default auth token if available in storage on load
try {
  const initialToken = localStorage.getItem("accessToken");
  if (initialToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${initialToken}`;
  }
} catch {}

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

// 1. REQUEST INTERCEPTOR
// Add auth token and handle caching
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("accessToken");

    // Add auth token
    if (token) {
      if (config.headers && typeof config.headers.set === "function") {
        config.headers.set("Authorization", `Bearer ${token}`);
      } else {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Debug logging in dev only if enabled
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_API === "true") {
      console.log("🔒 API Request:", config.method?.toUpperCase(), config.url);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Concurrency queue for token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 2. RESPONSE INTERCEPTOR
// Handle token refresh, caching, and retries
api.interceptors.response.use(
  (response) => {
    // 1. Cache successful GET responses
    if (response.config.method === "get" && !response.config.skipCache) {
      const cacheKey = `${response.config.url}${JSON.stringify(
        response.config.params || {}
      )}`;
      cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });
    }

    // 2. Auto-Clear Cache on Mutation (POST, PUT, DELETE, PATCH)
    // This ensures lists are refreshed immediately after any data change
    if (["post", "put", "delete", "patch"].includes(response.config.method)) {
      if (import.meta.env.DEV) {
        console.log(
          `♻️ Mutation detected (${response.config.method.toUpperCase()}), clearing cache...`
        );
      }
      clearCache();
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // SKIP REFRESH LOGIC FOR LOGIN/AUTH ENDPOINTS
    if (
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    // ---------------------------------------------------------
    // TOKEN REFRESH LOGIC (Handles 401 Unauthorized only)
    // ---------------------------------------------------------
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers && typeof originalRequest.headers.set === "function") {
              originalRequest.headers.set("Authorization", `Bearer ${token}`);
            } else {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        isRefreshing = false;
        processQueue(new Error("No refresh token available"), null);
        return Promise.reject(error);
      }

      try {
        console.log("🔄 Attempting token refresh...");

        // Try /auth/refresh-token first, with fallback to /auth/refresh
        let response;
        try {
          response = await axios.post(`${API_URL}/auth/refresh-token`, {
            refreshToken,
          });
        } catch (firstErr) {
          if (firstErr.response?.status === 404) {
            response = await axios.post(`${API_URL}/auth/refresh`, {
              refreshToken,
            });
          } else {
            throw firstErr;
          }
        }

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem("accessToken", accessToken);
        if (newRefreshToken) {
          localStorage.setItem("refreshToken", newRefreshToken);
        }

        setAuthToken(accessToken);
        processQueue(null, accessToken);

        if (originalRequest.headers && typeof originalRequest.headers.set === "function") {
          originalRequest.headers.set("Authorization", `Bearer ${accessToken}`);
        } else {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        console.error("❌ Refresh failed, clearing session:", refreshError);

        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("currentUser");
        localStorage.removeItem("user");
        clearCache();

        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ---------------------------------------------------------
    // RATE LIMIT HANDLING (429)
    // ---------------------------------------------------------
    // if (error.response?.status === 429) {
    //   const retryAfter = error.response.headers["retry-after"] || 5;
    //   console.log(`⏳ Rate limited. Retrying after ${retryAfter} seconds...`);

    //   // Dispatch event for UI notification (optional)
    //   const rateLimitEvent = new CustomEvent("api-rate-limit", {
    //     detail: { retryAfter, url: originalRequest.url },
    //   });
    //   window.dispatchEvent(rateLimitEvent);

    //   // Wait
    //   await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));

    //   // Dispatch event when retry is happening
    //   const retryEvent = new CustomEvent("api-retry", {
    //     detail: { url: originalRequest.url },
    //   });
    //   window.dispatchEvent(retryEvent);

    //   // Retry
    //   return api(originalRequest);
    // }

    // Standard error return
    return Promise.reject(error);
  }
);

// Cache control methods
const clearCache = (pattern) => {
  if (pattern) {
    // Clear specific cache entries matching the pattern
    const keys = [...cache.keys()];
    keys.forEach((key) => {
      if (key.includes(pattern)) {
        cache.delete(key);
        console.log("🧹 Cleared cache for:", key);
      }
    });
  } else {
    // Clear all cache
    cache.clear();
    console.log("🧹 Cleared all cache");
  }
};

// Export both the API instance and cache control
export { clearCache };
export default api;
