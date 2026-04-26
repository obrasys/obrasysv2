// Shared helpers for safely reading Stripe fields that may be missing or
// typed loosely depending on the Stripe SDK version. All helpers return
// safe fallbacks instead of throwing.

/**
 * Safely extract `current_period_end` from a Stripe Subscription object.
 * Stripe returns this as a UNIX timestamp (seconds). Returns null if missing.
 */
export function getSubscriptionPeriodEnd(subscription: any): Date | null {
  try {
    const ts =
      subscription?.current_period_end ??
      subscription?.items?.data?.[0]?.current_period_end ??
      null;
    if (typeof ts !== "number" || !isFinite(ts) || ts <= 0) return null;
    return new Date(ts * 1000);
  } catch {
    return null;
  }
}

/** ISO string version of `getSubscriptionPeriodEnd`, or null. */
export function getSubscriptionPeriodEndISO(subscription: any): string | null {
  const d = getSubscriptionPeriodEnd(subscription);
  return d ? d.toISOString() : null;
}

/** Safely read the first product id from a subscription's line items. */
export function getSubscriptionProductId(subscription: any): string | null {
  try {
    const product = subscription?.items?.data?.[0]?.price?.product;
    if (typeof product === "string") return product;
    if (product && typeof product === "object" && typeof product.id === "string") {
      return product.id;
    }
    return null;
  } catch {
    return null;
  }
}

/** Safely read the first price id from a subscription's line items. */
export function getSubscriptionPriceId(subscription: any): string | null {
  try {
    const price = subscription?.items?.data?.[0]?.price;
    if (typeof price?.id === "string") return price.id;
    return null;
  } catch {
    return null;
  }
}

/** Convert a UNIX timestamp (seconds) to an ISO string with fallback. */
export function unixToISO(ts: unknown): string | null {
  if (typeof ts !== "number" || !isFinite(ts) || ts <= 0) return null;
  try {
    return new Date(ts * 1000).toISOString();
  } catch {
    return null;
  }
}
