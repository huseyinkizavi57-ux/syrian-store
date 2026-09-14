import { NavLink, Navigate, Outlet } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

const NAV = [
  { to: "/admin", label: "لوحة القيادة", end: true },
  { to: "/admin/products", label: "المنتجات" },
  { to: "/admin/orders", label: "الطلبات" },
  { to: "/admin/coupons", label: "الكوبونات" },
  { to: "/admin/admins", label: "المدراء" },
  { to: "/admin/audit-logs", label: "سجل التدقيق" },
];

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  if (!admin) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-screen flex bg-gray-100" dir="rtl">
      <aside className="w-56 bg-gray-900 text-white p-4 flex flex-col">
        <h1 className="font-black text-lg mb-1">لوحة التحكم</h1>
        <p className="text-xs text-gray-400 mb-6">{admin.fullName} — {admin.role}</p>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `block px-3 py-2 rounded-lg text-sm ${isActive ? "bg-brand text-white" : "hover:bg-gray-800"}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={logout} className="text-sm text-gray-400 hover:text-white mt-4">تسجيل الخروج</button>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
