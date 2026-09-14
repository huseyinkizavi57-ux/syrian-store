import { Link } from "react-router-dom";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number | null;
  images: { url: string }[];
};

export default function ProductCard({ product }: { product: ProductCardData }) {
  const hasDiscount = product.oldPrice && Number(product.oldPrice) > Number(product.price);
  return (
    <Link to={`/products/${product.slug}`} className="group bg-white rounded-xl border overflow-hidden hover:shadow-md transition">
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {product.images[0] ? (
          <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">لا توجد صورة</div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-bold text-brand">{Number(product.price).toLocaleString("ar-SY")} ل.س</span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">{Number(product.oldPrice).toLocaleString("ar-SY")} ل.س</span>
          )}
        </div>
      </div>
    </Link>
  );
}
