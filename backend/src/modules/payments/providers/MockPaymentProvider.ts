import crypto from "crypto";
import { PaymentProviderAdapter, InitiatePaymentInput, InitiatePaymentResult, VerifyPaymentInput, VerifyPaymentResult } from "./PaymentProvider.interface";

// Development/testing provider ONLY. Simulates Sham Cash's role so the rest
// of the checkout flow (order -> payment -> webhook-style confirmation) is
// fully exercisable without real credentials. This is never selected in
// production (see providers/index.ts and env.shamCash.isConfigured()).
//
// In-memory store is fine here: it only needs to survive one process
// lifetime for local dev/testing, and resets are actually desirable between
// runs.
const mockLedger = new Map<string, { status: "PAID" | "PENDING" | "FAILED"; amount: number }>();

export const MockPaymentProvider: PaymentProviderAdapter = {
  name: "MOCK",

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const providerReference = `MOCK-${crypto.randomUUID()}`;
    // Auto-"succeeds" immediately to keep local dev frictionless. A
    // /api/payments/mock/fail test endpoint (see payments.routes.ts) lets
    // you exercise the failure path too.
    mockLedger.set(providerReference, { status: "PAID", amount: input.amount });
    return { providerReference, raw: { simulated: true, orderId: input.orderId } };
  },

  async verify(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const entry = mockLedger.get(input.providerReference);
    if (!entry) return { status: "FAILED", amount: 0, raw: { found: false } };
    return { status: entry.status, amount: entry.amount, raw: { simulated: true } };
  },
};

export function _mockMarkFailed(providerReference: string) {
  const entry = mockLedger.get(providerReference);
  if (entry) mockLedger.set(providerReference, { ...entry, status: "FAILED" });
}
