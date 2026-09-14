import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Header() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const itemCount = cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;

  return (
    <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="text-xl font-black text-brand">متجرنا</Link>

        <form action="/search" className="flex-1 hidden md:block">
          <input
            type="search"
            placeholder="ابحث عن منتج..."
            className="w-full rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </form>

        <nav className="flex items-center gap-3 text-sm">
          <Link to="/favorites" className="hover:text-brand">المفضلة</Link>
          <Link to="/cart" className="relative hover:text-brand">
            السلة
            {itemCount > 0 && (
              <span className="absolute -top-2 -left-3 bg-brand text-white rounded-full text-[10px] px-1.5 py-0.5">
                {itemCount}
              </span>
            )}
          </Link>
          {user ? (
            <>
              <Link to="/account/orders" className="hover:text-brand">طلباتي</Link>
              <button onClick={logout} className="hover:text-brand">خروج</button>
            </>
          ) : (
            <Link to="/login" className="hover:text-brand">تسجيل الدخول</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
