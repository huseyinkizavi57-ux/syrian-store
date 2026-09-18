import axios from "axios";
import toast from "react-hot-toast";

export const adminApi = axios.create({
  baseURL:
    (import.meta as any).env?.VITE_API_BASE_URL ||
    "https://syrian-store.onrender.com/api",
  withCredentials: true,
});

// إرفاق توكن الأدمن تلقائياً مع كل طلب
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// اعتراض انتهاء صلاحية الجلسة (401) وإعادة التوجيه لصفحة الدخول
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes("/admin/login")) {
        localStorage.removeItem("adminToken");
        toast.error("انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً");
        setTimeout(() => {
          window.location.href = "/admin/login";
        }, 1200);
      }
    }
    return Promise.reject(error);
  }
);