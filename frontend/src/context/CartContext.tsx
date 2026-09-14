import React, { createContext, useContext, useState, useCallback } from "react";
import { api } from "../services/api";

export type CartItem = {
  id: string;
  variantId: string;
  quantity: number;
  product: { id: string; name: string; slug: string; image: string | null };
  variant: { color: string | null; size: string | null; price: number; stock: number };
  lineTotal: number;
};
export type Cart = { id: string; items: CartItem[]; subtotal: number };

type CartContextValue = {
  cart: Cart | null;
  refreshCart: () => Promise<void>;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);

  const refreshCart = useCallback(async () => {
    try {
      const res = await api.get("/cart");
      setCart(res.data.data);
    } catch {
      // not logged in yet, or request failed — leave cart as-is
    }
  }, []);

  const addItem = useCallback(
    async (variantId: string, quantity = 1) => {
      const res = await api.post("/cart/items", { variantId, quantity });
      setCart(res.data.data);
    },
    []
  );

  const updateItem = useCallback(async (itemId: string, quantity: number) => {
    const res = await api.patch(`/cart/items/${itemId}`, { quantity });
    setCart(res.data.data);
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    const res = await api.delete(`/cart/items/${itemId}`);
    setCart(res.data.data);
  }, []);

  return (
    <CartContext.Provider value={{ cart, refreshCart, addItem, updateItem, removeItem }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
