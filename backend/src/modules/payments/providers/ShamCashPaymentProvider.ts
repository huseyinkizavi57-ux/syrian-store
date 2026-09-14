import { PaymentProviderAdapter, InitiatePaymentInput, InitiatePaymentResult, VerifyPaymentInput, VerifyPaymentResult } from "./PaymentProvider.interface";
import { env } from "../../../config/env";
import { ApiError } from "../../../utils/ApiError";

// ============================================================================
// REAL Sham Cash integration — INTENTIONALLY NOT IMPLEMENTED.
//
// Per the spec's explicit instruction: "لا تخترع endpoints / API keys /
// Webhooks / authentication scheme" — no official Sham Cash API
// documentation or credentials were provided, so no HTTP calls, endpoint
// paths, request/response shapes, or auth headers are invented here.
//
// This class exists only to define WHERE that integration plugs in. Once
// real docs/credentials are available, implement `initiate` and `verify`
// below using the real API, and the rest of the app (orders, payments
// service, routes, webhook handler) requires no changes — see
// providers/index.ts for how this gets selected.
//
// See README.md -> "ما الذي يحتاج Sham Cash credentials" for the exact list
// of information needed to complete this file.
// ============================================================================
export const ShamCashPaymentProvider: PaymentProviderAdapter = {
  name: "SHAM_CASH",

  async initiate(_input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    throw ApiError.internal(
      "تكامل Sham Cash غير مفعّل بعد — بيانات الاعتماد أو التوثيق الرسمي غير متوفرة"
    );
  },

  async verify(_input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    throw ApiError.internal(
      "تكامل Sham Cash غير مفعّل بعد — بيانات الاعتماد أو التوثيق الرسمي غير متوفرة"
    );
  },
};

// Referenced so `env` stays imported even before real HTTP calls exist —
// remove this line once the real fetch calls above use env.shamCash.*.
void env.shamCash.apiUrl;
