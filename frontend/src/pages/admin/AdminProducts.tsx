import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import { getApiErrorMessage } from "../../services/api";

type Category = { id: string; nameAr: string };
type Variant = { id?: string; sku?: string; color?: string | null; size?: string | null; price: number; stock: number };
type Product = { 
  id: string; 
  name: string; 
  slug: string; 
  description?: string;
  price: number; 
  oldPrice?: number | null;
  status: string; 
  images?: { url: string }[];
  variants: Variant[];
  category?: Category;
};

const emptyForm = {
  name: "", slug: "", description: "", price: "", oldPrice: "", categoryId: "",
  variantSku: "", variantColor: "", variantSize: "", variantStock: "",
};

const BACKEND_URL = "http://localhost:5000";

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for View & Edit Modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", price: "", oldPrice: "", description: "" });
  const [isUpdating, setIsUpdating] = useState(false);

  function getAuthHeader() {
    const token = localStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function load() {
    adminApi.get("/products", { 
      params: { pageSize: 100 },
      headers: getAuthHeader(),
    }).then((r) => setProducts(r.data.data));
  }

  useEffect(() => {
    load();
    adminApi.get("/categories", { headers: getAuthHeader() }).then((r) => setCategories(r.data.data));
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
      const token = localStorage.getItem("adminToken");
      let uploadedImages: { url: string }[] = [];

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadRes = await adminApi.post("/uploads/image", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        });

        const imageUrl = uploadRes.data?.data?.url || uploadRes.data?.url || uploadRes.data?.imageUrl;
        if (imageUrl) {
          uploadedImages.push({ url: imageUrl });
        }
      }

      await adminApi.post(
        "/products",
        {
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
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
    await adminApi.post(
      `/products/${p.id}/status`,
      { status: next },
      { headers: getAuthHeader() }
    );
    load();
  }

  function openEditModal(p: Product) {
    setSelectedProduct(p);
    setEditForm({
      name: p.name,
      price: String(p.price),
      oldPrice: p.oldPrice ? String(p.oldPrice) : "",
      description: p.description || "",
    });
    setIsEditModalOpen(true);
  }

  function openViewModal(p: Product) {
    setSelectedProduct(p);
    setIsViewModalOpen(true);
  }

  async function handleUpdateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;
    setIsUpdating(true);
    setError(null);

    try {
      await adminApi.patch(
        `/products/${selectedProduct.id}`,
        {
          name: editForm.name,
          price: Number(editForm.price),
          oldPrice: editForm.oldPrice ? Number(editForm.oldPrice) : null,
          description: editForm.description || undefined,
        },
        { headers: getAuthHeader() }
      );

      setIsEditModalOpen(false);
      setSelectedProduct(null);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsUpdating(false);
    }
  }

  function getImageUrl(url?: string) {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">المنتجات</h1>
        <button onClick={() => setShowForm((s) => !s)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-bold transition">
          {showForm ? "إلغاء" : "+ منتج جديد"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border rounded-xl p-4 mb-6 grid grid-cols-2 gap-3 shadow-sm">
          <input placeholder="اسم المنتج" className="border rounded-lg p-2 text-sm col-span-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="slug (a-z0-9-)" className="border rounded-lg p-2 text-sm" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
          <select className="border rounded-lg p-2 text-sm" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
            <option value="">اختر القسم</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
          </select>
          <input type="number" placeholder="السعر" className="border rounded-lg p-2 text-sm" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <input type="number" placeholder="السعر القديم (اختياري)" className="border rounded-lg p-2 text-sm" value={form.oldPrice} onChange={(e) => setForm({ ...form, oldPrice: e.target.value })} />
          <textarea placeholder="الوصف" className="border rounded-lg p-2 text-sm col-span-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          
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
          <button disabled={isUploading} className="col-span-2 bg-gray-900 hover:bg-black text-white rounded-lg py-2 text-sm font-bold disabled:opacity-50 transition">
            {isUploading ? "جاري الرفع والحفظ..." : "حفظ المنتج"}
          </button>
        </form>
      )}

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-right p-3">الصورة</th>
              <th className="text-right p-3">الاسم</th>
              <th className="text-right p-3">السعر</th>
              <th className="text-right p-3">المخزون</th>
              <th className="text-right p-3">الحالة</th>
              <th className="text-center p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50 transition">
                <td className="p-3">
                  {p.images && p.images[0]?.url ? (
                    <img 
                      src={getImageUrl(p.images[0].url)} 
                      alt={p.name} 
                      className="w-10 h-10 object-cover rounded border" 
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center text-[10px] text-gray-400">لا صورة</div>
                  )}
                </td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">{Number(p.price).toLocaleString("ar-SY")} ل.س</td>
                <td className="p-3">{p.variants.reduce((s, v) => s + v.stock, 0)}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{p.status}</span>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={() => openViewModal(p)} 
                      className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition"
                    >
                      تفاصيل
                    </button>
                    <button 
                      onClick={() => openEditModal(p)} 
                      className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition"
                    >
                      تعديل
                    </button>
                    <button 
                      onClick={() => toggleStatus(p)} 
                      className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                        p.status === "ACTIVE" 
                          ? "text-red-700 bg-red-50 border-red-200 hover:bg-red-100" 
                          : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      {p.status === "ACTIVE" ? "تعطيل" : "تفعيل"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Details Modal */}
      {isViewModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">تفاصيل المنتج</h2>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <div className="flex gap-4">
              {selectedProduct.images && selectedProduct.images[0]?.url ? (
                <img src={getImageUrl(selectedProduct.images[0].url)} alt={selectedProduct.name} className="w-24 h-24 object-cover rounded-xl border" />
              ) : (
                <div className="w-24 h-24 bg-gray-100 rounded-xl border flex items-center justify-center text-xs text-gray-400">لا صورة</div>
              )}
              <div className="space-y-1">
                <h3 className="font-bold text-gray-800 text-base">{selectedProduct.name}</h3>
                <p className="text-xs text-gray-400">الرابط التعريفي: {selectedProduct.slug}</p>
                <div className="text-sm font-semibold text-emerald-600">{Number(selectedProduct.price).toLocaleString("ar-SY")} ل.س</div>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${selectedProduct.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{selectedProduct.status}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-600 mb-1">الوصف:</h4>
              <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border leading-relaxed">{selectedProduct.description || "لا يوجد وصف محدد للمنتج."}</p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-600 mb-1">المتغيرات والمخزون:</h4>
              <div className="border rounded-lg overflow-hidden max-h-32 overflow-y-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="p-2">الرمز (SKU)</th>
                      <th className="p-2">اللون</th>
                      <th className="p-2">المقاس</th>
                      <th className="p-2">المخزون</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProduct.variants.map((v, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{v.sku || "-"}</td>
                        <td className="p-2">{v.color || "-"}</td>
                        <td className="p-2">{v.size || "-"}</td>
                        <td className="p-2 font-semibold">{v.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button onClick={() => setIsViewModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-1.5 rounded-lg text-xs font-bold transition">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">تعديل المنتج</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">اسم المنتج</label>
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                  className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">السعر الحالي (ل.س)</label>
                  <input 
                    type="number" 
                    value={editForm.price} 
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} 
                    className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">السعر القديم (اختياري)</label>
                  <input 
                    type="number" 
                    value={editForm.oldPrice} 
                    onChange={(e) => setEditForm({ ...editForm, oldPrice: e.target.value })} 
                    className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">الوصف</label>
                <textarea 
                  rows={3}
                  value={editForm.description} 
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} 
                  className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none" 
                />
              </div>

              {error && <p className="text-red-600 text-xs">{error}</p>}

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)} 
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold transition"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  disabled={isUpdating} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-xs font-bold disabled:opacity-50 transition"
                >
                  {isUpdating ? "جاري التحديث..." : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}