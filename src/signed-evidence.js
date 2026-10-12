import { keccak256, toHex, verifyMessage } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function signProbeEvidence(probe, privateKey) {
  if (!privateKey) {
    throw new Error("ATLAS_SENTINEL_PRIVATE_KEY is required to attest live probe evidence.");
  }
  const account = privateKeyToAccount(privateKey);
  const canonicalProbe = JSON.stringify(probe);
  const digest = keccak256(toHex(canonicalProbe));
  const signature = await account.signMessage({ message: { raw: digest } });
  return {
    scheme: "eip191-keccak256-json-v1",
    signer: account.address,
    digest,
    signature,
  };
}

export async function verifyProbeEvidence(probe, attestation) {
  const digest = keccak256(toHex(JSON.stringify(probe)));
  if (digest !== attestation.digest) return false;
  return verifyMessage({
    address: attestation.signer,
    message: { raw: digest },
    signature: attestation.signature,
  });
}
