import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  product?: { name: string };
};

type Order = { 
  id: string; 
  orderNumber: string; 
  status: string; 
  total: number; 
  createdAt: string; 
  address?: string;
  items?: OrderItem[];
  user: { firstName: string; lastName: string; phone: string; email?: string }; 
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "بانتظار الدفع", 
  PAID: "تم الدفع", 
  PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن", 
  DELIVERED: "تم التسليم", 
  CANCELLED: "ملغى", 
  REFUNDED: "مسترجع",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-700 border-amber-200",
  PAID: "bg-blue-100 text-blue-700 border-blue-200",
  PROCESSING: "bg-indigo-100 text-indigo-700 border-indigo-200",
  SHIPPED: "bg-purple-100 text-purple-700 border-purple-200",
  DELIVERED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-700 border-rose-200",
  REFUNDED: "bg-gray-100 text-gray-700 border-gray-200",
};

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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  function getAuthHeader() {
    const token = localStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function load() {
    setLoading(true);
    adminApi.get("/orders/admin/all", { 
      params: { status: filter || undefined },
      headers: getAuthHeader()
    })
    .then((r) => setOrders(r.data.data))
    .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [filter]);

  async function updateStatus(orderId: string, status: string) {
    await adminApi.post(
      `/orders/admin/${orderId}/status`, 
      { status },
      { headers: getAuthHeader() }
    );
    load();
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => prev ? { ...prev, status } : null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">إدارة الطلبات</h1>
          <p className="text-xs text-gray-500 mt-0.5">متابعة المبيعات وتحديث مسار الشحن</p>
        </div>
        <select 
          className="border rounded-lg px-3 py-2 text-sm bg-white shadow-sm outline-none focus:ring-1 focus:ring-emerald-500" 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-right p-3">رقم الطلب</th>
              <th className="text-right p-3">العميل</th>
              <th className="text-right p-3">الإجمالي</th>
              <th className="text-right p-3">تاريخ الطلب</th>
              <th className="text-right p-3">الحالة</th>
              <th className="text-center p-3">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">جاري تحميل الطلبات...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">لا توجد طلبات مسجلة حالياً</td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-t hover:bg-gray-50 transition">
                  <td className="p-3 font-semibold text-gray-800">#{o.orderNumber}</td>
                  <td className="p-3">
                    <div className="font-medium text-gray-800">{o.user.firstName} {o.user.lastName}</div>
                    <div className="text-xs text-gray-400">{o.user.phone}</div>
                  </td>
                  <td className="p-3 font-semibold text-emerald-600">
                    {Number(o.total).toLocaleString("ar-SY")} ل.س
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {new Date(o.createdAt).toLocaleDateString("ar-SY")}
                  </td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[o.status] || "bg-gray-100 text-gray-700"}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <button 
                        onClick={() => setSelectedOrder(o)}
                        className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                      >
                        تفاصيل
                      </button>
                      {(NEXT_STATUS[o.status] ?? []).map((s) => {
                        if (s === "CANCELLED" && admin?.role === "DELIVERY_MANAGER") return null;
                        const isCancel = s === "CANCELLED";
                        return (
                          <button 
                            key={s} 
                            onClick={() => updateStatus(o.id, s)} 
                            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                              isCancel 
                                ? "text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100" 
                                : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                            }`}
                          >
                            → {STATUS_LABELS[s]}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* نافذة تفاصيل الطلب */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">تفاصيل الطلب #{selectedOrder.orderNumber}</h2>
                <p className="text-xs text-gray-400">{new Date(selectedOrder.createdAt).toLocaleString("ar-SY")}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">العميل:</span>
                <span className="font-semibold text-gray-800">{selectedOrder.user.firstName} {selectedOrder.user.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">رقم الهاتف:</span>
                <span className="font-semibold text-gray-800">{selectedOrder.user.phone}</span>
              </div>
              {selectedOrder.address && (
                <div className="flex justify-between">
                  <span className="text-gray-500">العنوان:</span>
                  <span className="font-semibold text-gray-800">{selectedOrder.address}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t">
                <span className="text-gray-500">الحالة الحالية:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[selectedOrder.status]}`}>
                  {STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
                </span>
              </div>
            </div>

            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-600 mb-2">العناصر المطلوبة:</h4>
                <div className="border rounded-lg overflow-hidden max-h-36 overflow-y-auto text-xs">
                  <table className="w-full text-right">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="p-2">المنتج</th>
                        <th className="p-2">الكمية</th>
                        <th className="p-2">السعر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2 font-medium">{item.product?.name || "منتج"}</td>
                          <td className="p-2">{item.quantity}</td>
                          <td className="p-2">{Number(item.price).toLocaleString("ar-SY")} ل.س</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t font-bold">
              <span className="text-gray-700 text-sm">المجموع الإجمالي:</span>
              <span className="text-emerald-600 text-base">{Number(selectedOrder.total).toLocaleString("ar-SY")} ل.س</span>
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                onClick={() => setSelectedOrder(null)} 
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-1.5 rounded-lg text-xs font-bold transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}