/** Creates a reasonably unique opaque identifier for local-only client flows. */
export function createOpaqueId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/** Creates the idempotency key used for completion submission requests. */
export function createRequestId() {
  return createOpaqueId("req");
}
