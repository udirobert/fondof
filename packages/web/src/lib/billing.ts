/**
 * Billing client — check forge limits, record shares, and initiate Stripe checkout.
 */

import { API_BASE, apiFetch } from "@/lib/api-base";

const API_URL = API_BASE;

export interface ForgeCheck {
  allowed: boolean;
  remaining: number | null;
  limit: number | null;
  plan: "free" | "pro" | "sharer" | "anonymous";
}

/** Check if the current user can forge (respects free tier limits). */
export async function checkForge(): Promise<ForgeCheck> {
  try {
    const res = await apiFetch(`${API_URL}/api/billing/check-forge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return { allowed: true, remaining: 3, limit: 3, plan: "anonymous" };
    return (await res.json()) as ForgeCheck;
  } catch {
    // UI hint only — /forge and /compose enforce quota server-side.
    return { allowed: true, remaining: 3, limit: 3, plan: "anonymous" };
  }
}

/** Initiate Stripe Checkout for Pro upgrade. Returns checkout URL or null. */
export async function getCheckoutUrl(): Promise<string | null> {
  try {
    const res = await apiFetch(`${API_URL}/api/billing/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string };
    return data.url || null;
  } catch {
    return null;
  }
}

/** Record that the user shared a skill publicly. Unlocks unlimited forges. */
export async function recordShare(
  skillHash: string,
  platform: "twitter" | "linkedin" | "github",
): Promise<boolean> {
  try {
    const res = await apiFetch(`${API_URL}/api/billing/record-share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillHash, platform }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
