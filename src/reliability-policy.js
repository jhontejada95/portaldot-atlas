import { createHash } from "node:crypto";

/** The complete spending policy: versioned, deterministic, and hash-committed. */
export const RELIABILITY_POLICY_V1 = Object.freeze({
  schema: "atlas.reliability-policy.v1",
  version: 1,
  windowMs: 15 * 60 * 1000,
  consecutiveFailureThreshold: 3,
  maxPaymentUsd: "0.001",
  maxIndependentProbesPerIncident: 1,
  incidentTtlMs: 5 * 60 * 1000,
  payment: Object.freeze({ network: "eip155:84532", scheme: "exact" }),
});

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function reliabilityPolicyHash() {
  return `0x${createHash("sha256").update(canonical(RELIABILITY_POLICY_V1)).digest("hex")}`;
}

function samplePayload(sample) {
  return sample?.payload?.observedAt ? sample.payload : sample;
}

/**
 * Pure policy evaluator. It receives verified agent observations, never an LLM
 * recommendation, never a wallet, and never payment credentials.
 */
export function assessIncident(samples, now = Date.now()) {
  const recent = samples
    .map(samplePayload)
    .filter((sample) => Number.isFinite(Date.parse(sample?.observedAt)))
    .filter((sample) => now - Date.parse(sample.observedAt) <= RELIABILITY_POLICY_V1.windowMs)
    .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  const failures = recent.filter((sample) => sample.usable === false);
  const policyHash = reliabilityPolicyHash();
  if (failures.length < RELIABILITY_POLICY_V1.consecutiveFailureThreshold) {
    return { action: "hold", reason: "insufficient_consecutive_failures", policyHash, recentSamples: recent.length, failureCount: failures.length };
  }
  const tail = recent.slice(-RELIABILITY_POLICY_V1.consecutiveFailureThreshold);
  if (!tail.every((sample) => sample.usable === false)) {
    return { action: "hold", reason: "failures_not_consecutive", policyHash, recentSamples: recent.length, failureCount: failures.length };
  }
  const incidentMaterial = canonical({
    policyHash,
    endpoint: tail[0].endpoint,
    observations: tail.map((sample) => ({ observedAt: sample.observedAt, usable: sample.usable, evidenceId: sample.evidenceId ?? null })),
  });
  const incidentId = `atlas-${createHash("sha256").update(incidentMaterial).digest("hex")}`;
  return {
    action: "request_independent_paid_probe",
    reason: "three_consecutive_unusable_live_probes",
    policyHash,
    incidentId,
    maxPaymentUsd: RELIABILITY_POLICY_V1.maxPaymentUsd,
    expiresAt: new Date(now + RELIABILITY_POLICY_V1.incidentTtlMs).toISOString(),
    requirements: [
      "allowlisted independent Atlas endpoint",
      "Base Sepolia only",
      "single payment per incidentId",
      "x402 exact price must equal maxPaymentUsd",
      "no private key or wallet selection in this policy",
    ],
  };
}
