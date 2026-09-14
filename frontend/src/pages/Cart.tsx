import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const { cart, updateItem, removeItem } = useCart();
  const navigate = useNavigate();

  if (!cart || cart.items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">سلتك فارغة</p>
        <Link to="/" className="text-brand font-bold">تابع التسوق</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-3">
        {cart.items.map((item) => (
          <div key={item.id} className="bg-white border rounded-xl p-4 flex gap-4 items-center">
            <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              {item.product.image && <img src={item.product.image} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1">
              <Link to={`/products/${item.product.slug}`} className="font-medium hover:text-brand">{item.product.name}</Link>
              <p className="text-xs text-gray-500 mt-1">
                {[item.variant.color, item.variant.size].filter(Boolean).join(" / ")}
              </p>
              <p className="text-brand font-bold mt-1">{item.variant.price.toLocaleString("ar-SY")} ل.س</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={item.quantity}
                onChange={(e) => updateItem(item.id, Number(e.target.value))}
                className="border rounded-lg p-1.5 text-sm"
              >
                {Array.from({ length: Math.min(item.variant.stock, 10) || 1 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <button onClick={() => removeItem(item.id)} className="text-red-500 text-sm hover:underline">حذف</button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-xl p-4 h-fit space-y-3">
        <h3 className="font-bold">ملخص الطلب</h3>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">المجموع الفرعي</span>
          <span>{cart.subtotal.toLocaleString("ar-SY")} ل.س</span>
        </div>
        <p className="text-xs text-gray-400">رسوم الشحن والخصومات تُحسب في صفحة الدفع</p>
        <button
          onClick={() => navigate("/checkout")}
          className="w-full bg-brand text-white rounded-xl py-3 font-bold hover:bg-brand-dark"
        >
          إتمام الطلب
        </button>
      </div>
    </div>
  );
}
