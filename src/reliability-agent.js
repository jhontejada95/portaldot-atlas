import dotenv from "dotenv";
import { samplePortaldot } from "./portaldot-probe.js";
import { assessIncident } from "./reliability-policy.js";
import { appendLiveEvidence, recentLiveEvidence } from "./evidence-store.js";
import { signProbeEvidence, verifyProbeEvidence } from "./signed-evidence.js";

dotenv.config({ path: process.env.ATLAS_ENV_FILE ?? ".env.local" });
dotenv.config();

const endpoint = process.env.ATLAS_PORTALDOT_ENDPOINT ?? "wss://mainnet.portaldot.io";
const expectedGenesis = process.env.ATLAS_EXPECTED_GENESIS;
const sentinelPrivateKey = process.env.ATLAS_SENTINEL_PRIVATE_KEY;
const observedAt = new Date().toISOString();

if (!sentinelPrivateKey) {
  throw new Error("ATLAS_SENTINEL_PRIVATE_KEY is required; the agent will not journal unsigned observations.");
}

try {
  const probe = await samplePortaldot(endpoint, {
    expectedGenesis,
  });
  const attestation = await signProbeEvidence(probe, sentinelPrivateKey);
  if (!await verifyProbeEvidence(probe, attestation)) {
    throw new Error("Agent generated an invalid local attestation.");
  }
  await appendLiveEvidence("agent_observation", {
    endpoint,
    observedAt,
    usable: true,
    probe,
    attestation,
  });
  const samples = (await recentLiveEvidence(100))
    .filter((record) => record.kind === "agent_observation")
    .map((record) => record.payload);
  console.log(JSON.stringify(assessIncident(samples), null, 2));
} catch (error) {
  await appendLiveEvidence("agent_observation", {
    endpoint,
    observedAt,
    usable: false,
    error: error.message,
  });
  const samples = (await recentLiveEvidence(100))
    .filter((record) => record.kind === "agent_observation")
    .map((record) => record.payload);
  console.log(JSON.stringify(assessIncident(samples), null, 2));
}
