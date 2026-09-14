import { useEffect, useState } from "react";
import { api } from "../services/api";
import ProductCard from "../components/ProductCard";

type FavoriteItem = { id: string; product: { id: string; name: string; slug: string; price: number; oldPrice: number | null; images: { url: string }[] } };

export default function Favorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    api.get("/favorites").then((r) => setFavorites(r.data.data));
  }, []);

  if (favorites.length === 0) return <p className="text-gray-500">لا توجد منتجات في المفضلة</p>;

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">المفضلة</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {favorites.map((f) => <ProductCard key={f.id} product={f.product} />)}
      </div>
    </div>
  );
}
