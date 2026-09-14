import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";

type Log = { id: string; action: string; entityType: string; description: string; createdAt: string; admin: { fullName: string; role: string } };

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    adminApi.get("/admin/audit-logs").then((r) => setLogs(r.data.data));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">سجل التدقيق</h1>
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr><th className="text-right p-3">التاريخ</th><th className="text-right p-3">المدير</th><th className="text-right p-3">الإجراء</th><th className="text-right p-3">التفاصيل</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3 text-xs text-gray-500">{new Date(l.createdAt).toLocaleString("ar-SY")}</td>
                <td className="p-3">{l.admin.fullName} ({l.admin.role})</td>
                <td className="p-3">{l.action} — {l.entityType}</td>
                <td className="p-3">{l.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
