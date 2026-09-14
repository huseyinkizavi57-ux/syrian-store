import axios from "axios";

// Separate axios instance for admin calls so the admin access token never
// collides with the customer session's token (both can be "logged in"
// simultaneously in the same browser, e.g. two tabs, without interfering).
export const adminApi = axios.create({ baseURL: "/api" });

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("admin");
      window.location.href = "/admin/login";
    }
    return Promise.reject(error);
  }
);
