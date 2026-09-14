import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

type Order = { id: string; orderNumber: string; status: string; total: number; createdAt: string; user: { firstName: string; lastName: string; phone: string } };

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "بانتظار الدفع", PAID: "تم الدفع", PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن", DELIVERED: "تم التسليم", CANCELLED: "ملغى", REFUNDED: "مسترجع",
};

// Mirrors the backend's VALID_TRANSITIONS map so the UI only offers legal
// next steps — the backend still re-validates and is the real guard.
const NEXT_STATUS: Record<string, string[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
};

export default function AdminOrders() {
  const { admin } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("");

  function load() {
    adminApi.get("/orders/admin/all", { params: { status: filter || undefined } }).then((r) => setOrders(r.data.data));
  }

  useEffect(() => { load(); }, [filter]);

  async function updateStatus(orderId: string, status: string) {
    await adminApi.post(`/orders/admin/${orderId}/status`, { status });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">الطلبات</h1>
        <select className="border rounded-lg p-2 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-right p-3">رقم الطلب</th>
              <th className="text-right p-3">العميل</th>
              <th className="text-right p-3">الإجمالي</th>
              <th className="text-right p-3">الحالة</th>
              <th className="text-right p-3">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-3 font-medium">#{o.orderNumber}</td>
                <td className="p-3">{o.user.firstName} {o.user.lastName} — {o.user.phone}</td>
                <td className="p-3">{o.total.toLocaleString("ar-SY")} ل.س</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs">{STATUS_LABELS[o.status]}</span></td>
                <td className="p-3">
                  {(NEXT_STATUS[o.status] ?? []).map((s) => {
                    // DELIVERY_MANAGER cannot cancel — mirrors backend rule.
                    if (s === "CANCELLED" && admin?.role === "DELIVERY_MANAGER") return null;
                    return (
                      <button key={s} onClick={() => updateStatus(o.id, s)} className="text-brand text-xs font-bold ml-2">
                        → {STATUS_LABELS[s]}
                      </button>
                    );
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}