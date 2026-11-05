const encoder = new TextEncoder();

export function canonicalSentinelPayload({ sentinelId, observedAt, probe }) {
  return JSON.stringify({ sentinelId, observedAt, probe });
}

export function decodeBase64Url(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/") + padding, "base64");
}

/**
 * Fingerprints accepted Sentinel facts and the exact signature envelope.
 * The facts digest is the idempotency key: P-256 can produce multiple valid
 * signatures for the same payload, but that payload is still one observation.
 */
export async function sentinelObservationDigests(envelope) {
  if (!envelope?.sentinelId || !envelope?.observedAt || !envelope?.probe || typeof envelope?.signature !== "string") {
    throw new Error("invalid_sentinel_envelope_for_digest");
  }
  const canonicalPayload = canonicalSentinelPayload(envelope);
  const canonicalSignature = decodeBase64Url(envelope.signature).toString("base64url");
  const observationBytes = await crypto.subtle.digest("SHA-256", encoder.encode(canonicalPayload));
  const attestationBytes = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${canonicalPayload}\n${canonicalSignature}`),
  );
  return {
    observationDigest: Buffer.from(observationBytes).toString("hex"),
    attestationDigest: Buffer.from(attestationBytes).toString("hex"),
  };
}

export async function verifySentinelAttestation(envelope, publicKeyJwk) {
  if (!envelope?.sentinelId || !envelope?.observedAt || !envelope?.probe || !envelope?.signature) {
    return false;
  }
  const key = await crypto.subtle.importKey(
    "jwk",
    publicKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    decodeBase64Url(envelope.signature),
    encoder.encode(canonicalSentinelPayload(envelope)),
  );
}
