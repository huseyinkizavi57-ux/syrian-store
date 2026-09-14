import crypto from "crypto";

// Server-generated idempotency key for a payment attempt. Never accept an
// idempotency key supplied by the client — that would let a client force
// collisions or bypass the uniqueness guarantee.
export function generateIdempotencyKey(orderId: string, attemptSeed: string): string {
  return crypto.createHash("sha256").update(`${orderId}:${attemptSeed}:${crypto.randomUUID()}`).digest("hex");
}
