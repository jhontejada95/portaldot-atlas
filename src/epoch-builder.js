import { blake2AsU8a, decodeAddress } from "@polkadot/util-crypto";
import { u8aToHex } from "@polkadot/util";
import { evidenceRecordedBetween } from "./evidence-store.js";
import { assertUsableProbe } from "./portaldot-probe.js";
import { verifySentinelAttestation } from "./sentinel-attestation.js";

const textEncoder = new TextEncoder();
const ZERO_HASH = `0x${"00".repeat(32)}`;

/**
 * This policy is intentionally public and hashed into every epoch. Its values
 * bound credit issuance to useful, distinct observations rather than browser
 * activity or arbitrary backend scoring.
 */
export const ATLAS_EPOCH_POLICY_V1 = Object.freeze({
  schema: "atlas.epoch-policy.v1",
  version: 1,
  creditPerAcceptedObservation: "1",
  minimumObservationSpacingSeconds: 15 * 60,
  maxAcceptedObservationsPerWallet: 96,
  acceptedEvidenceKind: "client_sentinel_observation",
});

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortObject(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(sortObject(value));
}

function hashBytes(bytes) {
  return blake2AsU8a(bytes, 256);
}

function hashText(value) {
  return hashBytes(textEncoder.encode(value));
}

function bytesToHex(bytes) {
  return u8aToHex(bytes);
}

