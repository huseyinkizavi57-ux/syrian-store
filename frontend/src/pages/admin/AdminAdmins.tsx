import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import { getApiErrorMessage } from "../../services/api";
import { useAdminAuth } from "../../context/AdminAuthContext";

type AdminUser = { id: string; fullName: string; email: string; role: string; isActive: boolean };

const ROLES_INFO: Record<string, { label: string; color: string }> = {
  OWNER: { label: "المالك (Owner)", color: "bg-purple-100 text-purple-700 border-purple-200" },
  ADMIN: { label: "مدير عام (Admin)", color: "bg-blue-100 text-blue-700 border-blue-200" },
  PRODUCT_MANAGER: { label: "مدير المنتجات", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ORDER_MANAGER: { label: "مدير الطلبات", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  DELIVERY_MANAGER: { label: "مسؤول التوصيل", color: "bg-amber-100 text-amber-700 border-amber-200" },
};

const ROLES = ["OWNER", "ADMIN", "PRODUCT_MANAGER", "ORDER_MANAGER", "DELIVERY_MANAGER"];

export default function AdminAdmins() {
  const { admin: me } = useAdminAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "PRODUCT_MANAGER" });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function getAuthHeader() {
    const token = localStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function load() {
    setLoading(true);
    adminApi
      .get("/admin/admins", { headers: getAuthHeader() })
      .then((r) => setAdmins(r.data.data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await adminApi.post("/admin/admins", form, { headers: getAuthHeader() });
      setForm({ fullName: "", email: "", password: "", role: "PRODUCT_MANAGER" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function toggleActive(a: AdminUser) {
    try {
      await adminApi.patch(`/admin/admins/${a.id}`, { isActive: !a.isActive }, { headers: getAuthHeader() });
      load();
    } catch (err) {
      alert(getApiErrorMessage(err));
    }
  }

  if (me?.role !== "OWNER" && me?.role !== "ADMIN") {
    return (
      <div className="p-6 bg-white border rounded-xl text-center text-gray-500">
        لا تملك صلاحية الوصول لهذه الصفحة
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">إدارة المدراء والصلاحيات</h1>
          <p className="text-xs text-gray-500 mt-0.5">التحكم بحسابات فريق العمل وأدوارهم في اللوحة</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-bold transition"
        >
          {showForm ? "إلغاء" : "+ إضافة مدير جديد"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border rounded-xl p-4 grid grid-cols-2 gap-3 shadow-sm">
          <input
            placeholder="الاسم الكامل"
            className="border rounded-lg p-2 text-sm"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            className="border rounded-lg p-2 text-sm"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            className="border rounded-lg p-2 text-sm"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <select
            className="border rounded-lg p-2 text-sm bg-white"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {ROLES.filter((r) => r !== "OWNER" || me?.role === "OWNER").map((r) => (
              <option key={r} value={r}>
                {ROLES_INFO[r]?.label || r}
              </option>
            ))}
          </select>
          {error && <p className="text-red-600 text-xs col-span-2">{error}</p>}
          <button className="col-span-2 bg-gray-900 hover:bg-black text-white rounded-lg py-2 text-sm font-bold transition">
            إنشاء حساب مدير
          </button>
        </form>
      )}

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-right p-3">الاسم</th>
              <th className="text-right p-3">البريد الإلكتروني</th>
              <th className="text-right p-3">الدور / الصلاحية</th>
              <th className="text-right p-3">الحالة</th>
              <th className="text-center p-3">الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-400">جاري تحميل الحسابات...</td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-400">لا يوجد مدراء مسجلون</td>
              </tr>
            ) : (
              admins.map((a) => (
                <tr key={a.id} className="border-t hover:bg-gray-50 transition">
                  <td className="p-3 font-semibold text-gray-800">{a.fullName}</td>
                  <td className="p-3 text-gray-600 font-mono text-xs">{a.email}</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${ROLES_INFO[a.role]?.color || "bg-gray-100 text-gray-700"}`}>
                      {ROLES_INFO[a.role]?.label || a.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${a.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {a.isActive ? "نشط" : "معطل"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {a.role !== "OWNER" || me?.role === "OWNER" ? (
                      <button
                        onClick={() => toggleActive(a)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                          a.isActive
                            ? "text-red-700 bg-red-50 border-red-200 hover:bg-red-100"
                            : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                        }`}
                      >
                        {a.isActive ? "تعطيل" : "تفعيل"}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}