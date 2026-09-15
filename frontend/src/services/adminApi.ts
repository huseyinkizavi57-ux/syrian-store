import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "https://syrian-store.onrender.com/api";

export const adminApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

let adminAccessToken: string | null = null;
let adminRefreshPromise: Promise<string | null> | null = null;

export function setAdminAccessToken(token: string | null) {
  adminAccessToken = token;
}

adminApi.interceptors.request.use((config) => {
  if (adminAccessToken) {
    config.headers.Authorization = `Bearer ${adminAccessToken}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !original.url.includes("/auth/")) {
      original._retry = true;
      try {
        if (!adminRefreshPromise) {
          adminRefreshPromise = adminApi
            .post("/admin/refresh")
            .then((r) => {
              const token = r.data.data.accessToken as string;
              setAdminAccessToken(token);
              return token;
            })
            .catch(() => {
              setAdminAccessToken(null);
              return null;
            })
            .finally(() => {
              adminRefreshPromise = null;
            });
        }
        const newToken = await adminRefreshPromise;
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return adminApi(original);
        }
      } catch {
        // fall through
      }
    }
    return Promise.reject(error);
  }
);

export function getAdminApiErrorMessage(err: unknown, fallback = "حدث خطأ غير متوقع"): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error?.message ?? fallback;
  }
  return fallback;
}