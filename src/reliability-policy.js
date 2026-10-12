const MAX_WINDOW_MS = 15 * 60 * 1000;
const FAILURE_THRESHOLD = 3;

/**
 * Deterministic spending gate for the Atlas Reliability Agent.
 * An LLM may explain an incident, but it never decides whether money moves.
 */
export function assessIncident(samples, now = Date.now()) {
  const recent = samples
    .filter((sample) => Number.isFinite(Date.parse(sample.observedAt)))
    .filter((sample) => now - Date.parse(sample.observedAt) <= MAX_WINDOW_MS)
    .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));

  const failures = recent.filter((sample) => sample.usable === false);
  if (failures.length < FAILURE_THRESHOLD) {
    return {
      action: "hold",
      reason: "insufficient_consecutive_failures",
      recentSamples: recent.length,
      failureCount: failures.length,
    };
  }

  const tail = recent.slice(-FAILURE_THRESHOLD);
  if (!tail.every((sample) => sample.usable === false)) {
    return {
      action: "hold",
      reason: "failures_not_consecutive",
      recentSamples: recent.length,
      failureCount: failures.length,
    };
  }

  const incidentId = `atlas-${tail[0].endpoint}-${tail[0].observedAt}`;
  return {
    action: "request_independent_paid_probe",
    reason: "three_consecutive_unusable_live_probes",
    incidentId,
    maxPaymentUsd: "0.001",
    expiresAt: new Date(now + 5 * 60 * 1000).toISOString(),
    requirements: [
      "allowlisted independent Atlas endpoint",
      "Base Sepolia only",
      "single payment per incidentId",
      "x402 exact price must equal maxPaymentUsd",
    ],
  };
}
