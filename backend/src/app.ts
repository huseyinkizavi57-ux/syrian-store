import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import path from "path";
import { env } from "./config/env";
import { generalLimiter } from "./middleware/rateLimit";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/users.routes";
import categoryRoutes from "./modules/categories/categories.routes";
import brandRoutes from "./modules/brands/brands.routes";
import productRoutes from "./modules/products/products.routes";
import cartRoutes from "./modules/cart/cart.routes";
import orderRoutes from "./modules/orders/orders.routes";
import paymentRoutes from "./modules/payments/payments.routes";
import reviewRoutes from "./modules/reviews/reviews.routes";
import favoriteRoutes from "./modules/favorites/favorites.routes";
import couponRoutes from "./modules/coupons/coupons.routes";
import adminRoutes from "./modules/admin/admin.routes";
import shippingRoutes from "./modules/shipping/shipping.routes";
import uploadRoutes from "./modules/uploads/uploads.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.cors.origin,
      credentials: true, // needed for the httpOnly refresh-token cookie
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
  app.use(generalLimiter);

  // Locally-stored uploaded images (only relevant when STORAGE_DRIVER=local).
  app.use("/uploads", express.static(path.resolve(process.cwd(), env.uploads.dir)));

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/brands", brandRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/favorites", favoriteRoutes);
  app.use("/api/coupons", couponRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/shipping-rates", shippingRoutes);
  app.use("/api/uploads", uploadRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
