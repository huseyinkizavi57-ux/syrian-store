import React, { createContext, useContext, useState, useCallback } from "react";
import { api } from "../services/api";

// NOTE: unlike customer auth, admin sessions here are access-token-only
// (stored in memory + localStorage), with no refresh-token rotation — the
// spec did not call for a persistent "remember me" admin session, and
// keeping admin sessions short-lived and re-login-based is a reasonable,
// simpler default for a back-office tool. If persistent admin sessions are
// wanted later, mirror the customer refresh-token flow in
// backend/src/modules/auth for AdminUser too.
type Admin = { id: string; fullName: string; role: string };

type AdminAuthContextValue = {
  admin: Admin | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(() => {
    const raw = localStorage.getItem("admin");
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("adminToken"));

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post("/auth/admin/login", { email, password });
    setToken(res.data.data.accessToken);
    setAdmin(res.data.data.admin);
    localStorage.setItem("adminToken", res.data.data.accessToken);
    localStorage.setItem("admin", JSON.stringify(res.data.data.admin));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAdmin(null);
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");
  }, []);

  return <AdminAuthContext.Provider value={{ admin, token, login, logout }}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
