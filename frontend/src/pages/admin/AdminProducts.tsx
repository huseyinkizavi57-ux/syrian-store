import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import { getApiErrorMessage } from "../../services/api";

type Category = { id: string; nameAr: string };
type Product = { 
  id: string; 
  name: string; 
  slug: string; 
  price: number; 
  status: string; 
  images?: { url: string }[];
  variants: { stock: number }[];
};

const emptyForm = {
  name: "", slug: "", description: "", price: "", oldPrice: "", categoryId: "",
  variantSku: "", variantColor: "", variantSize: "", variantStock: "",
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    adminApi.get("/products", { params: { pageSize: 100 } }).then((r) => setProducts(r.data.data));
  }

  useEffect(() => {
    load();
    adminApi.get("/categories").then((r) => setCategories(r.data.data));
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsUploading(true);

    try {
      let uploadedImages: { url: string }[] = [];

      // رفع الصورة إن وجدت
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await adminApi.post("/uploads/image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (uploadRes.data?.data?.url) {
          uploadedImages.push({ url: uploadRes.data.data.url });
        }
      }

      await adminApi.post("/products", {
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        price: Number(form.price),
        oldPrice: form.oldPrice ? Number(form.oldPrice) : undefined,
        categoryId: form.categoryId,
        status: "ACTIVE",
        images: uploadedImages.length > 0 ? uploadedImages : undefined,
        variants: [
          {
            sku: form.variantSku,
            color: form.variantColor || null,
            size: form.variantSize || null,
            price: Number(form.price),
            stock: Number(form.variantStock || 0),
          },
        ],
      });

      setForm(emptyForm);
      setImageFile(null);
      setImagePreview(null);
      setShowForm(false);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  async function toggleStatus(p: Product) {
    const next = p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await adminApi.post(`/products/${p.id}/status`, { status: next });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">المنتجات</h1>
        <button onClick={() => setShowForm((s) => !s)} className="bg-brand text-white rounded-lg px-4 py-2 text-sm font-bold">
          {showForm ? "إلغاء" : "+ منتج جديد"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border rounded-xl p-4 mb-6 grid grid-cols-2 gap-3">
          <input placeholder="اسم المنتج" className="border rounded-lg p-2 text-sm col-span-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="slug (a-z0-9-)" className="border rounded-lg p-2 text-sm" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
          <select className="border rounded-lg p-2 text-sm" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
            <option value="">اختر القسم</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
          </select>
          <input type="number" placeholder="السعر" className="border rounded-lg p-2 text-sm" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <input type="number" placeholder="السعر القديم (اختياري)" className="border rounded-lg p-2 text-sm" value={form.oldPrice} onChange={(e) => setForm({ ...form, oldPrice: e.target.value })} />
          <textarea placeholder="الوصف" className="border rounded-lg p-2 text-sm col-span-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          
          {/* حقل رفع الصورة مع المعاينة */}
          <div className="col-span-2 border border-dashed rounded-lg p-3 bg-gray-50 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-700">صورة المنتج:</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="text-xs" />
            </div>
            {imagePreview && (
              <img src={imagePreview} alt="معاينة" className="w-14 h-14 object-cover rounded border" />
            )}
          </div>

          <input placeholder="SKU" className="border rounded-lg p-2 text-sm" value={form.variantSku} onChange={(e) => setForm({ ...form, variantSku: e.target.value })} required />
          <input type="number" placeholder="المخزون" className="border rounded-lg p-2 text-sm" value={form.variantStock} onChange={(e) => setForm({ ...form, variantStock: e.target.value })} required />
          <input placeholder="اللون (اختياري)" className="border rounded-lg p-2 text-sm" value={form.variantColor} onChange={(e) => setForm({ ...form, variantColor: e.target.value })} />
          <input placeholder="المقاس (اختياري)" className="border rounded-lg p-2 text-sm" value={form.variantSize} onChange={(e) => setForm({ ...form, variantSize: e.target.value })} />
          
          {error && <p className="text-red-600 text-sm col-span-2">{error}</p>}
          <button disabled={isUploading} className="col-span-2 bg-gray-900 text-white rounded-lg py-2 text-sm font-bold disabled:opacity-50">
            {isUploading ? "جاري الرفع والحفظ..." : "حفظ المنتج"}
          </button>
        </form>
      )}

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-right p-3">الصورة</th>
              <th className="text-right p-3">الاسم</th>
              <th className="text-right p-3">السعر</th>
              <th className="text-right p-3">المخزون</th>
              <th className="text-right p-3">الحالة</th>
              <th className="text-right p-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">
                  {p.images && p.images[0]?.url ? (
                    <img src={p.images[0].url} alt={p.name} className="w-10 h-10 object-cover rounded border" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center text-[10px] text-gray-400">لا صورة</div>
                  )}
                </td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">{Number(p.price).toLocaleString("ar-SY")} ل.س</td>
                <td className="p-3">{p.variants.reduce((s, v) => s + v.stock, 0)}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${p.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{p.status}</span>
                </td>
                <td className="p-3">
                  <button onClick={() => toggleStatus(p)} className="text-brand text-xs font-bold">
                    {p.status === "ACTIVE" ? "تعطيل" : "تفعيل"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}