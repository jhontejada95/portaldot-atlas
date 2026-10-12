import { keccak256, toHex, verifyMessage } from "viem";

function decodeBase64Url(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + padding;
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function verifyEvidenceRecord(record) {
  const { probe, attestation, sentinelId, observedAt } = record?.payload ?? {};
  if (!probe || !attestation?.scheme) throw new Error("This record has no verifiable evidence payload.");

  if (attestation.scheme === "eip191-keccak256-json-v1") {
    const digest = keccak256(toHex(JSON.stringify(probe)));
    if (digest !== attestation.digest) return { valid: false, scheme: attestation.scheme, reason: "The displayed probe does not match its signed digest." };
    const valid = await verifyMessage({
      address: attestation.signer,
      message: { raw: digest },
      signature: attestation.signature,
    });
    return { valid, scheme: attestation.scheme, reason: valid ? "The EIP-191 signature matches the displayed live probe." : "The EIP-191 signature did not match the displayed live probe." };
  }

  if (attestation.scheme === "webcrypto-p256-sha256-v1") {
    if (!sentinelId || !observedAt || !attestation.publicKeyJwk || !attestation.signature) {
      throw new Error("The Sentinel receipt is incomplete.");
    }
    const key = await crypto.subtle.importKey("jwk", attestation.publicKeyJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const message = new TextEncoder().encode(JSON.stringify({ sentinelId, observedAt, probe }));
    const valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, decodeBase64Url(attestation.signature), message);
    return { valid, scheme: attestation.scheme, reason: valid ? "The device-local P-256 signature matches the displayed Sentinel receipt." : "The device-local P-256 signature did not match the displayed Sentinel receipt." };
  }

  throw new Error(`Atlas does not recognize this signature scheme: ${attestation.scheme}`);
}
