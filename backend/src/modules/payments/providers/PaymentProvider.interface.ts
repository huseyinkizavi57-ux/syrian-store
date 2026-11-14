export interface InitiatePaymentInput {
  orderId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}

export interface InitiatePaymentResult {
  providerReference: string;
  redirectUrl?: string;
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

export type SupportedPaymentProvider = "SHAM_CASH" | "CASH_ON_DELIVERY" | "MOCK";

export interface PaymentProviderAdapter {
  readonly name: SupportedPaymentProvider;
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  verify(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
}