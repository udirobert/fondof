import { describe, expect, it } from "vitest";
import {
  computeStripeSignature,
  parseStripeSignatureHeader,
  planChangeFromStripeEvent,
  verifyStripeWebhook,
} from "./stripe-webhook.js";

const SECRET = "whsec_test_secret";

async function signedHeader(
  payload: string,
  timestamp = Math.floor(Date.now() / 1000),
): Promise<{ header: string; timestamp: number }> {
  const v1 = await computeStripeSignature(SECRET, timestamp, payload);
  return { header: `t=${timestamp},v1=${v1}`, timestamp };
}

describe("parseStripeSignatureHeader", () => {
  it("reads timestamp and v1 signatures, including rotated keys", () => {
    const parsed = parseStripeSignatureHeader(
      "t=1492774577,v1=abc,v0=ignored,v1=def",
    );
    expect(parsed).toEqual({
      timestamp: 1492774577,
      signatures: ["abc", "def"],
    });
  });

  it("rejects a header with no v1 signature", () => {
    expect(parseStripeSignatureHeader("t=1492774577,v0=abc")).toBeNull();
  });
});

describe("verifyStripeWebhook", () => {
  it("accepts a matching HMAC over the raw body", async () => {
    const payload = '{"type":"checkout.session.completed"}';
    const { header } = await signedHeader(payload);
    expect(await verifyStripeWebhook(payload, header, SECRET)).toEqual({
      ok: true,
    });
  });

  it("rejects a missing or malformed Stripe-Signature header", async () => {
    const payload = "{}";
    expect(await verifyStripeWebhook(payload, undefined, SECRET)).toEqual({
      ok: false,
      error: "bad_header",
    });
    expect(await verifyStripeWebhook(payload, "not-a-header", SECRET)).toEqual({
      ok: false,
      error: "bad_header",
    });
  });

  it("rejects a forged payload with a valid-looking header", async () => {
    const { header } = await signedHeader('{"honest":true}');
    const result = await verifyStripeWebhook(
      '{"type":"checkout.session.completed","data":{"object":{"client_reference_id":"1","payment_status":"paid"}}}',
      header,
      SECRET,
    );
    expect(result).toEqual({ ok: false, error: "bad_signature" });
  });

  it("rejects a replayed timestamp outside the tolerance window", async () => {
    const payload = "{}";
    const stale = Math.floor(Date.now() / 1000) - 301;
    const { header } = await signedHeader(payload, stale);
    expect(await verifyStripeWebhook(payload, header, SECRET)).toEqual({
      ok: false,
      error: "bad_timestamp",
    });
  });
});

describe("planChangeFromStripeEvent", () => {
  it("does not grant Pro for an unpaid completed checkout", () => {
    expect(
      planChangeFromStripeEvent({
        type: "checkout.session.completed",
        data: {
          object: {
            client_reference_id: "42",
            payment_status: "unpaid",
          },
        },
      }),
    ).toBeNull();
  });

  it("grants Pro only after Stripe reports the session paid", () => {
    expect(
      planChangeFromStripeEvent({
        type: "checkout.session.completed",
        data: {
          object: {
            client_reference_id: "42",
            payment_status: "paid",
          },
        },
      }),
    ).toEqual({ userId: "42", plan: "pro" });
  });

  it("grants Pro when a delayed payment later succeeds", () => {
    expect(
      planChangeFromStripeEvent({
        type: "checkout.session.async_payment_succeeded",
        data: {
          object: {
            metadata: { github_id: "99" },
            payment_status: "paid",
          },
        },
      }),
    ).toEqual({ userId: "99", plan: "pro" });
  });

  it("revokes Pro when the subscription is deleted", () => {
    expect(
      planChangeFromStripeEvent({
        type: "customer.subscription.deleted",
        data: { object: { metadata: { github_id: "42" } } },
      }),
    ).toEqual({ userId: "42", plan: "free" });
  });
});
