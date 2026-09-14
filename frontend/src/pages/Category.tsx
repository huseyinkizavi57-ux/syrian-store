import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import ProductCard, { ProductCardData } from "../components/ProductCard";

type Brand = { id: string; name: string };

export default function Category() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  const sort = params.get("sort") ?? "newest";
  const brand = params.get("brand") ?? "";
  const minPrice = params.get("minPrice") ?? "";
  const maxPrice = params.get("maxPrice") ?? "";

  useEffect(() => {
    api.get("/categories").then((r) => {
      const cat = r.data.data.find((c: any) => c.slug === slug);
      setCategoryId(cat?.id ?? null);
    });
    api.get("/brands").then((r) => setBrands(r.data.data));
  }, [slug]);

  useEffect(() => {
    if (!categoryId) return;
    setLoading(true);
    api
      .get("/products", {
        params: {
          category: categoryId,
          sort,
          brand: brand || undefined,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
          pageSize: 40,
        },
      })
      .then((r) => setProducts(r.data.data))
      .finally(() => setLoading(false));
  }, [categoryId, sort, brand, minPrice, maxPrice]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
      <aside className="bg-white border rounded-xl p-4 h-fit space-y-4">
        <div>
          <h3 className="font-bold text-sm mb-2">الترتيب</h3>
          <select className="w-full border rounded-lg p-2 text-sm" value={sort} onChange={(e) => updateParam("sort", e.target.value)}>
            <option value="newest">الأحدث</option>
            <option value="price_asc">السعر: من الأقل للأعلى</option>
            <option value="price_desc">السعر: من الأعلى للأقل</option>
            <option value="best_selling">الأكثر مبيعاً</option>
            <option value="rating">الأعلى تقييماً</option>
          </select>
        </div>
        <div>
          <h3 className="font-bold text-sm mb-2">العلامة التجارية</h3>
          <select className="w-full border rounded-lg p-2 text-sm" value={brand} onChange={(e) => updateParam("brand", e.target.value)}>
            <option value="">الكل</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <h3 className="font-bold text-sm mb-2">السعر (ل.س)</h3>
          <div className="flex gap-2">
            <input type="number" placeholder="من" className="w-1/2 border rounded-lg p-2 text-sm" value={minPrice} onChange={(e) => updateParam("minPrice", e.target.value)} />
            <input type="number" placeholder="إلى" className="w-1/2 border rounded-lg p-2 text-sm" value={maxPrice} onChange={(e) => updateParam("maxPrice", e.target.value)} />
          </div>
        </div>
      </aside>

      <section>
        {loading ? (
          <p className="text-gray-500">جاري التحميل...</p>
        ) : products.length === 0 ? (
          <p className="text-gray-500">لا توجد منتجات مطابقة</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
