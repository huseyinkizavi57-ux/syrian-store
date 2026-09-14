import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

type Order = { id: string; orderNumber: string; status: string; total: number; createdAt: string; items: { id: string }[] };

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "بانتظار الدفع", PAID: "تم الدفع", PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن", DELIVERED: "تم التسليم", CANCELLED: "ملغى", REFUNDED: "مسترجع",
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api.get("/orders").then((r) => setOrders(r.data.data));
  }, []);

  if (orders.length === 0) return <p className="text-gray-500">لا توجد طلبات سابقة</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <h1 className="text-xl font-bold mb-4">طلباتي</h1>
      {orders.map((o) => (
        <Link key={o.id} to={`/orders/${o.id}`} className="block bg-white border rounded-xl p-4 hover:border-brand">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold">#{o.orderNumber}</p>
              <p className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString("ar-SY")} — {o.items.length} منتج</p>
            </div>
            <div className="text-left">
              <p className="font-bold text-brand">{o.total.toLocaleString("ar-SY")} ل.س</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{STATUS_LABELS[o.status]}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
