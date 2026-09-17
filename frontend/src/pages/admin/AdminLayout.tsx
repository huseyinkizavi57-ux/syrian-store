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
  const token = localStorage.getItem("adminToken");

  // إذا لم يكن هناك توكن محفوظ ولا بيانات أدمن، توجه لصفحة تسجيل الدخول
  if (!token && !admin) {
    return <Navigate to="/admin/login" replace />;
  }

  // في حال جاري استرجاع بيانات الأدمن من التوكن
  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 text-sm">
        جاري التحقق من الجلسة...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-100" dir="rtl">
      <aside className="w-56 bg-gray-900 text-white p-4 flex flex-col shrink-0">
        <h1 className="font-black text-lg mb-1">لوحة التحكم</h1>
        <p className="text-xs text-gray-400 mb-6 truncate" title={`${admin.fullName} — ${admin.role}`}>
          {admin.fullName} — {admin.role}
        </p>

        <nav className="flex-1 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition ${
                  isActive ? "bg-emerald-600 text-white font-bold" : "hover:bg-gray-800 text-gray-300"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={logout}
          className="text-sm text-rose-400 hover:text-rose-300 hover:bg-gray-800 p-2 rounded-lg text-right transition mt-4"
        >
          تسجيل الخروج ←
        </button>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}