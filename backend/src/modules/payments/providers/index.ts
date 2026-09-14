import { env } from "../../../config/env";
import { PaymentProviderAdapter } from "./PaymentProvider.interface";
import { MockPaymentProvider } from "./MockPaymentProvider";
import { ShamCashPaymentProvider } from "./ShamCashPaymentProvider";

// Selection logic: real Sham Cash credentials configured -> use the real
// (currently stubbed/unimplemented) provider; otherwise fall back to MOCK
// so local development and demos always work. Production deployments
// without real credentials will get a clear error at payment-initiation
// time rather than silently pretending to charge the customer — see
// ShamCashPaymentProvider.
export function getPaymentProvider(): PaymentProviderAdapter {
  if (env.shamCash.isConfigured()) return ShamCashPaymentProvider;
  if (env.nodeEnv === "production") {
    // Never silently fall back to MOCK in production.
    return ShamCashPaymentProvider;
  }
  return MockPaymentProvider;
}
