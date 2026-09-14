import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "4000", 10),
  databaseUrl: required("DATABASE_URL"),
  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    accessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
    refreshTtlDays: parseInt(process.env.JWT_REFRESH_TTL_DAYS ?? "30", 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  },
  uploads: {
    dir: process.env.UPLOAD_DIR ?? "uploads",
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB ?? "5", 10),
    // Toggle-ready for cloud storage later without touching callers —
    // see src/modules/uploads (storage adapter).
    driver: process.env.STORAGE_DRIVER ?? "local", // "local" | "cloud"
  },
  order: {
    pendingPaymentTtlMinutes: parseInt(process.env.ORDER_PENDING_TTL_MIN ?? "20", 10),
  },
  shamCash: {
    apiUrl: process.env.SHAM_CASH_API_URL ?? "",
    apiKey: process.env.SHAM_CASH_API_KEY ?? "",
    merchantId: process.env.SHAM_CASH_MERCHANT_ID ?? "",
    secret: process.env.SHAM_CASH_SECRET ?? "",
    // If credentials are absent, the payment module automatically falls
    // back to the MOCK provider so local development still works — see
    // src/modules/payments/providers/index.ts
    isConfigured(): boolean {
      return Boolean(
        process.env.SHAM_CASH_API_URL &&
          process.env.SHAM_CASH_API_KEY &&
          process.env.SHAM_CASH_MERCHANT_ID &&
          process.env.SHAM_CASH_SECRET
      );
    },
  },
};
