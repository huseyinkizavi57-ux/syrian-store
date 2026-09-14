// Abstraction boundary the spec explicitly asked for:
//
//   PaymentService
//     -> ShamCashPaymentService (implements this interface)
//       -> Sham Cash API
//
// Swapping in the real Sham Cash integration later means implementing this
// interface with real HTTP calls — nothing above this layer (orders,
// payments.service, routes) needs to change.
export interface InitiatePaymentInput {
  orderId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}

export interface InitiatePaymentResult {
  providerReference: string;
  redirectUrl?: string; // if the provider requires redirecting the user to complete payment
  raw: unknown;
}

export interface VerifyPaymentInput {
  providerReference: string;
}

export interface VerifyPaymentResult {
  status: "PAID" | "PENDING" | "FAILED";
  amount: number;
  raw: unknown;
}

export interface PaymentProviderAdapter {
  readonly name: "SHAM_CASH" | "MOCK";
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  verify(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
}
