import dotenv from "dotenv";
import { samplePortaldot } from "./portaldot-probe.js";
import { assessIncident } from "./reliability-policy.js";
import { reserveAgentIncident } from "./agent-incidents.js";
import { appendLiveEvidence, recentLiveEvidence } from "./evidence-store.js";
import { signProbeEvidence, verifyProbeEvidence } from "./signed-evidence.js";

dotenv.config({ path: process.env.ATLAS_ENV_FILE ?? ".env.local" });
dotenv.config();

const endpoint = process.env.ATLAS_PORTALDOT_ENDPOINT ?? "wss://mainnet.portaldot.io";
const expectedGenesis = process.env.ATLAS_EXPECTED_GENESIS;
const sentinelPrivateKey = process.env.ATLAS_SENTINEL_PRIVATE_KEY;

if (!sentinelPrivateKey) {
  throw new Error("ATLAS_SENTINEL_PRIVATE_KEY is required; the agent will not journal unsigned observations.");
}

async function verifiedAgentObservations() {
  const records = await recentLiveEvidence(100);
  const verified = [];
  for (const record of records) {
    if (record.kind !== "agent_observation") continue;
    const observation = record.payload?.observation;
    const attestation = record.payload?.attestation;
    if (!observation || !attestation || !await verifyProbeEvidence(observation, attestation)) continue;
    verified.push({ ...observation, evidenceId: record.id });
  }
  return verified;
}

async function recordDecision(observation) {
  const attestation = await signProbeEvidence(observation, sentinelPrivateKey);
  if (!await verifyProbeEvidence(observation, attestation)) throw new Error("Agent generated an invalid local attestation.");
  const stored = await appendLiveEvidence("agent_observation", { observation, attestation });
  const decision = assessIncident(await verifiedAgentObservations());
  const reservation = decision.action === "request_independent_paid_probe"
    ? await reserveAgentIncident(decision)
    : { reserved: false, reason: "policy_hold" };

  await appendLiveEvidence("agent_decision", {
    observationEvidenceId: stored.id,
    observedAt: observation.observedAt,
    decision,
    reservation,
    safety: "Atlas records the policy decision only. A separately authorized payment worker must still enforce x402 requirements and record its outcome.",
  });
  console.log(JSON.stringify({ observationEvidenceId: stored.id, decision, reservation }, null, 2));
}

try {
  const probe = await samplePortaldot(endpoint, { expectedGenesis });
  await recordDecision({
    schema: "atlas.agent-observation.v1",
    endpoint,
    observedAt: new Date().toISOString(),
    usable: true,
    probe,
  });
} catch (error) {
  await recordDecision({
    schema: "atlas.agent-observation.v1",
    endpoint,
    observedAt: new Date().toISOString(),
    usable: false,
    error: { name: error.name, message: error.message },
  });
}
