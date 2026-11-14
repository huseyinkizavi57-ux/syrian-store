import crypto from "crypto";
import {
  PaymentProviderAdapter,
  InitiatePaymentInput,
  InitiatePaymentResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from "./PaymentProvider.interface";

export const CashOnDeliveryPaymentProvider: PaymentProviderAdapter = {
  name: "CASH_ON_DELIVERY",

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const providerReference = `COD-${crypto.randomUUID()}`;
    return {
      providerReference,
      raw: {
        method: "CASH_ON_DELIVERY",
        orderId: input.orderId,
        amount: input.amount,
        currency: input.currency,
      },
    };
  },

  async verify(_input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    // تبقى حالة الدفع PENDING حتى يقوم مندوب التوصيل بتحصيل المبلغ نقداً وتأكيده من الإدارة
    return {
      status: "PENDING",
      amount: 0,
      raw: { method: "CASH_ON_DELIVERY", awaitingDelivery: true },
    };
  },
};