function compareBytes(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function normalizeHash(hash) {
  if (typeof hash !== "string" || !/^0x[0-9a-f]{64}$/i.test(hash)) throw new Error("invalid_hash");
  return Uint8Array.from(Buffer.from(hash.slice(2), "hex"));
}

function encodeU128(value) {
  const integer = BigInt(value);
  if (integer < 0n || integer >= (1n << 128n)) throw new Error("invalid_u128");
  const encoded = new Uint8Array(16);
  let remaining = integer;
  for (let index = 0; index < encoded.length; index += 1) {
    encoded[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return encoded;
}

/** Matches AtlasEpochCredits::leaf: Blake2x256(SCALE(account, amount, hash)). */
export function claimLeaf(wallet, amount, contributionCommitment) {
  const account = decodeAddress(wallet);
  if (account.length !== 32) throw new Error("unsupported_account_length");
  const commitment = normalizeHash(contributionCommitment);
  const encoded = new Uint8Array(32 + 16 + 32);
  encoded.set(account, 0);
  encoded.set(encodeU128(amount), 32);
  encoded.set(commitment, 48);
  return hashBytes(encoded);
}

/** Matches AtlasEpochCredits::pair_hash with lexicographic sibling ordering. */
export function pairHash(left, right) {
  const ordered = compareBytes(left, right) <= 0 ? [left, right] : [right, left];
  const payload = new Uint8Array(64);
  payload.set(ordered[0], 0);
  payload.set(ordered[1], 32);
  return hashBytes(payload);
}

export function verifyClaimProof(claim, root) {
  let current = claimLeaf(claim.wallet, claim.amount, claim.contributionCommitment);
  for (const sibling of claim.proof) current = pairHash(current, normalizeHash(sibling));
  return bytesToHex(current).toLowerCase() === root.toLowerCase();
}

function buildMerkleClaims(claims) {
  const leaves = claims
    .map((claim) => ({ ...claim, leafBytes: claimLeaf(claim.wallet, claim.amount, claim.contributionCommitment) }))
    .sort((left, right) => compareBytes(left.leafBytes, right.leafBytes));
  if (!leaves.length) throw new Error("empty_epoch_claim_set");

  const proofs = leaves.map(() => []);
  let level = leaves.map((leaf, index) => ({ hash: leaf.leafBytes, indexes: [index] }));
  while (level.length > 1) {
    const next = [];
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      const right = level[index + 1];
      if (!right) {
        next.push(left);
        continue;
      }
      for (const leafIndex of left.indexes) proofs[leafIndex].push(bytesToHex(right.hash));
      for (const leafIndex of right.indexes) proofs[leafIndex].push(bytesToHex(left.hash));
      next.push({ hash: pairHash(left.hash, right.hash), indexes: [...left.indexes, ...right.indexes] });
    }
    level = next;
  }

  return {
    root: bytesToHex(level[0].hash),
    claims: leaves.map((claim, index) => ({
      wallet: claim.wallet,
      amount: claim.amount,
      contributionCommitment: claim.contributionCommitment,
      receiptCount: claim.receiptCount,
      proof: proofs[index],
    })),
  };
}

function receiptDigest(record) {
  const payload = record.payload;
  return bytesToHex(hashText(canonicalJson({
    schema: record.schema,
    id: record.id,
    recordedAt: record.recordedAt,
    sentinelId: payload.sentinelId,
    wallet: payload.wallet,
    observedAt: payload.observedAt,
    probe: payload.probe,
    attestation: payload.attestation,
  })));
}

function contributionDigest(wallet, receipts) {
  return bytesToHex(hashText(canonicalJson({
    schema: "atlas.contribution-commitment.v1",
    wallet,
    receiptDigests: receipts.map((receipt) => receipt.digest).sort(),
  })));
}

function validatedObservation(record, { startsAt, endsAt, expectedGenesis, policy }) {
  const payload = record.payload;
  if (record.kind !== policy.acceptedEvidenceKind || !payload?.wallet || !payload?.sentinelId) return null;
  const observedAt = Date.parse(payload.observedAt);
  if (!Number.isFinite(observedAt) || observedAt < startsAt || observedAt >= endsAt) return null;
  try {
    if (decodeAddress(payload.wallet).length !== 32) return null;
  } catch {
    return null;
  }
  assertUsableProbe(payload.probe, expectedGenesis);
  return {
    record,
    observedAt,
    bucket: Math.floor(observedAt / (policy.minimumObservationSpacingSeconds * 1000)),
    digest: receiptDigest(record),
  };
}

/**
 * Derives an epoch plan from receipts already accepted by Atlas. It never
 * publishes an epoch or mints credits; those remain explicit on-chain actions.
 */
export async function buildEpochPlan({ epoch, startsAt, endsAt, expectedGenesis, policy = ATLAS_EPOCH_POLICY_V1 }) {
  if (!Number.isSafeInteger(epoch) || epoch < 0) throw new Error("invalid_epoch");
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end || end > Date.now()) {
    throw new Error("invalid_epoch_window");
  }
  if (!/^0x[0-9a-f]{64}$/i.test(expectedGenesis ?? "")) {
    throw new Error("expected_genesis_required_for_epoch");
  }
  if (
    policy.schema !== "atlas.epoch-policy.v1"
    || !Number.isInteger(policy.version)
    || !Number.isInteger(policy.minimumObservationSpacingSeconds)
    || policy.minimumObservationSpacingSeconds < 60
    || !Number.isInteger(policy.maxAcceptedObservationsPerWallet)
    || policy.maxAcceptedObservationsPerWallet < 1
    || BigInt(policy.creditPerAcceptedObservation) < 1n
  ) {
    throw new Error("invalid_epoch_policy");
  }

  const records = await evidenceRecordedBetween(new Date(start).toISOString(), new Date(end).toISOString());
  const verified = [];
  for (const record of records) {
    const candidate = validatedObservation(record, { startsAt: start, endsAt: end, expectedGenesis, policy });
    if (!candidate) continue;
    const attestationValid = await verifySentinelAttestation({
      sentinelId: record.payload.sentinelId,
      observedAt: record.payload.observedAt,
      probe: record.payload.probe,
      signature: record.payload.attestation?.signature,
    }, record.payload.attestation?.publicKeyJwk);
    if (attestationValid) verified.push(candidate);
  }

  // At most one accepted observation per device/time bucket. Sorting makes the
  // selected receipt deterministic even when the database is reordered.
  const deduplicated = new Map();
  for (const candidate of verified.sort((left, right) => left.digest.localeCompare(right.digest))) {
    const key = `${candidate.record.payload.sentinelId}:${candidate.bucket}`;
    if (!deduplicated.has(key)) deduplicated.set(key, candidate);
  }

  const byWallet = new Map();
  for (const candidate of deduplicated.values()) {
    const wallet = candidate.record.payload.wallet;
    if (!byWallet.has(wallet)) byWallet.set(wallet, []);
    byWallet.get(wallet).push(candidate);
  }

  const unit = BigInt(policy.creditPerAcceptedObservation);
  const claims = [];
  for (const [wallet, candidates] of byWallet) {
    const accepted = candidates
      .sort((left, right) => left.digest.localeCompare(right.digest))
      .slice(0, policy.maxAcceptedObservationsPerWallet);
    if (!accepted.length) continue;
    claims.push({
      wallet,
      amount: (BigInt(accepted.length) * unit).toString(),
      contributionCommitment: contributionDigest(wallet, accepted),
      receiptCount: accepted.length,
    });
  }

  const merkle = buildMerkleClaims(claims);
  const policyHash = bytesToHex(hashText(canonicalJson(policy)));
  if (merkle.root === ZERO_HASH || policyHash === ZERO_HASH) throw new Error("empty_epoch_commitment");
  return {
    schema: "atlas.epoch-plan.v1",
    epoch,
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(end).toISOString(),
    policy,
    policyHash,
    evidenceCount: [...deduplicated.values()].length,
    root: merkle.root,
    claims: merkle.claims,
  };
}
