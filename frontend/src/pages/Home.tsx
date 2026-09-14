import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import ProductCard, { ProductCardData } from "../components/ProductCard";

type Category = { id: string; name: string; nameAr: string; slug: string; imageUrl: string | null };

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductCardData[]>([]);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data.data));
    api.get("/products", { params: { sort: "newest", pageSize: 12 } }).then((r) => setProducts(r.data.data));
  }, []);

  return (
    <div className="space-y-10">
      {/* Spec section 4: first-screen section picker */}
      <section>
        <h2 className="text-lg font-bold mb-3">تسوق حسب الأقسام</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/categories/${c.slug}`}
              className="bg-white rounded-xl border p-3 text-center hover:border-brand hover:shadow-sm transition"
            >
              <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-2xl">🛍️</div>
              <span className="text-xs font-medium">{c.nameAr}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">أحدث المنتجات</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
