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
  const [error, setError] = useState<string | null>(null);

  function load() {
    adminApi.get("/coupons").then((r) => setCoupons(r.data.data));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await adminApi.post("/coupons", {
        code: form.code.toUpperCase(),
        type: form.type,
        percentageValue: form.type === "PERCENTAGE" ? Number(form.value) : undefined,
        fixedValue: form.type === "FIXED" ? Number(form.value) : undefined,
        usageLimitPerUser: form.usageLimitPerUser ? Number(form.usageLimitPerUser) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      });
      setForm(defaultForm);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">الكوبونات</h1>
      <form onSubmit={handleCreate} className="bg-white border rounded-xl p-4 mb-6 grid grid-cols-2 gap-3">
        <input
          placeholder="الكود"
          className="border rounded-lg p-2 text-sm"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          required
        />
        <select
          className="border rounded-lg p-2 text-sm"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="PERCENTAGE">نسبة مئوية %</option>
          <option value="FIXED">مبلغ ثابت</option>
        </select>
        <input
          type="number"
          placeholder="القيمة"
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
          <label className="text-xs text-gray-500">تاريخ انتهاء الصلاحية (اختياري):</label>
          <input
            type="datetime-local"
            className="border rounded-lg p-2 text-sm"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          />
        </div>
        {error && <p className="text-red-600 text-sm col-span-2">{error}</p>}
        <button className="col-span-2 bg-gray-900 text-white rounded-lg py-2 text-sm font-bold">
          إنشاء كوبون
        </button>
      </form>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-right p-3">الكود</th>
              <th className="text-right p-3">القيمة</th>
              <th className="text-right p-3">الاستخدام</th>
              <th className="text-right p-3">تاريخ الانتهاء</th>
              <th className="text-right p-3">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-mono">{c.code}</td>
                <td className="p-3">
                  {c.type === "PERCENTAGE" ? `${c.percentageValue}%` : `${c.fixedValue} ل.س`}
                </td>
                <td className="p-3">
                  {c.timesUsed}
                  {c.usageLimitTotal ? ` / ${c.usageLimitTotal}` : ""}
                </td>
                <td className="p-3 text-xs text-gray-500">
                  {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("ar-SY") : "دائم"}
                </td>
                <td className="p-3">{c.isActive ? "فعال" : "معطل"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}