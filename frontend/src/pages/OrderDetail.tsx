import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, getApiErrorMessage } from "../services/api";

type Order = {
  id: string; orderNumber: string; status: string; subtotal: number; discountTotal: number;
  shippingFee: number; total: number; expiresAt: string | null;
  items: { id: string; nameSnapshot: string; colorSnapshot: string | null; sizeSnapshot: string | null; priceSnapshot: number; quantity: number }[];
  address: { governorate: string; city: string; area: string | null; street: string | null; phone: string };
  payments: { id: string; status: string; provider: string; createdAt: string }[];
  statusHistory: { status: string; createdAt: string; note: string | null }[];
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "بانتظار الدفع", PAID: "تم الدفع", PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن", DELIVERED: "تم التسليم", CANCELLED: "ملغى", REFUNDED: "مسترجع",
};
const TIMELINE = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api.get(`/orders/${id}`);
    setOrder(res.data.data);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handlePay() {
    setPaying(true);
    setError(null);
    try {
      const initRes = await api.post("/payments/initiate", { orderId: id });
      // MOCK provider settles instantly; poll/check once to reconcile then reload.
      await api.post(`/payments/${initRes.data.data.id}/check`);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setPaying(false);
    }
  }

  async function handleCancel() {
    if (!confirm("هل أنت متأكد من إلغاء الطلب؟")) return;
    try {
      await api.post(`/orders/${id}/cancel`);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  if (!order) return <p className="text-gray-500">جاري التحميل...</p>;

  const currentIdx = TIMELINE.indexOf(order.status);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">طلب #{order.orderNumber}</h1>
        <span className="text-sm font-medium px-3 py-1 rounded-full bg-brand/10 text-brand">{STATUS_LABELS[order.status]}</span>
      </div>

      {!["CANCELLED", "REFUNDED"].includes(order.status) && (
        <div className="bg-white border rounded-xl p-4">
          <div className="flex justify-between">
            {TIMELINE.map((s, i) => (
              <div key={s} className="flex-1 text-center">
                <div className={`w-6 h-6 mx-auto rounded-full text-xs flex items-center justify-center ${i <= currentIdx ? "bg-brand text-white" : "bg-gray-200 text-gray-400"}`}>
                  {i + 1}
                </div>
                <p className={`text-xs mt-1 ${i <= currentIdx ? "text-brand font-medium" : "text-gray-400"}`}>{STATUS_LABELS[s]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {order.status === "PENDING_PAYMENT" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
          <p className="font-medium">الطلب بانتظار الدفع عبر Sham Cash.</p>
          {order.expiresAt && <p className="text-gray-500 mt-1">سيتم إلغاء الطلب تلقائياً إذا لم يتم الدفع قبل {new Date(order.expiresAt).toLocaleTimeString("ar-SY")}</p>}
          <button onClick={handlePay} disabled={paying} className="mt-3 bg-brand text-white rounded-lg px-4 py-2 font-bold disabled:opacity-50">
            {paying ? "جاري المعالجة..." : "الدفع عبر Sham Cash"}
          </button>
          <button onClick={handleCancel} className="mt-3 mr-3 text-red-600 text-sm">إلغاء الطلب</button>
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="bg-white border rounded-xl p-4 space-y-2">
        <h2 className="font-bold mb-2">المنتجات</h2>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>{item.nameSnapshot} {[item.colorSnapshot, item.sizeSnapshot].filter(Boolean).join(" / ") && `(${[item.colorSnapshot, item.sizeSnapshot].filter(Boolean).join(" / ")})`} × {item.quantity}</span>
            <span>{(item.priceSnapshot * item.quantity).toLocaleString("ar-SY")} ل.س</span>
          </div>
        ))}
        <hr />
        <div className="flex justify-between text-sm text-gray-500"><span>المجموع الفرعي</span><span>{order.subtotal.toLocaleString("ar-SY")}</span></div>
        {order.discountTotal > 0 && <div className="flex justify-between text-sm text-green-600"><span>الخصم</span><span>-{order.discountTotal.toLocaleString("ar-SY")}</span></div>}
        <div className="flex justify-between text-sm text-gray-500"><span>الشحن</span><span>{order.shippingFee.toLocaleString("ar-SY")}</span></div>
        <div className="flex justify-between font-bold"><span>الإجمالي</span><span>{order.total.toLocaleString("ar-SY")} ل.س</span></div>
      </div>

      <div className="bg-white border rounded-xl p-4 text-sm">
        <h2 className="font-bold mb-2">عنوان الشحن</h2>
        <p>{order.address.governorate} - {order.address.city} {order.address.area ?? ""} {order.address.street ?? ""}</p>
        <p className="text-gray-500">{order.address.phone}</p>
      </div>
    </div>
  );
}
