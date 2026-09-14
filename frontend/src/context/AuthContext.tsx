import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setAccessToken } from "../services/api";

type User = { id: string; firstName: string; lastName: string; phone: string; email?: string | null };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (data: { firstName: string; lastName: string; phone: string; password: string; email?: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Try a silent refresh on first load (httpOnly cookie may still be valid).
    api
      .post("/auth/refresh")
      .then((r) => {
        setAccessToken(r.data.data.accessToken);
        return loadMe();
      })
      .catch(() => setLoading(false));
  }, [loadMe]);

  const login = useCallback(
    async (phone: string, password: string) => {
      const res = await api.post("/auth/login", { phone, password });
      setAccessToken(res.data.data.accessToken);
      await loadMe();
    },
    [loadMe]
  );

  const register = useCallback(async (data: { firstName: string; lastName: string; phone: string; password: string; email?: string }) => {
    await api.post("/auth/register", data);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setAccessToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
