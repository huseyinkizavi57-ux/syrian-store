import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import { getApiErrorMessage } from "../../services/api";

type Log = {
  id: string;
  action: string;
  entityType: string;
  description: string;
  createdAt: string;
  admin: { fullName: string; role: string };
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  UPDATE: "bg-blue-100 text-blue-700 border-blue-200",
  STATUS_CHANGE: "bg-amber-100 text-amber-700 border-amber-200",
  DELETE: "bg-rose-100 text-rose-700 border-rose-200",
};

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function getAuthHeader() {
    const token = localStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  useEffect(() => {
    setLoading(true);
    adminApi
      .get("/admin/audit-logs", { headers: getAuthHeader() })
      .then((r) => setLogs(r.data.data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">سجل التدقيق</h1>
        <p className="text-xs text-gray-500 mt-0.5">متابعة دقيقة لكافة العمليات والتعديلات التي تتم في لوحة التحكم</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-right p-3">التاريخ والوقت</th>
              <th className="text-right p-3">المدير المنفذ</th>
              <th className="text-right p-3">نوع الإجراء</th>
              <th className="text-right p-3">القسم المتأثر</th>
              <th className="text-right p-3">تفاصيل التغيير</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">جاري تحميل سجل العمليات...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">لا توجد عمليات مسجلة في السجل حتى الآن</td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="border-t hover:bg-gray-50 transition">
                  <td className="p-3 text-xs text-gray-500 whitespace-nowrap font-mono">
                    {new Date(l.createdAt).toLocaleString("ar-SY")}
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-gray-800 text-xs">{l.admin?.fullName || "مجهول"}</div>
                    <div className="text-[11px] text-gray-400">{l.admin?.role}</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${ACTION_COLORS[l.action] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                      {l.action}
                    </span>
                  </td>
                  <td className="p-3 text-xs font-mono text-gray-600">{l.entityType}</td>
                  <td className="p-3 text-xs text-gray-700 leading-relaxed">{l.description}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}