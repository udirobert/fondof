/**
 * Stripe webhook authentication for Cloudflare Workers (no Stripe SDK).
 *
 * Stripe signs `{timestamp}.{rawBody}` with HMAC-SHA256 using the endpoint
 * signing secret. We must verify that MAC against the *raw* body before
 * applying any plan change — otherwise anyone can POST a fake
 * `checkout.session.completed` and mark an account Pro.
 *
 * @see https://docs.stripe.com/webhooks/signatures
 */

const DEFAULT_TOLERANCE_SECONDS = 300;

export type StripeWebhookVerifyError =
  | "bad_header"
  | "bad_timestamp"
  | "bad_signature";

export type StripeWebhookVerifyResult =
  | { ok: true }
  | { ok: false; error: StripeWebhookVerifyError };

export interface StripeWebhookObject {
  id?: string;
  client_reference_id?: string;
  customer?: string | { id?: string };
  subscription?: string | { id?: string };
  metadata?: { github_id?: string };
  payment_status?: string;
  status?: string;
}

export interface StripeWebhookEvent {
  id?: string;
  type: string;
  data: { object: StripeWebhookObject };
}

export type PlanChange = { userId: string; plan: "pro" | "free" };

export function parseStripeSignatureHeader(
  header: string,
): { timestamp: number; signatures: string[] } | null {
  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const item of header.split(",")) {
    const eq = item.indexOf("=");
    if (eq <= 0) continue;
    const key = item.slice(0, eq).trim();
    const value = item.slice(eq + 1).trim();
    if (!value) continue;
    if (key === "t") {
      const n = Number(value);
      if (Number.isFinite(n)) timestamp = n;
    } else if (key === "v1") {
      signatures.push(value);
    }
  }

  if (timestamp === null || signatures.length === 0) return null;
  return { timestamp, signatures };
}

export async function computeStripeSignature(
  secret: string,
  timestamp: number,
  payload: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${payload}`),
  );
  return [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

export async function verifyStripeWebhook(
  payload: string,
  header: string | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
): Promise<StripeWebhookVerifyResult> {
  if (!header) return { ok: false, error: "bad_header" };
  const parsed = parseStripeSignatureHeader(header);
  if (!parsed) return { ok: false, error: "bad_header" };

  if (Math.abs(nowSeconds - parsed.timestamp) > toleranceSeconds) {
    return { ok: false, error: "bad_timestamp" };
  }

  const expected = hexToBytes(
    await computeStripeSignature(secret, parsed.timestamp, payload),
  );
  if (!expected) return { ok: false, error: "bad_signature" };

  for (const candidate of parsed.signatures) {
    const actual = hexToBytes(candidate);
    if (actual && timingSafeEqual(expected, actual)) {
      return { ok: true };
    }
  }

  return { ok: false, error: "bad_signature" };
}

function eventUserId(obj: StripeWebhookObject): string | null {
  const id = obj.client_reference_id || obj.metadata?.github_id;
  return id || null;
}

function asId(value: string | { id?: string } | undefined): string | null {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && value.id) return value.id;
  return null;
}

export function stripeCustomerId(obj: StripeWebhookObject): string | null {
  return asId(obj.customer);
}

/** Subscription id from a Checkout Session or a subscription lifecycle object. */
export function stripeSubscriptionId(event: StripeWebhookEvent): string | null {
  const obj = event.data.object;
  const nested = asId(obj.subscription);
  if (nested) return nested;
  if (event.type.startsWith("customer.subscription.") && obj.id) return obj.id;
  return null;
}

export function stripeEventId(event: StripeWebhookEvent): string | null {
  return event.id?.trim() || null;
}

/**
 * Map a verified Stripe event to a plan mutation.
 * Unsigned or unpaid checkouts must not grant Pro.
 * `mappedUserId` is used when subscription lifecycle events omit session metadata.
 */
export function planChangeFromStripeEvent(
  event: StripeWebhookEvent,
  mappedUserId?: string | null,
): PlanChange | null {
  const userId = eventUserId(event.data.object) || mappedUserId || null;
  if (!userId) return null;

  const paymentStatus = event.data.object.payment_status;

  if (event.type === "checkout.session.completed") {
    // Delayed methods (ACH, etc.) complete checkout before money clears.
    if (paymentStatus === "paid" || paymentStatus === "no_payment_required") {
      return { userId, plan: "pro" };
    }
    return null;
  }

  if (event.type === "checkout.session.async_payment_succeeded") {
    return { userId, plan: "pro" };
  }

  if (
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.paused"
  ) {
    return { userId, plan: "free" };
  }

  return null;
}
