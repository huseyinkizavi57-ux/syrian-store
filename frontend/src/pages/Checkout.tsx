import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getApiErrorMessage } from "../services/api";
import { useCart } from "../context/CartContext";

type Address = {
  id: string;
  label: string | null;
  governorate: string;
  city: string;
  area: string | null;
  street: string | null;
  phone: string;
  isDefault: boolean;
};

type PaymentMethod = "CASH_ON_DELIVERY" | "SHAM_CASH";

const GOVERNORATES = [
  "دمشق",
  "ريف دمشق",
  "حلب",
  "حمص",
  "حماة",
  "اللاذقية",
  "طرطوس",
  "درعا",
  "السويداء",
  "القنيطرة",
  "إدلب",
  "الرقة",
  "دير الزور",
  "الحسكة",
];

export default function Checkout() {
  const { cart, refreshCart } = useCart();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    governorate: GOVERNORATES[0],
    city: "",
    area: "",
    street: "",
    phone: "",
  });
  const [couponCode, setCouponCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH_ON_DELIVERY");
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    api.get("/users/me/addresses").then((r) => {
      setAddresses(r.data.data);
      const def = r.data.data.find((a: Address) => a.isDefault) ?? r.data.data[0];
      if (def) setSelectedAddressId(def.id);
      else setShowNewAddress(true);
    });
  }, []);

  async function handleAddAddress() {
    setError(null);
    try {
      const res = await api.post("/users/me/addresses", {
        ...newAddress,
        isDefault: addresses.length === 0,
      });
      setAddresses((prev) => [res.data.data, ...prev]);
      setSelectedAddressId(res.data.data.id);
      setShowNewAddress(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handlePlaceOrder() {
    if (!selectedAddressId) {
      setError("الرجاء اختيار عنوان الشحن");
      return;
    }
    setPlacing(true);
    setError(null);
    try {
      const res = await api.post("/orders", {
        addressId: selectedAddressId,
        couponCode: couponCode || undefined,
      });
      const orderId = res.data.data.id;

      if (paymentMethod === "CASH_ON_DELIVERY") {
        await api.post("/payments/initiate", {
          orderId,
          provider: "CASH_ON_DELIVERY",
        });
      }

      await refreshCart();
      navigate(`/orders/${orderId}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setPlacing(false);
    }
  }

  if (!cart || cart.items.length === 0) return <p className="text-gray-500">سلتك فارغة</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">إتمام الطلب</h1>

      <section className="bg-white border rounded-xl p-4">
        <h2 className="font-bold mb-3">عنوان الشحن</h2>
        <div className="space-y-2">
          {addresses.map((a) => (
            <label
              key={a.id}
              className={`flex items-start gap-2 p-3 border rounded-lg cursor-pointer ${
                selectedAddressId === a.id ? "border-brand bg-brand/5" : ""
              }`}
            >
              <input
                type="radio"
                name="address"
                checked={selectedAddressId === a.id}
                onChange={() => setSelectedAddressId(a.id)}
                className="mt-1"
              />
              <div className="text-sm">
                <p className="font-medium">
                  {a.label ?? "عنوان"}{" "}
                  {a.isDefault && <span className="text-xs text-brand">(افتراضي)</span>}
                </p>
                <p className="text-gray-500">
                  {a.governorate} - {a.city} {a.area ? `- ${a.area}` : ""} {a.street ?? ""}
                </p>
                <p className="text-gray-500">{a.phone}</p>
              </div>
            </label>
          ))}
        </div>

        {!showNewAddress ? (
          <button
            onClick={() => setShowNewAddress(true)}
            className="mt-3 text-brand text-sm font-bold"
          >
            + إضافة عنوان جديد
          </button>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select
              className="border rounded-lg p-2 text-sm col-span-2"
              value={newAddress.governorate}
              onChange={(e) => setNewAddress({ ...newAddress, governorate: e.target.value })}
            >
              {GOVERNORATES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <input
              placeholder="المدينة"
              className="border rounded-lg p-2 text-sm"
              value={newAddress.city}
              onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
            />
            <input
              placeholder="المنطقة (اختياري)"
              className="border rounded-lg p-2 text-sm"
              value={newAddress.area}
              onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })}
            />
            <input
              placeholder="الشارع (اختياري)"
              className="border rounded-lg p-2 text-sm col-span-2"
              value={newAddress.street}
              onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
            />
            <input
              placeholder="رقم الهاتف (09XXXXXXXX)"
              className="border rounded-lg p-2 text-sm col-span-2"
              value={newAddress.phone}
              onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
            />
            <button
              onClick={handleAddAddress}
              className="col-span-2 bg-gray-900 text-white rounded-lg py-2 text-sm font-bold"
            >
              حفظ العنوان
            </button>
          </div>
        )}
      </section>

      <section className="bg-white border rounded-xl p-4">
        <h2 className="font-bold mb-3">كوبون الخصم (اختياري)</h2>
        <input
          placeholder="أدخل الكود"
          className="border rounded-lg p-2 text-sm w-full"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
        />
      </section>

      <section className="bg-white border rounded-xl p-4">
        <h2 className="font-bold mb-3">طريقة الدفع</h2>
        <div className="space-y-2">
          <label
            className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer ${
              paymentMethod === "CASH_ON_DELIVERY" ? "bg-brand/5 border-brand" : ""
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              checked={paymentMethod === "CASH_ON_DELIVERY"}
              onChange={() => setPaymentMethod("CASH_ON_DELIVERY")}
              className="mt-1"
            />
            <div>
              <span className="font-medium block">الدفع عند الاستلام (نقداً)</span>
              <span className="text-xs text-gray-500">
                ادفع قيمة الطلب نقداً لمندوب التوصيل عند استلام طلبك.
              </span>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer ${
              paymentMethod === "SHAM_CASH" ? "bg-brand/5 border-brand" : ""
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              checked={paymentMethod === "SHAM_CASH"}
              onChange={() => setPaymentMethod("SHAM_CASH")}
              className="mt-1"
            />
            <div>
              <span className="font-medium block">Sham Cash</span>
              <span className="text-xs text-gray-500">
                سيتم إنشاء الطلب أولاً، ثم توجيهك لإتمام الدفع عبر محفظة شام كاش.
              </span>
            </div>
          </label>
        </div>
      </section>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        onClick={handlePlaceOrder}
        disabled={placing}
        className="w-full bg-brand text-white rounded-xl py-3 font-bold hover:bg-brand-dark disabled:opacity-50"
      >
        {placing ? "جاري إنشاء الطلب..." : "تأكيد الطلب"}
      </button>
    </div>
  );
}