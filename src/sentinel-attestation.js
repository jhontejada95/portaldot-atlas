const encoder = new TextEncoder();

export function canonicalSentinelPayload({ sentinelId, observedAt, probe }) {
  return JSON.stringify({ sentinelId, observedAt, probe });
}

export function decodeBase64Url(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/") + padding, "base64");
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
