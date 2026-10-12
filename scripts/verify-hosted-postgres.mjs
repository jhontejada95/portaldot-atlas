import dotenv from "dotenv";
import { verifyProbeEvidence } from "../src/signed-evidence.js";

dotenv.config({ path: process.env.ATLAS_ENV_FILE ?? ".env.local" });
dotenv.config();

const apiUrl = process.env.ATLAS_API_URL?.replace(/\/$/, "");
if (!apiUrl || !/^https:\/\//.test(apiUrl)) {
  throw new Error("Set ATLAS_API_URL to the HTTPS Render service URL before verifying the hosted MVP.");
}

const healthResponse = await fetch(`${apiUrl}/health`, { headers: { accept: "application/json" } });
if (!healthResponse.ok) throw new Error(`Hosted health check failed (${healthResponse.status}).`);
const health = await healthResponse.json();
if (health.storage !== "postgres") {
  throw new Error(`Hosted API reported '${health.storage}', not durable Postgres. Refusing to call this deployment production-ready.`);
}

const observationResponse = await fetch(`${apiUrl}/v1/network-status`, { headers: { accept: "application/json" } });
if (!observationResponse.ok) throw new Error(`Hosted live observation failed (${observationResponse.status}).`);
const record = await observationResponse.json();
if (!record?.id || !record?.payload?.probe || !record?.payload?.attestation) {
  throw new Error("Hosted API returned an incomplete live evidence record.");
}
if (!await verifyProbeEvidence(record.payload.probe, record.payload.attestation)) {
  throw new Error("Hosted API returned an evidence record with an invalid EIP-191 signature.");
}

const feedResponse = await fetch(`${apiUrl}/v1/evidence/recent?limit=25`, { headers: { accept: "application/json" } });
if (!feedResponse.ok) throw new Error(`Hosted evidence feed failed (${feedResponse.status}).`);
const feed = await feedResponse.json();
if (!(feed.records ?? []).some((entry) => entry.id === record.id)) {
  throw new Error("Fresh hosted observation was not retained in the durable evidence feed.");
}

console.log(JSON.stringify({
  verifiedAt: new Date().toISOString(),
  apiUrl,
  storage: health.storage,
  evidenceId: record.id,
  finalizedBlock: record.payload.probe.finalizedHeader?.number,
  signatureValid: true,
  persistedInFeed: true,
}, null, 2));
