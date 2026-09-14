import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import { getApiErrorMessage } from "../../services/api";
import { useAdminAuth } from "../../context/AdminAuthContext";

type AdminUser = { id: string; fullName: string; email: string; role: string; isActive: boolean };
const ROLES = ["OWNER", "ADMIN", "PRODUCT_MANAGER", "ORDER_MANAGER", "DELIVERY_MANAGER"];

export default function AdminAdmins() {
  const { admin: me } = useAdminAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "PRODUCT_MANAGER" });
  const [error, setError] = useState<string | null>(null);

  function load() {
    adminApi.get("/admin/admins").then((r) => setAdmins(r.data.data));
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await adminApi.post("/admin/admins", form);
      setForm({ fullName: "", email: "", password: "", role: "PRODUCT_MANAGER" });
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function toggleActive(a: AdminUser) {
    try {
      await adminApi.patch(`/admin/admins/${a.id}`, { isActive: !a.isActive });
      load();
    } catch (err) {
      alert(getApiErrorMessage(err));
    }
  }

  if (me?.role !== "OWNER" && me?.role !== "ADMIN") {
    return <p className="text-gray-500">لا تملك صلاحية الوصول لهذه الصفحة</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">إدارة المدراء</h1>
      <form onSubmit={handleCreate} className="bg-white border rounded-xl p-4 mb-6 grid grid-cols-2 gap-3">
        <input placeholder="الاسم الكامل" className="border rounded-lg p-2 text-sm" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
        <input type="email" placeholder="البريد الإلكتروني" className="border rounded-lg p-2 text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input type="password" placeholder="كلمة المرور" className="border rounded-lg p-2 text-sm" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <select className="border rounded-lg p-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {ROLES.filter((r) => r !== "OWNER" || me?.role === "OWNER").map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {error && <p className="text-red-600 text-sm col-span-2">{error}</p>}
        <button className="col-span-2 bg-gray-900 text-white rounded-lg py-2 text-sm font-bold">إنشاء حساب مدير</button>
      </form>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr><th className="text-right p-3">الاسم</th><th className="text-right p-3">البريد</th><th className="text-right p-3">الدور</th><th className="text-right p-3">الحالة</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-3">{a.fullName}</td>
                <td className="p-3">{a.email}</td>
                <td className="p-3">{a.role}</td>
                <td className="p-3">{a.isActive ? "نشط" : "معطل"}</td>
                <td className="p-3">
                  {a.role !== "OWNER" || me?.role === "OWNER" ? (
                    <button onClick={() => toggleActive(a)} className="text-brand text-xs font-bold">
                      {a.isActive ? "تعطيل" : "تفعيل"}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
