import cron from "node-cron";
import { expireStalePendingOrders } from "../modules/orders/orders.service";

// Runs every minute. Cancels PENDING_PAYMENT orders past their expiresAt and
// restores their reserved stock — this is what stops an abandoned checkout
// from holding inventory hostage forever (see schema.prisma decision #3,
// raised during spec review as a missing piece).
export function startOrderExpiryJob() {
  cron.schedule("* * * * *", async () => {
    try {
      const count = await expireStalePendingOrders();
      if (count > 0) console.log(`[expireOrders] cancelled ${count} stale pending order(s)`);
    } catch (err) {
      console.error("[expireOrders] job failed:", err);
    }
  });
}
