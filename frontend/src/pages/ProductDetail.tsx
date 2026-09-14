import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, getApiErrorMessage } from "../services/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

type Variant = { id: string; color: string | null; size: string | null; price: number; stock: number };
type Review = { id: string; rating: number; comment: string | null; user: { firstName: string; lastName: string } };
type Product = {
  id: string; name: string; description: string | null; price: number; oldPrice: number | null;
  images: { url: string }[]; variants: Variant[]; reviews: Review[]; specifications: Record<string, unknown> | null;
};

export default function ProductDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.get(`/products/${slug}`).then((r) => {
      setProduct(r.data.data);
      setSelectedVariant(r.data.data.variants[0] ?? null);
    });
  }, [slug]);

  if (!product) return <p className="text-gray-500">جاري التحميل...</p>;

  const avgRating = product.reviews.length
    ? (product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length).toFixed(1)
    : null;

  const colors = Array.from(new Set(product.variants.map((v) => v.color).filter(Boolean)));
  const sizes = Array.from(new Set(product.variants.filter((v) => !colors.length || v.color === selectedVariant?.color).map((v) => v.size).filter(Boolean)));

  async function handleAdd() {
    if (!user) {
      setMessage({ type: "err", text: "الرجاء تسجيل الدخول أولاً لإضافة المنتج للسلة" });
      return;
    }
    if (!selectedVariant) return;
    if (selectedVariant.stock <= 0) {
      setMessage({ type: "err", text: "هذا الخيار غير متوفر حالياً" });
      return;
    }
    setAdding(true);
    try {
      await addItem(selectedVariant.id, 1);
      setMessage({ type: "ok", text: "تمت إضافة المنتج إلى السلة" });
    } catch (err) {
      setMessage({ type: "err", text: getApiErrorMessage(err) });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="aspect-square bg-white border rounded-xl overflow-hidden">
        {product.images[0] ? (
          <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">لا توجد صورة</div>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold">{product.name}</h1>
        {avgRating && (
          <div className="flex items-center gap-1 mt-1 text-sm text-amber-500">
            {"★".repeat(Math.round(Number(avgRating)))}
            <span className="text-gray-500">({avgRating} / {product.reviews.length} تقييم)</span>
          </div>
        )}

        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-2xl font-bold text-brand">{Number(selectedVariant?.price ?? product.price).toLocaleString("ar-SY")} ل.س</span>
          {product.oldPrice && Number(product.oldPrice) > Number(product.price) && (
            <span className="text-gray-400 line-through">{Number(product.oldPrice).toLocaleString("ar-SY")} ل.س</span>
          )}
        </div>

        {colors.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-bold mb-2">اللون</h3>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedVariant(product.variants.find((v) => v.color === c) ?? null)}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${selectedVariant?.color === c ? "border-brand bg-brand/10 text-brand" : ""}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {sizes.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-bold mb-2">المقاس</h3>
            <div className="flex gap-2 flex-wrap">
              {sizes.map((s) => {
                const variant = product.variants.find((v) => v.size === s && (!colors.length || v.color === selectedVariant?.color));
                return (
                  <button
                    key={s}
                    disabled={!variant || variant.stock <= 0}
                    onClick={() => variant && setSelectedVariant(variant)}
                    className={`px-3 py-1.5 rounded-lg border text-sm disabled:opacity-30 disabled:cursor-not-allowed ${selectedVariant?.size === s ? "border-brand bg-brand/10 text-brand" : ""}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className="mt-2 text-sm text-gray-500">
          {selectedVariant && selectedVariant.stock > 0 ? `متوفر (${selectedVariant.stock} قطعة)` : "غير متوفر حالياً"}
        </p>

        <button
          onClick={handleAdd}
          disabled={adding || !selectedVariant || selectedVariant.stock <= 0}
          className="mt-6 w-full bg-brand text-white rounded-xl py-3 font-bold hover:bg-brand-dark disabled:opacity-50"
        >
          {adding ? "جاري الإضافة..." : "أضف إلى السلة"}
        </button>

        {message && (
          <p className={`mt-3 text-sm ${message.type === "ok" ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
        )}

        {product.description && (
          <div className="mt-6">
            <h3 className="font-bold mb-1">الوصف</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line">{product.description}</p>
          </div>
        )}

        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="mt-6">
            <h3 className="font-bold mb-2">المواصفات</h3>
            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <tbody>
                {Object.entries(product.specifications).map(([k, v]) => (
                  <tr key={k} className="border-t first:border-t-0 odd:bg-gray-50">
                    <td className="p-2 font-medium text-gray-600">{k}</td>
                    <td className="p-2">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="md:col-span-2">
        <h3 className="font-bold mb-3">التقييمات</h3>
        {product.reviews.length === 0 ? (
          <p className="text-sm text-gray-500">لا توجد تقييمات بعد</p>
        ) : (
          <div className="space-y-3">
            {product.reviews.map((r) => (
              <div key={r.id} className="bg-white border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{r.user.firstName} {r.user.lastName}</span>
                  <span className="text-amber-500 text-sm">{"★".repeat(r.rating)}</span>
                </div>
                {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
