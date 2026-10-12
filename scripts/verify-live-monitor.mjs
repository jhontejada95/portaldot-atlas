import dotenv from "dotenv";
import { assertUsableProbe } from "../src/portaldot-probe.js";
import { verifyProbeEvidence } from "../src/signed-evidence.js";
import { verifySentinelAttestation } from "../src/sentinel-attestation.js";

dotenv.config({ path: process.env.ATLAS_ENV_FILE ?? ".env.local" });
dotenv.config();

const apiUrl = process.env.ATLAS_API_URL ?? "http://127.0.0.1:4030";
const expectedGenesis = process.env.ATLAS_EXPECTED_GENESIS;

async function getJson(path) {
  const response = await fetch(new URL(path, apiUrl));
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.json();
}

const status = await getJson("/v1/network-status");
const feed = await getJson("/v1/evidence/recent?limit=20");
const currentProbe = assertUsableProbe(status.payload.probe, expectedGenesis);
const currentSignatureValid = await verifyProbeEvidence(status.payload.probe, status.payload.attestation);
const feedResults = await Promise.all(feed.records.map(async (record) => {
  const attestation = record.payload.attestation;
  const valid = attestation.scheme === "webcrypto-p256-sha256-v1"
    ? await verifySentinelAttestation({
      sentinelId: record.payload.sentinelId,
      observedAt: record.payload.observedAt,
      probe: record.payload.probe,
      signature: attestation.signature,
    }, attestation.publicKeyJwk)
    : await verifyProbeEvidence(record.payload.probe, attestation);
  return { id: record.id, kind: record.kind, valid };
}));

if (!currentSignatureValid || feedResults.some((item) => !item.valid)) {
  throw new Error("Atlas returned an unverifiable signed-evidence record.");
}

console.log(JSON.stringify({
  verifiedAt: new Date().toISOString(),
  liveObservationId: status.id,
  endpoint: currentProbe.endpoint,
  finalizedBlock: currentProbe.finalizedHeader.number,
  latencyMs: currentProbe.latencyMs,
  currentSignatureValid,
  verifiedFeedRecords: feedResults.length,
  feedResults,
}, null, 2));
