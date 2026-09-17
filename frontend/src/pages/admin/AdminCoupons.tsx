import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import { getApiErrorMessage } from "../../services/api";

type Coupon = {
  id: string;
  code: string;
  type: string;
  percentageValue: number | null;
  fixedValue: number | null;
  timesUsed: number;
  usageLimitTotal: number | null;
  expiresAt: string | null;
  isActive: boolean;
};

const defaultForm = {
  code: "",
  type: "PERCENTAGE",
  value: "",
  usageLimitPerUser: "1",
  expiresAt: "",
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState(defaultForm);
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
      .get("/coupons", { headers: getAuthHeader() })
      .then((r) => setCoupons(r.data.data))
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
      await adminApi.post(
        "/coupons",
        {
          code: form.code.trim().toUpperCase(),
          type: form.type,
          percentageValue: form.type === "PERCENTAGE" ? Number(form.value) : undefined,
          fixedValue: form.type === "FIXED" ? Number(form.value) : undefined,
          usageLimitPerUser: form.usageLimitPerUser ? Number(form.usageLimitPerUser) : undefined,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        },
        { headers: getAuthHeader() }
      );
      setForm(defaultForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function toggleStatus(coupon: Coupon) {
    try {
      await adminApi.patch(
        `/coupons/${coupon.id}`,
        { isActive: !coupon.isActive },
        { headers: getAuthHeader() }
      );
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">الكوبونات</h1>
          <p className="text-xs text-gray-500 mt-0.5">إنشاء وإدارة قسائم التخفيض</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-bold transition"
        >
          {showForm ? "إلغاء" : "+ كود جديد"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border rounded-xl p-4 mb-6 grid grid-cols-2 gap-3 shadow-sm">
          <input
            placeholder="الكود (مثال: SAVE20)"
            className="border rounded-lg p-2 text-sm uppercase"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
          />
          <select
            className="border rounded-lg p-2 text-sm bg-white"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="PERCENTAGE">نسبة مئوية %</option>
            <option value="FIXED">مبلغ ثابت (ل.س)</option>
          </select>
          <input
            type="number"
            placeholder={form.type === "PERCENTAGE" ? "القيمة (مثال: 15)" : "المبلغ (مثال: 5000)"}
            className="border rounded-lg p-2 text-sm"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="الحد لكل مستخدم"
            className="border rounded-lg p-2 text-sm"
            value={form.usageLimitPerUser}
            onChange={(e) => setForm({ ...form, usageLimitPerUser: e.target.value })}
          />
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">تاريخ انتهاء الصلاحية (اختياري):</label>
            <input
              type="datetime-local"
              className="border rounded-lg p-2 text-sm bg-white"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
          </div>
          {error && <p className="text-red-600 text-sm col-span-2">{error}</p>}
          <button className="col-span-2 bg-gray-900 hover:bg-black text-white rounded-lg py-2 text-sm font-bold transition">
            حفظ الكوبون
          </button>
        </form>
      )}

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-right p-3">الكود</th>
              <th className="text-right p-3">القيمة</th>
              <th className="text-right p-3">مرات الاستخدام</th>
              <th className="text-right p-3">تاريخ الانتهاء</th>
              <th className="text-right p-3">الحالة</th>
              <th className="text-center p-3">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-400">جاري التحميل...</td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-400">لا توجد كوبونات حالياً</td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50 transition">
                  <td className="p-3 font-mono font-bold text-emerald-600">{c.code}</td>
                  <td className="p-3 font-medium">
                    {c.type === "PERCENTAGE" ? `${c.percentageValue}%` : `${Number(c.fixedValue).toLocaleString("ar-SY")} ل.س`}
                  </td>
                  <td className="p-3 text-xs text-gray-600">
                    {c.timesUsed}
                    {c.usageLimitTotal ? ` / ${c.usageLimitTotal}` : ""}
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("ar-SY") : "دائم"}
                  </td>
                  <td className="p-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {c.isActive ? "فعال" : "معطل"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleStatus(c)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                        c.isActive
                          ? "text-red-700 bg-red-50 border-red-200 hover:bg-red-100"
                          : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      {c.isActive ? "تعطيل" : "تفعيل"}
                    </button>
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