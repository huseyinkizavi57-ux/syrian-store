import { env } from "../../../config/env";
import { PaymentProviderAdapter } from "./PaymentProvider.interface";
import { MockPaymentProvider } from "./MockPaymentProvider";
import { ShamCashPaymentProvider } from "./ShamCashPaymentProvider";
import { CashOnDeliveryPaymentProvider } from "./CashOnDeliveryPaymentProvider";

export type RequestedPaymentMethod = "SHAM_CASH" | "CASH_ON_DELIVERY";

export function getPaymentProvider(
  method: RequestedPaymentMethod = "SHAM_CASH"
): PaymentProviderAdapter {
  if (method === "CASH_ON_DELIVERY") {
    return CashOnDeliveryPaymentProvider;
  }

  if (env.shamCash.isConfigured()) return ShamCashPaymentProvider;
  if (env.nodeEnv === "production") {
    return ShamCashPaymentProvider;
  }
  return MockPaymentProvider;
}